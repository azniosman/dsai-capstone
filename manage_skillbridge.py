#!/usr/bin/env python3
"""
manage_skillbridge.py — SkillBridge unified CLI management utility.

Provides an interactive numbered menu (or a non-interactive ``--action``
mode) that wraps the six existing scripts in ``scripts/`` into clearly
named Python functions with robust error handling and dependency checks.

Interactive usage:
    python manage_skillbridge.py

Non-interactive usage:
    python manage_skillbridge.py --action check-deps
    python manage_skillbridge.py --action deploy-local
    python manage_skillbridge.py --action deploy-serverless [--env dev] [--region us-east-1]
    python manage_skillbridge.py --action build-push        [--env dev] [--region us-east-1]
    python manage_skillbridge.py --action build-lambda
    python manage_skillbridge.py --action test-full         [--base-url http://localhost:8000]
    python manage_skillbridge.py --action test-verify       [--base-url http://localhost:8000]
"""

from __future__ import annotations

import argparse
import logging
import os
import secrets
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s  %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("skillbridge")
# Prevent messages from propagating to the root logger's default stderr handler,
# which would cause every log line to appear twice.
log.propagate = False

# ── Paths ─────────────────────────────────────────────────────────────────────

# Resolve relative to this file so the script works from any working directory.
ROOT: Path = Path(__file__).resolve().parent
SCRIPTS_DIR: Path = ROOT / "scripts"

# ── Constants ─────────────────────────────────────────────────────────────────

REQUIRED_BINS: list[str] = [
    "docker",
    "aws",
    "terraform",
    "npm",
    "python3",
    "pip3",   # macOS ships pip3, not pip; used by test-script dependencies
    "git",
    "openssl",
]

# Env vars that must be set before a serverless deploy.
SERVERLESS_ENV_VARS: list[str] = [
    "TF_VAR_db_password",
    "TF_VAR_secret_key",
    "TF_VAR_internal_automation_token",
]

# Python packages required by the test scripts.
REQUIRED_PY_PACKAGES: list[str] = ["requests"]

# Menu definition: (action-key, display-label)
MENU_ITEMS: list[tuple[str, str]] = [
    ("deploy-local",      "Local deploy          (docker-compose up --build)"),
    ("deploy-serverless", "Serverless deploy     (Terraform + Lambda + CloudFront)"),
    ("build-push",        "Build & push image    (ECR Lambda container)"),
    ("build-lambda",      "Build Lambda image    (local dry-run, no ECR push)"),
    ("test-full",         "Run full tests        (integration suite — ~60 s)"),
    ("test-verify",       "Run verify tests      (market / courses feature checks)"),
    ("check-deps",        "Check dependencies    (tools, packages, env vars)"),
    ("exit",              "Exit"),
]


# ── Low-level helpers ─────────────────────────────────────────────────────────

def run(
    cmd: list[str],
    *,
    cwd: Optional[Path] = None,
    extra_env: Optional[dict[str, str]] = None,
    check: bool = True,
) -> subprocess.CompletedProcess:
    """
    Run *cmd* as a subprocess, streaming stdout/stderr to the terminal.

    Args:
        cmd:       Command and arguments list.
        cwd:       Working directory (defaults to project root).
        extra_env: Extra environment variables to merge on top of the
                   current process environment.
        check:     If True, raise CalledProcessError on non-zero exit.

    Returns:
        The completed process result.

    Raises:
        subprocess.CalledProcessError: If *check* is True and the process
            exits with a non-zero return code.
        FileNotFoundError: If the executable is not found on PATH.
    """
    display = " ".join(str(c) for c in cmd)
    log.info("$ %s", display)
    merged_env: dict[str, str] = {**os.environ, **(extra_env or {})}
    try:
        return subprocess.run(
            cmd,
            cwd=str(cwd or ROOT),
            env=merged_env,
            check=check,
        )
    except subprocess.CalledProcessError as exc:
        log.error("Command failed (exit %d): %s", exc.returncode, display)
        raise
    except FileNotFoundError:
        log.error("Executable not found: %s", cmd[0])
        raise


def prompt(question: str, default: str = "") -> str:
    """
    Prompt the user for input with an optional default value.

    Exits cleanly on EOF or KeyboardInterrupt (Ctrl-C / Ctrl-D).
    """
    suffix = f" [{default}]" if default else ""
    try:
        value = input(f"  {question}{suffix}: ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        sys.exit(0)
    return value or default


def section(title: str) -> None:
    """Print a prominent section header."""
    width = 60
    print(f"\n{'=' * width}")
    print(f"  {title}")
    print("=" * width)


def _ensure_script(script: Path) -> None:
    """
    Abort with a clear message if *script* does not exist.

    This guards against running the utility from the wrong directory.
    """
    if not script.exists():
        log.error("Script not found: %s", script)
        log.error(
            "Ensure manage_skillbridge.py lives in the project root "
            "alongside the scripts/ directory."
        )
        sys.exit(1)


# ── Dependency / environment checks ───────────────────────────────────────────

def _check_bin(name: str) -> tuple[bool, str]:
    """
    Return *(present, version_string)* for a binary on PATH.

    The version string is taken from the first line of ``--version`` output
    and is capped at 80 characters.
    """
    if shutil.which(name) is None:
        return False, ""
    try:
        result = subprocess.run(
            [name, "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        raw = (result.stdout or result.stderr).strip()
        version = raw.splitlines()[0][:80] if raw else "(version unknown)"
    except Exception:
        version = "(version unknown)"
    return True, version


def _check_docker_compose() -> tuple[bool, str]:
    """
    Check for the Docker Compose plugin (``docker compose``) or the
    standalone ``docker-compose`` binary.

    Returns *(present, description_string)*.
    """
    # Prefer the modern plugin form.
    try:
        result = subprocess.run(
            ["docker", "compose", "version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            version = result.stdout.strip().splitlines()[0][:80]
            return True, f"plugin  — {version}"
    except Exception:
        pass

    # Fall back to standalone binary.
    if shutil.which("docker-compose"):
        try:
            result = subprocess.run(
                ["docker-compose", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            version = result.stdout.strip().splitlines()[0][:80]
            return True, f"standalone — {version}"
        except Exception:
            return True, "standalone (version unknown)"

    return False, ""


def _docker_daemon_running() -> bool:
    """Return True if the Docker daemon is accessible via ``docker info``."""
    try:
        result = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            timeout=10,
        )
        return result.returncode == 0
    except Exception:
        return False


def _check_py_package(pkg: str) -> bool:
    """Return True if *pkg* is importable in the current Python interpreter."""
    try:
        subprocess.run(
            [sys.executable, "-c", f"import {pkg}"],
            capture_output=True,
            check=True,
            timeout=5,
        )
        return True
    except Exception:
        return False


def check_dependencies() -> bool:
    """
    Check all required tools, Python packages, and environment variables.

    Prints a formatted summary report and returns True when every required
    item is present; False otherwise.
    """
    section("Environment & Dependency Check")
    all_ok = True

    # ── Required binaries ─────────────────────────────────────────────────────
    print("\nRequired binaries:")
    for name in REQUIRED_BINS:
        ok, version = _check_bin(name)
        mark = "✅" if ok else "❌"
        label = version if ok else "NOT FOUND — please install"
        print(f"  {mark}  {name:<15} {label}")
        if not ok:
            all_ok = False

    # docker compose deserves its own check (plugin vs standalone).
    ok, version = _check_docker_compose()
    mark = "✅" if ok else "❌"
    label = version if ok else "NOT FOUND — install Docker Desktop or docker-compose"
    print(f"  {mark}  {'docker compose':<15} {label}")
    if not ok:
        all_ok = False

    # ── Docker daemon ─────────────────────────────────────────────────────────
    print("\nDocker daemon:")
    daemon_ok = _docker_daemon_running()
    if daemon_ok:
        print("  ✅  Docker daemon is running")
    else:
        print("  ❌  Docker daemon NOT RUNNING — start Docker Desktop or dockerd")
        all_ok = False

    # ── Python packages ───────────────────────────────────────────────────────
    print("\nPython packages (required by test scripts):")
    for pkg in REQUIRED_PY_PACKAGES:
        ok = _check_py_package(pkg)
        mark = "✅" if ok else "❌"
        label = "installed" if ok else f"MISSING — run: pip install {pkg}"
        print(f"  {mark}  {pkg:<20} {label}")
        if not ok:
            all_ok = False

    # ── Serverless env vars ───────────────────────────────────────────────────
    print("\nServerless deployment variables (required for action: deploy-serverless):")
    for var in SERVERLESS_ENV_VARS:
        present = bool(os.environ.get(var))
        mark = "✅" if present else "⚠️ "
        label = "set" if present else "NOT SET"
        if not present:
            hints = {
                "TF_VAR_db_password":               "export TF_VAR_db_password=$(python3 -c 'import secrets; print(secrets.token_hex(24))')",
                "TF_VAR_secret_key":                "export TF_VAR_secret_key=$(openssl rand -hex 32)",
                "TF_VAR_internal_automation_token": "export TF_VAR_internal_automation_token=$(python3 -c 'import secrets; print(secrets.token_hex(32))')",
            }
            label += f"  →  {hints.get(var, '')}"
        print(f"  {mark}  {var:<48} {label}")

    # ── Optional / informational env vars ─────────────────────────────────────
    print("\nOptional / informational variables:")
    optional_vars = ["AWS_REGION", "AWS_PROFILE", "NEXT_PUBLIC_API_URL", "AWS_DEFAULT_REGION"]
    for var in optional_vars:
        val = os.environ.get(var)
        mark = "✅" if val else "·  "
        label = val if val else "not set (script defaults will be used)"
        print(f"  {mark}  {var:<30} {label}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    if all_ok:
        log.info("All required dependencies satisfied. ✅")
    else:
        log.error("One or more required items are missing (see ❌ above).")
    return all_ok


# ── Workflow functions ─────────────────────────────────────────────────────────

def deploy_local() -> None:
    """
    Deploy SkillBridge locally using Docker Compose.

    Wraps ``scripts/deploy.sh``, which:
      1. Validates that ``nestjs-backend/.env`` exists (warns if missing).
      2. Runs ``docker compose up -d --build``.
      3. Polls for the DB health check for up to 30 seconds.
      4. Prunes dangling images with ``docker image prune -f``.

    Services started: Frontend (:3000), Backend (:8000), n8n (:5678).
    """
    section("Local Deployment — docker-compose up")

    if not shutil.which("docker"):
        log.error("'docker' not found. Install Docker and retry.")
        sys.exit(1)
    if not _docker_daemon_running():
        log.error(
            "Docker daemon is not running. "
            "Start Docker Desktop (or dockerd) and retry."
        )
        sys.exit(1)

    script = SCRIPTS_DIR / "deploy.sh"
    _ensure_script(script)
    run(["bash", str(script)], cwd=ROOT)
    log.info("Local deployment complete.")
    print(
        "\n  Services:\n"
        "    Frontend  →  http://localhost:3000\n"
        "    Backend   →  http://localhost:8000/api\n"
        "    n8n       →  http://localhost:5678\n"
    )


def deploy_serverless(env: str = "dev", region: str = "us-east-1") -> None:
    """
    Deploy SkillBridge to AWS (Terraform + Lambda + CloudFront).

    Wraps ``scripts/deploy-serverless.sh``, which runs six steps:
      1. ``terraform apply -target=module.ecr`` to create the ECR repo.
      2. Calls ``build_and_push.sh`` to build and push the Lambda image.
      3. Full ``terraform apply`` for all infrastructure.
      4. ``npm run build`` + ``aws s3 sync`` for the Next.js frontend.
      5. CloudFront cache invalidation (if enabled).
      6. EventBridge smoke tests (health, cache-cleanup, SSG sync).

    Required env vars (must be exported before running):
        TF_VAR_db_password, TF_VAR_secret_key,
        TF_VAR_internal_automation_token

    Args:
        env:    Deployment environment — ``dev`` or ``prod``.
        region: AWS region (default: ``us-east-1``).
    """
    section(f"Serverless Deployment — env={env}  region={region}")

    # Auto-generate any missing secrets rather than hard-stopping.
    # Generated values are printed so the user can persist them if desired.
    generated: dict[str, str] = {}
    missing = [v for v in SERVERLESS_ENV_VARS if not os.environ.get(v)]
    if missing:
        print(
            "\n  The following secrets are not set — generating them now.\n"
            "  Copy the export lines below to persist them across sessions.\n"
        )
        for var in missing:
            if var == "TF_VAR_db_password":
                # Aurora PostgreSQL forbids '/', '@', '"', and ' ' in passwords.
                # secrets.token_hex produces only [0-9a-f] — always safe.
                value = secrets.token_hex(24)
            else:
                value = secrets.token_hex(32)
            generated[var] = value
            os.environ[var] = value
            print(f"  export {var}='{value}'")
        print()

    for tool in ("aws", "docker", "terraform", "npm"):
        if not shutil.which(tool):
            log.error("Required tool '%s' not found. Install it and retry.", tool)
            sys.exit(1)

    if not _docker_daemon_running():
        log.error("Docker daemon is not running.")
        sys.exit(1)

    script = SCRIPTS_DIR / "deploy-serverless.sh"
    _ensure_script(script)
    run(
        ["bash", str(script), env],
        cwd=ROOT,
        extra_env={"AWS_REGION": region},
    )
    log.info("Serverless deployment complete.")


def build_and_push(env: str = "dev", region: str = "us-east-1") -> None:
    """
    Build the Lambda container image and push it to ECR.

    Wraps ``scripts/build_and_push.sh``, which:
      1. Authenticates with ECR (``aws ecr get-login-password``).
      2. Builds a ``linux/amd64`` image from ``backend/Dockerfile.lambda``
         with ``--provenance=false`` (required for Lambda compatibility).
      3. Tags with ``latest`` and the current git short-hash.
      4. Pushes both tags to ECR.

    Args:
        env:    Deployment environment — ``dev`` or ``prod``.
        region: AWS region (default: ``us-east-1``).
    """
    section(f"Build & Push Lambda Image — env={env}  region={region}")

    for tool in ("docker", "aws", "git"):
        if not shutil.which(tool):
            log.error("Required tool '%s' not found.", tool)
            sys.exit(1)

    if not _docker_daemon_running():
        log.error("Docker daemon is not running.")
        sys.exit(1)

    script = SCRIPTS_DIR / "build_and_push.sh"
    _ensure_script(script)
    run(["bash", str(script), env, region], cwd=ROOT)
    log.info("Build and push complete.")


def build_lambda_zip() -> None:
    """
    Build the Lambda container image locally without pushing to ECR.

    This is a dry-run that validates ``Dockerfile.lambda`` and the full
    NestJS + Python handler build pipeline.  No AWS credentials or ECR
    login are required.  The resulting image is tagged
    ``skillbridge-local:latest`` in the local Docker daemon.

    Wraps ``scripts/build_lambda.sh``.
    """
    section("Build Lambda Image — local dry-run (no ECR push)")

    if not shutil.which("docker"):
        log.error("'docker' not found. Install Docker and retry.")
        sys.exit(1)
    if not _docker_daemon_running():
        log.error("Docker daemon is not running. Start Docker Desktop / dockerd first.")
        sys.exit(1)

    script = SCRIPTS_DIR / "build_lambda.sh"
    _ensure_script(script)
    run(["bash", str(script)], cwd=ROOT)
    log.info("Local Lambda image built: skillbridge-local:latest")


def run_full_tests(base_url: str = "http://localhost:8000") -> None:
    """
    Run the full integration test suite (``scripts/full_test.py``).

    Covers 13 test groups: health, auth (register + login), profile,
    roles, recommendations, skill-gap, market insights, courses,
    resume upload, AI chat, mock interview, resume rewriter, and
    project suggestions.

    The backend must be running and reachable at *base_url* before
    invoking this action.

    Args:
        base_url: Backend base URL.  Current test script hardcodes
                  ``http://localhost:8000``; this argument is forwarded
                  as ``SKILLBRIDGE_BASE_URL`` for future use.
    """
    section("Full Integration Tests")

    if not _check_py_package("requests"):
        log.error(
            "Python package 'requests' is not installed.  "
            "Run: pip install requests"
        )
        sys.exit(1)

    script = SCRIPTS_DIR / "full_test.py"
    _ensure_script(script)

    result = subprocess.run(
        [sys.executable, str(script)],
        cwd=str(ROOT),
        env={**os.environ, "SKILLBRIDGE_BASE_URL": base_url},
        check=False,
    )
    if result.returncode != 0:
        log.error(
            "Full integration tests FAILED (exit code %d).", result.returncode
        )
        sys.exit(result.returncode)
    log.info("Full integration tests PASSED.")


def run_verify_features(base_url: str = "http://localhost:8000") -> None:
    """
    Run the feature verification tests (``scripts/verify_features.py``).

    Checks three features against a running backend:
      - Market insights endpoint (including 2026 forecast data).
      - Market simulation endpoint.
      - Courses endpoint + subsidy calculator logic.

    Note: ``verify_features.py`` does not exit with a non-zero code on
    failure; all results are visible in the printed output.

    Args:
        base_url: Backend base URL.  Forwarded as ``SKILLBRIDGE_BASE_URL``
                  for future use.
    """
    section("Feature Verification Tests")

    if not _check_py_package("requests"):
        log.error(
            "Python package 'requests' is not installed.  "
            "Run: pip install requests"
        )
        sys.exit(1)

    script = SCRIPTS_DIR / "verify_features.py"
    _ensure_script(script)

    result = subprocess.run(
        [sys.executable, str(script)],
        cwd=str(ROOT),
        env={**os.environ, "SKILLBRIDGE_BASE_URL": base_url},
        check=False,
    )
    if result.returncode != 0:
        log.error(
            "Feature verification exited with code %d.", result.returncode
        )
        sys.exit(result.returncode)
    log.info("Feature verification script finished.")


# ── Interactive menu ───────────────────────────────────────────────────────────

def show_menu() -> None:
    """Print the numbered main menu."""
    print("\n" + "─" * 60)
    print("  SkillBridge Management Utility")
    print("─" * 60)
    for i, (_, label) in enumerate(MENU_ITEMS, 1):
        print(f"  {i}.  {label}")
    print("─" * 60)


def run_menu_loop(args: argparse.Namespace) -> None:
    """
    Run the interactive menu loop.

    Displays the menu, reads a numeric choice, delegates to
    ``dispatch_action``, then pauses before re-displaying the menu.
    Exits cleanly on Ctrl-C / Ctrl-D or when the user selects "Exit".
    """
    menu_size = len(MENU_ITEMS)
    while True:
        show_menu()
        try:
            raw = input(f"\n  Enter choice (1–{menu_size}): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n  Exiting.")
            sys.exit(0)

        if not raw.isdigit() or not (1 <= int(raw) <= menu_size):
            print(f"  Invalid choice — enter a number between 1 and {menu_size}.")
            continue

        action_key = MENU_ITEMS[int(raw) - 1][0]

        if action_key == "exit":
            print("  Goodbye!")
            sys.exit(0)

        dispatch_action(action_key, args, interactive=True)

        try:
            input("\n  [Press Enter to return to the menu]")
        except (EOFError, KeyboardInterrupt):
            print()
            sys.exit(0)


# ── Action dispatcher ─────────────────────────────────────────────────────────

def dispatch_action(
    action: str,
    args: argparse.Namespace,
    interactive: bool = False,
) -> None:
    """
    Dispatch a named *action* to the corresponding workflow function.

    In interactive mode, missing parameters are collected via prompts with
    sensible defaults.  In non-interactive mode, argparse defaults are used
    so the script is pipeline-friendly.

    Args:
        action:      The action key (e.g. ``"deploy-local"``).
        args:        Parsed argparse namespace (may contain pre-supplied values).
        interactive: True when called from the menu loop (enables prompts).
    """

    def _env() -> str:
        if args.env:
            return args.env
        return prompt("Environment (dev/prod)", "dev") if interactive else "dev"

    def _region() -> str:
        if args.region:
            return args.region
        return (
            prompt("AWS region", "us-east-1") if interactive else "us-east-1"
        )

    def _base_url() -> str:
        if args.base_url:
            return args.base_url
        return (
            prompt("Backend base URL", "http://localhost:8000")
            if interactive
            else "http://localhost:8000"
        )

    try:
        if action == "deploy-local":
            deploy_local()
        elif action == "deploy-serverless":
            deploy_serverless(_env(), _region())
        elif action == "build-push":
            build_and_push(_env(), _region())
        elif action == "build-lambda":
            build_lambda_zip()
        elif action == "test-full":
            run_full_tests(_base_url())
        elif action == "test-verify":
            run_verify_features(_base_url())
        elif action == "check-deps":
            check_dependencies()
        else:
            log.error("Unknown action: %s", action)
            sys.exit(1)

    except subprocess.CalledProcessError as exc:
        log.error(
            "Action '%s' failed — subprocess exited with code %d.",
            action,
            exc.returncode,
        )
        sys.exit(exc.returncode)
    except FileNotFoundError as exc:
        log.error("File or executable not found: %s", exc)
        sys.exit(1)
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        log.error("Unexpected error during action '%s': %s", action, exc)
        sys.exit(1)


# ── CLI argument parsing ───────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    """
    Parse command-line arguments.

    Returns an ``argparse.Namespace`` with the following attributes:
        action   — named action to run (None → interactive menu).
        env      — deployment environment string (empty string → prompt/default).
        region   — AWS region string (empty string → prompt/default).
        base_url — backend base URL for tests (empty string → prompt/default).
    """
    valid_actions = [key for key, _ in MENU_ITEMS if key != "exit"]

    parser = argparse.ArgumentParser(
        prog="manage_skillbridge.py",
        description="SkillBridge unified CLI management utility.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
actions:
  deploy-local        Local Docker-Compose deployment
  deploy-serverless   Full AWS serverless deployment (Terraform + Lambda)
  build-push          Build and push Lambda container image to ECR
  build-lambda        Build Lambda zip package (terraform/function.zip)
  test-full           Run full integration test suite
  test-verify         Run feature verification tests
  check-deps          Check required tools, packages, and env vars

examples:
  # Interactive menu
  python manage_skillbridge.py

  # Non-interactive
  python manage_skillbridge.py --action check-deps
  python manage_skillbridge.py --action deploy-local
  python manage_skillbridge.py --action deploy-serverless --env prod --region ap-southeast-1
  python manage_skillbridge.py --action build-push --env dev
  python manage_skillbridge.py --action test-full --base-url http://localhost:8000
""",
    )
    parser.add_argument(
        "--action",
        choices=valid_actions,
        metavar="ACTION",
        help=(
            "Run a specific action without the interactive menu. "
            f"Choices: {', '.join(valid_actions)}"
        ),
    )
    parser.add_argument(
        "--env",
        default="",
        metavar="ENV",
        help="Deployment environment: dev or prod (default: dev).",
    )
    parser.add_argument(
        "--region",
        default="",
        metavar="REGION",
        help="AWS region (default: us-east-1).",
    )
    parser.add_argument(
        "--base-url",
        dest="base_url",
        default="",
        metavar="URL",
        help="Backend base URL for test actions (default: http://localhost:8000).",
    )
    return parser.parse_args()


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    """
    Parse arguments and either run the requested action directly or
    start the interactive menu loop.
    """
    args = parse_args()

    if args.action:
        # Non-interactive path: run the action once, then exit.
        dispatch_action(args.action, args, interactive=False)
    else:
        # Interactive path: display the menu loop until the user exits.
        run_menu_loop(args)


if __name__ == "__main__":
    main()
