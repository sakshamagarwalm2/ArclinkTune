import os
import time
import subprocess
import threading
import requests
from pathlib import Path
from typing import Dict, Any, Optional


class ChatService:
    def __init__(self, llamafactory_path: Path, venv_python: str):
        self.llamafactory_path = llamafactory_path
        self.venv_python = venv_python
        self.src_path = llamafactory_path / "src"
        self.process: Optional[subprocess.Popen] = None
        self.current_model: Optional[str] = None
        self.port = 8001
        self.api_url = f"http://127.0.0.1:{self.port}"
        self._lock = threading.Lock()
        self.model_args: Dict[str, Any] = {}
        self.last_error: Optional[str] = None

    def _parse_error(self, error_output: str) -> str:
        lines = error_output.split('\n')
        for line in lines:
            if 'ValueError:' in line:
                return line.strip()
            if 'Error:' in line and 'Traceback' not in line:
                return line.strip()
            if 'ModuleNotFoundError:' in line:
                return f"Missing dependency: {line.strip()}"
            if 'FileNotFoundError:' in line:
                return f"Missing file: {line.strip()}"
        if 'No module named' in error_output:
            import re
            match = re.search(r"No module named '([^']+)'", error_output)
            if match:
                return f"Missing Python module: {match.group(1)}"
        if 'CUDA' in error_output and 'out of memory' in error_output.lower():
            return "GPU out of memory - try closing other applications or using a smaller model"
        if 'merges' in error_output.lower() or 'vocab' in error_output.lower():
            return "Model files are incomplete - missing tokenizer files"
        if 'missing' in error_output.lower() and 'tokenizer' in error_output.lower():
            return "Model is missing tokenizer files - re-download the model"
        return lines[-1] if lines else "Unknown error"

    def start_api(self, model_path: str, template: str = "default", finetuning_type: str = "lora",
                  checkpoint_path: Optional[str] = None, infer_backend: str = "huggingface",
                  infer_dtype: str = "auto", system_prompt: Optional[str] = None,
                  enable_thinking: Optional[bool] = None) -> Dict[str, Any]:
        with self._lock:
            self.last_error = None
            
            if self.process and self.current_model == model_path:
                return {"success": True, "model": model_path, "already_loaded": True}
            
            if self.process:
                self.stop_api()

            self.model_args = {
                "model_name_or_path": model_path,
                "template": template,
                "finetuning_type": finetuning_type,
            }

            cmd = [
                self.venv_python,
                "-m", "llamafactory.cli", "api",
                "--model_name_or_path", model_path,
                "--template", template,
                "--finetuning_type", finetuning_type,
            ]

            if checkpoint_path:
                cmd.extend(["--adapter_name_or_path", checkpoint_path])
            if infer_backend and infer_backend != "huggingface":
                cmd.extend(["--infer_backend", infer_backend])
            if infer_dtype and infer_dtype != "auto":
                cmd.extend(["--infer_dtype", infer_dtype])
            if system_prompt:
                cmd.extend(["--default_system", system_prompt])
            if enable_thinking is not None:
                cmd.extend(["--enable_thinking", str(enable_thinking).lower()])

            env = os.environ.copy()
            env['PYTHONPATH'] = str(self.src_path)
            env['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
            env['DISABLE_VERSION_CHECK'] = '1'
            env['API_PORT'] = str(self.port)
            env['API_HOST'] = '127.0.0.1'
            env['API_MODEL_NAME'] = model_path.split('/')[-1] if '/' in model_path else model_path

            try:
                self.process = subprocess.Popen(
                    cmd,
                    env=env,
                    cwd=str(self.llamafactory_path),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    start_new_session=True
                )
                self.current_model = model_path
                
                max_retries = 60
                for i in range(max_retries):
                    try:
                        resp = requests.get(f"{self.api_url}/v1/models", timeout=1)
                        if resp.status_code == 200:
                            return {"success": True, "model": model_path}
                    except:
                        pass
                    
                    if self.process.poll() is not None:
                        output, _ = self.process.communicate()
                        error_output = output.decode('utf-8', errors='replace').strip()
                        self.last_error = error_output
                        print(f"Chat API failed to start: {error_output}")
                        return {
                            "success": False,
                            "error": self._parse_error(error_output),
                            "details": error_output
                        }
                    
                    time.sleep(2)
                
                self.last_error = "Timeout: Model did not load within 120 seconds"
                return {
                    "success": False,
                    "error": "Timeout: Model took too long to load",
                    "details": self.last_error
                }
            except Exception as e:
                error_msg = str(e)
                self.last_error = error_msg
                print(f"Error starting Chat API: {error_msg}")
                import traceback
                traceback.print_exc()
                return {
                    "success": False,
                    "error": f"Failed to start API: {error_msg}",
                    "details": error_msg
                }

    def stop_api(self):
        with self._lock:
            if self.process:
                try:
                    if os.name == 'nt':
                        subprocess.call(['taskkill', '/F', '/T', '/PID', str(self.process.pid)])
                    else:
                        import signal
                        os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                except:
                    pass
                self.process = None
                self.current_model = None
                self.model_args = {}

    def chat(self, messages: list, **kwargs) -> Dict[str, Any]:
        if not self.process:
            return {"error": "Chat model not loaded"}
        
        try:
            formatted_messages = []
            for msg in messages:
                role = msg.get("role", "user")
                if role == "assistant":
                    role = "assistant"
                elif role == "system":
                    role = "system"
                else:
                    role = "user"
                formatted_messages.append({
                    "role": role,
                    "content": msg.get("content", "")
                })
            
            payload = {
                "model": self.model_args.get("model_name_or_path", "gpt-3.5-turbo").split('/')[-1],
                "messages": formatted_messages,
                "temperature": kwargs.get("temperature", 0.7),
                "top_p": kwargs.get("top_p", 0.9),
                "max_tokens": kwargs.get("max_tokens", 1024),
                "presence_penalty": kwargs.get("repetition_penalty", 1.0),
                "stream": False
            }
            
            print(f"[ChatService] Sending request to {self.api_url}/v1/chat/completions with {len(formatted_messages)} messages")
            response = requests.post(
                f"{self.api_url}/v1/chat/completions",
                json=payload,
                timeout=120
            )
            print(f"[ChatService] Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"[ChatService] Response: {result}")
                if "choices" in result and len(result["choices"]) > 0:
                    return {"content": result["choices"][0]["message"]["content"]}
                else:
                    return {"error": f"Unexpected response format: {result}"}
            else:
                error_text = f"API error: {response.status_code} - {response.text}"
                print(f"[ChatService] {error_text}")
                return {"error": error_text}
        except Exception as e:
            error_msg = str(e)
            print(f"[ChatService] Exception: {error_msg}")
            return {"error": error_msg}

    def get_status(self) -> Dict[str, Any]:
        status = {
            "loaded": self.process is not None,
            "model": self.current_model,
            "port": self.port,
            "url": self.api_url,
            "error": self.last_error
        }
        if self.last_error:
            status["error_summary"] = self._parse_error(self.last_error)
        return status


_chat_service: Optional[ChatService] = None

def get_chat_service(llamafactory_path: Optional[Path] = None, venv_python: Optional[str] = None) -> ChatService:
    global _chat_service
    if _chat_service is None:
        from config import get_settings
        settings = get_settings()
        if llamafactory_path is None:
            llamafactory_path = settings.core_path
        if venv_python is None:
            venv_python = settings.get_venv_python()
        _chat_service = ChatService(llamafactory_path, venv_python)
    return _chat_service
