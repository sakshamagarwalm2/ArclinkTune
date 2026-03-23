#!/usr/bin/env python3
import sys
import os
import time
import requests
import subprocess
import threading

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

MODEL_PATH = r"C:\Users\Astrallink\models\arclink\Qwen_Qwen2.5-0.5B-Instruct"
VENV_PYTHON = (
    r"C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune\core\.venv\Scripts\python.exe"
)
LLAMA_PATH = r"C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune\core\LlamaFactory"
API_PORT = 8003

print("=" * 60)
print("ArclinkTune Model Loading Test")
print("=" * 60)
print()

print(f"[1] Checking environment...")
print(f"    Model path: {MODEL_PATH}")
print(f"    Venv Python: {VENV_PYTHON}")
print(f"    Llama path: {LLAMA_PATH}")
print()

print(f"[2] Checking model files...")
if not os.path.exists(MODEL_PATH):
    print(f"    ERROR: Model not found at {MODEL_PATH}")
    sys.exit(1)

for f in os.listdir(MODEL_PATH):
    print(f"    - {f}")
print()

print(f"[3] Checking CUDA...")
result = subprocess.run(
    [
        VENV_PYTHON,
        "-c",
        "import torch; print(f'    PyTorch: {torch.__version__}'); print(f'    CUDA: {torch.cuda.is_available()}'); print(f'    GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')",
    ],
    capture_output=True,
    text=True,
)
print(result.stdout)
if "False" in result.stdout:
    print("    WARNING: CUDA not available!")
print()

print(f"[4] Starting API (this may take a while for first load)...")
print(
    f'    Command: llamafactory-cli api --model_name_or_path "{MODEL_PATH}" --template qwen'
)
print()

env = os.environ.copy()
env["PYTHONPATH"] = str(os.path.join(LLAMA_PATH, "src"))
env["PYTHONIOENCODING"] = "utf-8"
env["API_PORT"] = str(API_PORT)
env["PYTHONUTF8"] = "1"

cmd = [
    VENV_PYTHON,
    "-X",
    "utf8",
    "-m",
    "llamafactory.cli",
    "api",
    "--model_name_or_path",
    MODEL_PATH,
    "--template",
    "qwen",
]

print("    Starting subprocess...")
process = subprocess.Popen(
    cmd,
    env=env,
    cwd=LLAMA_PATH,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    bufsize=1,
)

output_lines = []
error_lines = []


def read_output():
    try:
        for line in iter(process.stdout.readline, b""):
            if line:
                try:
                    decoded = line.decode("utf-8", errors="replace").strip()
                except:
                    decoded = line.decode("cp1252", errors="replace").strip()
                output_lines.append(decoded)
                if len(output_lines) <= 50:
                    print(f"    [API] {decoded[:200]}")
                elif len(output_lines) == 51:
                    print("    ... (truncating output display)")
    except Exception as e:
        error_lines.append(str(e))


reader_thread = threading.Thread(target=read_output)
reader_thread.daemon = True
reader_thread.start()

print(f"    Waiting for API to start on port {API_PORT}...")
print(f"    (max 180 seconds)")
print()

for i in range(180):
    try:
        resp = requests.get(f"http://127.0.0.1:{API_PORT}/v1/models", timeout=1)
        if resp.status_code == 200:
            print()
            print(f"[5] SUCCESS! API is running at http://127.0.0.1:{API_PORT}")
            print()

            print("[6] Testing chat endpoint...")
            chat_resp = requests.post(
                f"http://127.0.0.1:{API_PORT}/v1/chat/completions",
                json={
                    "model": "Qwen2.5-0.5B",
                    "messages": [{"role": "user", "content": "Hello!"}],
                    "max_tokens": 50,
                },
                timeout=30,
            )
            print(f"    Response: {chat_resp.json()}")

            print()
            print("[7] Cleaning up...")
            process.terminate()
            try:
                process.wait(timeout=5)
            except:
                process.kill()

            print()
            print("=" * 60)
            print("TEST PASSED!")
            print("=" * 60)
            sys.exit(0)
    except requests.exceptions.ConnectionError:
        pass
    except Exception as e:
        print(f"    Error: {e}")

    if i % 15 == 0 and i > 0:
        print(f"    Still waiting... ({i}s)")

    time.sleep(1)

print()
print(f"[5] TIMEOUT: API did not start within 180 seconds")
print()
print("Last 30 lines of output:")
for line in output_lines[-30:]:
    print(f"    {line[:200]}")
print()
if error_lines:
    print("Errors during reading:")
    for e in error_lines:
        print(f"    {e}")
print()
print("=" * 60)
print("TEST FAILED - Check output above for errors")
print("=" * 60)

try:
    process.terminate()
except:
    pass
sys.exit(1)

for f in os.listdir(MODEL_PATH):
    print(f"    - {f}")
print()

print(f"[3] Checking CUDA...")
result = subprocess.run(
    [
        VENV_PYTHON,
        "-c",
        "import torch; print(f'    PyTorch: {torch.__version__}'); print(f'    CUDA: {torch.cuda.is_available()}'); print(f'    GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')",
    ],
    capture_output=True,
    text=True,
)
print(result.stdout)
if "False" in result.stdout:
    print("    WARNING: CUDA not available!")
print()

print(f"[4] Starting API (this may take a while for first load)...")
print(
    f'    Command: llamafactory-cli api --model_name_or_path "{MODEL_PATH}" --template qwen'
)
print()

env = os.environ.copy()
env["PYTHONPATH"] = str(os.path.join(LLAMA_PATH, "src"))
env["PYTHONIOENCODING"] = "utf-8"
env["API_PORT"] = str(API_PORT)

cmd = [
    VENV_PYTHON,
    "-m",
    "llamafactory.cli",
    "api",
    "--model_name_or_path",
    MODEL_PATH,
    "--template",
    "qwen",
]

print("    Starting subprocess...")
process = subprocess.Popen(
    cmd,
    env=env,
    cwd=LLAMA_PATH,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    bufsize=1,
    text=True,
)

output_lines = []


def read_output():
    for line in iter(process.stdout.readline, ""):
        if line:
            output_lines.append(line.strip())
            if len(output_lines) <= 30:
                print(f"    [API] {line.strip()}")
            elif len(output_lines) == 31:
                print("    ... (truncating output)")


reader_thread = threading.Thread(target=read_output)
reader_thread.daemon = True
reader_thread.start()

print(f"    Waiting for API to start on port {API_PORT}...")
print(f"    (max 180 seconds)")
print()

for i in range(180):
    try:
        resp = requests.get(f"http://127.0.0.1:{API_PORT}/v1/models", timeout=1)
        if resp.status_code == 200:
            print()
            print(f"[5] SUCCESS! API is running at http://127.0.0.1:{API_PORT}")
            print()

            print("[6] Testing chat endpoint...")
            chat_resp = requests.post(
                f"http://127.0.0.1:{API_PORT}/v1/chat/completions",
                json={
                    "model": "Qwen2.5-0.5B",
                    "messages": [{"role": "user", "content": "Hello!"}],
                    "max_tokens": 50,
                },
                timeout=30,
            )
            print(f"    Response: {chat_resp.json()}")

            print()
            print("[7] Cleaning up...")
            process.terminate()
            try:
                process.wait(timeout=5)
            except:
                process.kill()

            print()
            print("=" * 60)
            print("TEST PASSED!")
            print("=" * 60)
            sys.exit(0)
    except requests.exceptions.ConnectionError:
        pass
    except Exception as e:
        print(f"    Error: {e}")

    if i % 15 == 0:
        print(f"    Still waiting... ({i}s)")

    time.sleep(1)

print()
print(f"[5] TIMEOUT: API did not start within 180 seconds")
print()
print("Last 20 lines of output:")
for line in output_lines[-20:]:
    print(f"    {line}")
print()
print("=" * 60)
print("TEST FAILED - Check output above for errors")
print("=" * 60)

process.terminate()
sys.exit(1)
