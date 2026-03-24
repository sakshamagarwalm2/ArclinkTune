import os
import time
import subprocess
import threading
import requests
import json
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
        self._is_loaded = False

    def _kill_port_process(self, port: int):
        """Kill any process using the specified port."""
        try:
            if os.name == "nt":
                result = subprocess.run(
                    f"netstat -ano | findstr :{port}",
                    shell=True,
                    capture_output=True,
                    text=True,
                )
                for line in result.stdout.split("\n"):
                    if f":{port}" in line:
                        parts = line.split()
                        if len(parts) >= 5:
                            pid = parts[-1]
                            try:
                                subprocess.run(
                                    ["taskkill", "/F", "/T", "/PID", pid],
                                    capture_output=True,
                                    timeout=5,
                                )
                                print(
                                    f"[ChatService] Killed process {pid} on port {port}"
                                )
                            except:
                                pass
            time.sleep(1)
        except Exception as e:
            print(f"[ChatService] Error killing port process: {e}")

    def _parse_error(self, error_output: str) -> str:
        lines = error_output.split("\n")
        for line in lines:
            if "ValueError:" in line:
                return line.strip()
            if "Error:" in line and "Traceback" not in line:
                return line.strip()
            if "ModuleNotFoundError:" in line:
                return f"Missing dependency: {line.strip()}"
            if "FileNotFoundError:" in line:
                return f"Missing file: {line.strip()}"
        if "No module named" in error_output:
            import re

            match = re.search(r"No module named '([^']+)'", error_output)
            if match:
                return f"Missing Python module: {match.group(1)}"
        if "CUDA" in error_output and "out of memory" in error_output.lower():
            return "GPU out of memory - try closing other applications or using a smaller model"
        if "merges" in error_output.lower() or "vocab" in error_output.lower():
            return "Model files are incomplete - missing tokenizer files"
        if "missing" in error_output.lower() and "tokenizer" in error_output.lower():
            return "Model is missing tokenizer files - re-download the model"
        return lines[-1] if lines else "Unknown error"

    def _check_api_running(self) -> bool:
        """Check if the API is actually responding."""
        try:
            resp = requests.get(f"{self.api_url}/v1/models", timeout=2)
            return resp.status_code == 200
        except:
            return False

    def start_api(
        self,
        model_path: str,
        template: str = "default",
        finetuning_type: str = "lora",
        checkpoint_path: Optional[str] = None,
        infer_backend: str = "huggingface",
        infer_dtype: str = "auto",
        system_prompt: Optional[str] = None,
        enable_thinking: Optional[bool] = None,
    ) -> Dict[str, Any]:
        with self._lock:
            self.last_error = None

            print(f"[ChatService] ============================================")
            print(f"[ChatService] START_API called with:")
            print(f"[ChatService]   model_path: {model_path}")
            print(f"[ChatService]   template: {template}")
            print(f"[ChatService]   finetuning_type: {finetuning_type}")
            print(f"[ChatService]   checkpoint_path: {checkpoint_path}")
            print(f"[ChatService]   infer_backend: {infer_backend}")
            print(f"[ChatService]   infer_dtype: {infer_dtype}")
            print(f"[ChatService]   enable_thinking: {enable_thinking}")
            print(f"[ChatService] ============================================")

            if self.process and self.current_model == model_path:
                if self._check_api_running():
                    print(
                        f"[ChatService] Model already loaded and running: {model_path}"
                    )
                    self._is_loaded = True
                    return {
                        "success": True,
                        "model": model_path,
                        "already_loaded": True,
                    }
                else:
                    print(
                        f"[ChatService] Process exists but API not responding, restarting..."
                    )
                    self.stop_api()

            if self.process:
                print(f"[ChatService] Stopping existing process...")
                self.stop_api()
                time.sleep(2)

            self._kill_port_process(self.port)

            self.model_args = {
                "model_name_or_path": model_path,
                "template": template,
                "finetuning_type": finetuning_type,
            }

            cmd = [
                self.venv_python,
                "-X",
                "utf8",
                "-m",
                "llamafactory.cli",
                "api",
                "--model_name_or_path",
                model_path,
                "--template",
                template,
                "--finetuning_type",
                finetuning_type,
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
            env["PYTHONPATH"] = str(self.src_path)
            env["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
            env["DISABLE_VERSION_CHECK"] = "1"
            env["API_PORT"] = str(self.port)
            env["API_HOST"] = "127.0.0.1"
            env["API_MODEL_NAME"] = (
                model_path.split("/")[-1] if "/" in model_path else model_path
            )
            env["PYTHONIOENCODING"] = "utf-8"

            print(f"[ChatService] Command: {' '.join(cmd)}")
            print(f"[ChatService] Working dir: {self.llamafactory_path}")
            print(f"[ChatService] Python: {self.venv_python}")

            model_exists = (
                os.path.exists(model_path) if os.path.isabs(model_path) else True
            )
            if model_exists and os.path.isabs(model_path):
                try:
                    files = os.listdir(model_path)[:5]
                    print(f"[ChatService] Model files: {files}")
                except Exception as e:
                    print(f"[ChatService] Error listing model: {e}")

            try:
                print(f"[ChatService] Starting subprocess...")

                self.process = subprocess.Popen(
                    cmd,
                    env=env,
                    cwd=str(self.llamafactory_path),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    bufsize=0,
                )
                self.current_model = model_path
                self._is_loaded = False
                print(f"[ChatService] Process started with PID: {self.process.pid}")

                output_lines = []

                def read_output(proc, lines):
                    try:
                        while True:
                            if proc.poll() is not None:
                                break
                            chunk = proc.stdout.read(1)
                            if not chunk:
                                break
                            if chunk == b"\n":
                                if lines:
                                    try:
                                        line = (
                                            b"".join(lines)
                                            .decode("utf-8", errors="replace")
                                            .strip()
                                        )
                                        if line and len(line) < 500:
                                            print(f"[ChatService] {line[:200]}")
                                        lines.clear()
                                    except:
                                        lines.clear()
                            else:
                                lines.append(chunk)
                    except Exception as e:
                        pass

                output_thread = threading.Thread(
                    target=read_output, args=(self.process, output_lines), daemon=True
                )
                output_thread.start()

                max_retries = 120
                print(f"[ChatService] Waiting for API (max {max_retries}s)...")
                for i in range(max_retries):
                    if self._check_api_running():
                        print(f"[ChatService] SUCCESS: API ready at {self.api_url}")
                        self._is_loaded = True
                        return {"success": True, "model": model_path}

                    if self.process.poll() is not None:
                        stdout, _ = self.process.communicate()
                        output = stdout.decode("utf-8", errors="replace")
                        self.last_error = output
                        self._is_loaded = False
                        print(
                            f"[ChatService] Process died! Exit: {self.process.returncode}"
                        )
                        print(f"[ChatService] Output: {output[-1500:]}")
                        return {
                            "success": False,
                            "error": self._parse_error(output),
                            "details": output,
                        }

                    if i % 15 == 0 and i > 0:
                        print(f"[ChatService] Still loading... ({i}s)")

                    time.sleep(1)

                if self.process.poll() is not None:
                    stdout, _ = self.process.communicate()
                    output = stdout.decode("utf-8", errors="replace")
                    self.last_error = f"Timeout + exit: {output}"
                    self._is_loaded = False
                    return {
                        "success": False,
                        "error": "Timeout: Model took too long to load",
                        "details": f"Timeout after {max_retries}s\n\n{output[-3000:]}",
                    }

                self.last_error = (
                    f"Timeout after {max_retries}s - process still running"
                )
                return {
                    "success": False,
                    "error": "Timeout: Model took too long to load",
                    "details": self.last_error,
                }
            except Exception as e:
                error_msg = str(e)
                self.last_error = error_msg
                self._is_loaded = False
                print(f"[ChatService] EXCEPTION: {error_msg}")
                import traceback

                traceback.print_exc()
                return {
                    "success": False,
                    "error": f"Failed to start API: {error_msg}",
                    "details": error_msg,
                }

    def stop_api(self):
        with self._lock:
            if self.process:
                try:
                    if self.process.poll() is None:
                        if os.name == "nt":
                            subprocess.call(
                                ["taskkill", "/F", "/T", "/PID", str(self.process.pid)],
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL,
                            )
                        else:
                            import signal

                            os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                    if self.process.stdout:
                        try:
                            self.process.stdout.close()
                        except:
                            pass
                except:
                    pass
            self.process = None
            self.current_model = None
            self.model_args = {}
            self._is_loaded = False

    def chat(self, messages: list, **kwargs) -> Dict[str, Any]:
        if not self.process or not self._is_loaded:
            if not self._check_api_running():
                self._is_loaded = False
                return {
                    "error": "Chat model not loaded or API not responding. Please reload the model."
                }

        try:
            formatted_messages = []
            for msg in messages:
                role = msg.get("role", "user")
                if role not in ["user", "assistant", "system"]:
                    role = "user"
                formatted_messages.append(
                    {"role": role, "content": msg.get("content", "")}
                )

            stream_enabled = kwargs.get("stream", False)
            payload = {
                "model": self.model_args.get("model_name_or_path", "model").split("/")[
                    -1
                ],
                "messages": formatted_messages,
                "temperature": kwargs.get("temperature", 0.7),
                "top_p": kwargs.get("top_p", 0.9),
                "max_tokens": kwargs.get("max_tokens", 1024),
                "presence_penalty": kwargs.get("repetition_penalty", 1.0),
                "stream": stream_enabled,
            }

            print(f"[ChatService] Sending chat request...")
            response = requests.post(
                f"{self.api_url}/v1/chat/completions",
                json=payload,
                timeout=180,
                stream=stream_enabled,
            )

            if response.status_code == 200:
                if stream_enabled:
                    accumulated_content = ""
                    for line in response.iter_lines():
                        if line:
                            line_text = line.decode("utf-8")
                            if line_text.startswith("data: "):
                                data_str = line_text[6:]
                                if data_str.strip() == "[DONE]":
                                    break
                                try:
                                    data = json.loads(data_str)
                                    if "choices" in data and len(data["choices"]) > 0:
                                        delta = data["choices"][0].get("delta", {})
                                        if "content" in delta:
                                            accumulated_content += delta["content"]
                                except json.JSONDecodeError:
                                    pass
                    return {"content": accumulated_content}
                else:
                    result = response.json()
                    if "choices" in result and len(result["choices"]) > 0:
                        return {"content": result["choices"][0]["message"]["content"]}
                    else:
                        return {"error": f"Unexpected response: {result}"}
            else:
                error_text = f"API error {response.status_code}: {response.text}"
                print(f"[ChatService] {error_text}")
                return {"error": error_text}
        except requests.exceptions.ConnectionError as e:
            self._is_loaded = False
            print(f"[ChatService] Connection lost: {e}")
            return {
                "error": "API connection lost. Model may have crashed. Please reload."
            }
        except Exception as e:
            print(f"[ChatService] Exception: {e}")
            return {"error": str(e)}

    def stream_chat(self, messages: list, **kwargs):
        if not self.process or not self._is_loaded:
            if not self._check_api_running():
                self._is_loaded = False
                return
            yield "Chat model not loaded or API not responding. Please reload the model."
            return

        try:
            formatted_messages = []
            for msg in messages:
                role = msg.get("role", "user")
                if role not in ["user", "assistant", "system"]:
                    role = "user"
                formatted_messages.append(
                    {"role": role, "content": msg.get("content", "")}
                )

            payload = {
                "model": self.model_args.get("model_name_or_path", "model").split("/")[
                    -1
                ],
                "messages": formatted_messages,
                "temperature": kwargs.get("temperature", 0.7),
                "top_p": kwargs.get("top_p", 0.9),
                "max_tokens": kwargs.get("max_tokens", 1024),
                "presence_penalty": kwargs.get("repetition_penalty", 1.0),
                "stream": True,
            }

            print(f"[ChatService] Sending streaming chat request...")

            response = requests.post(
                f"{self.api_url}/v1/chat/completions",
                json=payload,
                timeout=180,
                stream=True,
            )

            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        line_text = line.decode("utf-8")
                        if line_text.startswith("data: "):
                            data_str = line_text[6:]
                            if data_str.strip() == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        yield delta["content"]
                            except json.JSONDecodeError:
                                pass
            else:
                error_text = f"API error {response.status_code}: {response.text}"
                print(f"[ChatService] {error_text}")
                yield f"Error: {error_text}"
        except Exception as e:
            print(f"[ChatService] Stream Exception: {e}")
            yield f"Error: {str(e)}"

    def get_status(self) -> Dict[str, Any]:
        api_running = self._check_api_running() if self.process else False

        status = {
            "loaded": self._is_loaded and api_running,
            "process_running": self.process is not None and self.process.poll() is None,
            "api_responding": api_running,
            "model": self.current_model,
            "port": self.port,
            "url": self.api_url,
            "error": self.last_error,
        }
        if self.last_error:
            status["error_summary"] = self._parse_error(self.last_error)
        return status


_chat_service: Optional[ChatService] = None


def get_chat_service(
    llamafactory_path: Optional[Path] = None, venv_python: Optional[str] = None
) -> ChatService:
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
