#!/usr/bin/env python3
"""
ArclinkTune Dependency Checker
Checks and fixes LlamaFactory dependencies for ArclinkTune
"""

import subprocess
import sys
from pathlib import Path


def run_cmd(cmd, check=True):
    """Run a command and return output"""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"  Error: {result.stderr}")
        return None
    return result.stdout.strip()


def check_transformers():
    """Check transformers version"""
    print("\n[CHECK] Transformers version...")
    output = run_cmd(
        f'"{VENV_PYTHON}" -c "import transformers; print(transformers.__version__)"'
    )
    if output:
        version = output.strip()
        major = int(version.split(".")[0])
        minor = int(version.split(".")[1])

        if major == 5 and minor <= 2:
            print(f"  OK: transformers {version}")
            return True
        elif major == 4 and minor >= 55:
            print(f"  OK: transformers {version}")
            return True
        else:
            print(f"  WARNING: transformers {version} may not be compatible")
            print(f"  Expected: >=4.55.0,<=5.2.0")
            return False
    return False


def check_llamafactory():
    """Check if LlamaFactory is installed"""
    print("\n[CHECK] LlamaFactory installation...")
    output = run_cmd(
        f'"{VENV_PYTHON}" -c "import llamafactory; print(llamafactory.__version__)"'
    )
    if output:
        print(f"  OK: LlamaFactory {output.strip()} installed")
        return True
    else:
        print("  ERROR: LlamaFactory not installed")
        return False


def check_extra_packages():
    """Check extra packages required by LlamaFactory"""
    print("\n[CHECK] Extra packages (jieba, nltk, rouge_chinese)...")
    packages = ["jieba", "nltk", "rouge_chinese"]
    missing = []
    for pkg in packages:
        output = run_cmd(
            f'"{VENV_PYTHON}" -c "import {pkg}; print({pkg}.__version__)"', check=False
        )
        if output is None:
            print(f"  [MISSING] {pkg}")
            missing.append(pkg)
        else:
            print(f"  [OK] {pkg} {output.strip()}")
    return missing


def check_torch():
    """Check PyTorch and CUDA"""
    print("\n[CHECK] PyTorch and CUDA...")
    output = run_cmd(f'"{VENV_PYTHON}" -c "import torch; print(torch.__version__)"')
    if output:
        print(f"  PyTorch: {output.strip()}")

    output = run_cmd(
        f'"{VENV_PYTHON}" -c "import torch; print(torch.cuda.is_available())"'
    )
    if output == "True":
        print("  CUDA: Available")
        output = run_cmd(
            f'"{VENV_PYTHON}" -c "import torch; print(torch.cuda.get_device_name(0))"'
        )
        if output:
            print(f"  GPU: {output.strip()}")
        return True
    else:
        print("  CUDA: Not available (will use CPU)")
        return False


def fix_transformers():
    """Fix transformers version"""
    print("\n[FIX] Installing compatible transformers version...")
    cmd = f'"{VENV_PYTHON}" -m pip install "transformers>=4.55.0,<=5.2.0"'
    result = run_cmd(cmd, check=False)
    if result is None:
        print("  Failed to install transformers")
        return False
    print("  Installed successfully")
    return True


def install_llamafactory():
    """Install LlamaFactory"""
    print("\n[INSTALL] Installing LlamaFactory...")
    root = Path(__file__).parent.parent
    llamafactory_path = root / "core" / "LlamaFactory"

    cmd = f'"{VENV_PYTHON}" -m pip install -e "{llamafactory_path}"'
    result = run_cmd(cmd, check=False)
    if result is None:
        print("  Failed to install LlamaFactory")
        return False
    print("  Installed successfully")
    return True


def main():
    global VENV_PYTHON

    root = Path(__file__).parent.parent
    venv_path = root / "core" / ".venv"

    if sys.platform == "win32":
        VENV_PYTHON = str(venv_path / "Scripts" / "python.exe")
    else:
        VENV_PYTHON = str(venv_path / "bin" / "python")

    print("=" * 50)
    print("   ArclinkTune Dependency Checker")
    print("=" * 50)

    fix_mode = "--fix" in sys.argv

    # Check all dependencies
    torch_ok = check_torch()
    llamafactory_ok = check_llamafactory()
    transformers_ok = check_transformers()
    missing_extra = check_extra_packages()

    print("\n" + "=" * 50)
    print("   Summary")
    print("=" * 50)

    issues = []
    if not llamafactory_ok:
        issues.append("LlamaFactory not installed")
    if not transformers_ok:
        issues.append("Transformers version incompatible")
    if missing_extra:
        issues.append(f"Missing packages: {', '.join(missing_extra)}")

    if issues:
        print("\nIssues found:")
        for issue in issues:
            print(f"  - {issue}")

        if fix_mode:
            print("\nFixing issues...")
            if not llamafactory_ok:
                install_llamafactory()
            if not transformers_ok:
                fix_transformers()
            if missing_extra:
                print(f"\nInstalling missing packages: {', '.join(missing_extra)}")
                for pkg in missing_extra:
                    run_cmd(f'"{VENV_PYTHON}" -m pip install {pkg}', check=False)
                    print(f"  Installed {pkg}")

            # Re-check
            print("\nRe-checking...")
            llamafactory_ok = check_llamafactory()
            transformers_ok = check_transformers()
            missing_extra = check_extra_packages()

            if llamafactory_ok and transformers_ok and not missing_extra:
                print("\nAll issues fixed!")
            else:
                print("\nSome issues could not be fixed.")
                print("Please run: .\scripts\setup.ps1")
        else:
            print("\nRun with --fix to attempt automatic fixes")
            print("Or run: .\scripts\setup.ps1")
    else:
        print("\nAll dependencies OK!")

    print()


if __name__ == "__main__":
    main()
