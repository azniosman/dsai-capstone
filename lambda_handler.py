"""
lambda_handler.py — AWS Lambda entry point for the SkillBridge NestJS backend.

On cold start, this handler starts the NestJS HTTP server as a sub-process
and waits for it to accept connections.  Subsequent invocations in the same
execution environment reuse the running process (warm start).

Supports both API Gateway payload formats:
  • v2.0 (HTTP API) — fields: rawPath, rawQueryString,
                               requestContext.http.method, headers, body
  • v1.0 (REST API / Lambda Invoke) — fields: httpMethod, path,
                                               queryStringParameters, headers, body

Usage (set by CMD in Dockerfile.lambda):
    lambda_handler.handler
"""

from __future__ import annotations

import base64
import json
import logging
import os
import socket
import subprocess
import time
import urllib.error
import urllib.request
from typing import Any

# ── Logging ───────────────────────────────────────────────────────────────────

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

# ── DB credentials bootstrap ──────────────────────────────────────────────────
# The Lambda receives DB_SECRET_ARN.  NestJS/MikroORM reads DATABASE_URL (or
# DATABASE_HOST / DATABASE_USER / DATABASE_PASSWORD / DATABASE_NAME).
# Fetch the secret once at module load so the env var is available to the
# NestJS child process on cold start.

def _bootstrap_db_env() -> None:
    """Fetch DB credentials from Secrets Manager and set DATABASE_URL."""
    secret_arn = os.environ.get("DB_SECRET_ARN")
    if not secret_arn:
        return  # Local dev without Secrets Manager — env vars already set
    if os.environ.get("DATABASE_URL"):
        return  # Already set (e.g. by a previous warm invocation or local .env)

    try:
        import urllib.request as _req
        import urllib.parse as _parse

        # Use the AWS SDK via a minimal boto3-free approach: call the
        # Secrets Manager endpoint using the Lambda's IAM role credentials.
        # boto3 is available in all Lambda Python runtimes.
        import boto3  # noqa: PLC0415

        client = boto3.client("secretsmanager", region_name=os.environ.get("AWS_REGION_ID", "us-east-1"))
        resp = client.get_secret_value(SecretId=secret_arn)
        secret = json.loads(resp["SecretString"])

        # The RDS Terraform module stores a 'url' field with the full
        # postgresql://user:pass@host:5432/dbname connection string.
        db_url = secret.get("url")
        if not db_url:
            # Fallback: build from individual fields
            db_url = (
                f"postgresql://{secret['username']}:{secret['password']}"
                f"@{secret['host']}:{secret.get('port', 5432)}/{secret['dbname']}"
            )
        os.environ["DATABASE_URL"] = db_url
        # Also set individual vars for libraries that prefer them
        os.environ.setdefault("DATABASE_HOST", secret.get("host", ""))
        os.environ.setdefault("DATABASE_USER", secret.get("username", ""))
        os.environ.setdefault("DATABASE_PASSWORD", secret.get("password", ""))
        os.environ.setdefault("DATABASE_NAME", secret.get("dbname", ""))
        os.environ.setdefault("DATABASE_PORT", str(secret.get("port", 5432)))
        logger.info("DB credentials loaded from Secrets Manager (host=%s)", secret.get("host"))
    except Exception as exc:
        logger.error("Failed to load DB credentials from Secrets Manager: %s", exc)
        # Do not raise — NestJS will fail at DB init with a clearer error


_bootstrap_db_env()

# ── Configuration ─────────────────────────────────────────────────────────────

NESTJS_PORT: int = int(os.environ.get("NESTJS_PORT", "8000"))

# Absolute path to the NestJS app directory inside the Lambda container.
# Dockerfile.lambda copies it to ${LAMBDA_TASK_ROOT}/nestjs/.
_TASK_ROOT: str = os.environ.get("LAMBDA_TASK_ROOT", os.path.dirname(__file__))
NESTJS_APP_DIR: str = os.path.join(_TASK_ROOT, "nestjs")

# Maximum seconds to wait for NestJS to become ready on cold start.
# NestJS connects to Aurora on first boot (DB + migrations + seeding).
# 90 s gives enough headroom for Aurora Serverless v2 cold-start + NestJS init.
NESTJS_STARTUP_TIMEOUT: float = float(os.environ.get("NESTJS_STARTUP_TIMEOUT", "90"))

# Upstream request timeout (must be < Lambda function timeout of 29 s).
PROXY_TIMEOUT: float = float(os.environ.get("PROXY_TIMEOUT", "27"))

# ── Process state ─────────────────────────────────────────────────────────────

_nestjs_proc: subprocess.Popen | None = None  # type: ignore[type-arg]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _wait_for_port(port: int, timeout: float) -> bool:
    """
    Poll TCP port *port* on localhost until it accepts connections.

    Returns True when the port is ready, False if *timeout* expires first.
    """
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1.0):
                return True
        except OSError:
            time.sleep(0.3)
    return False


def _ensure_nestjs() -> None:
    """
    Start the NestJS server if it is not already running.

    Called once per cold start.  Subsequent warm invocations return
    immediately because the process is still alive.

    Raises:
        RuntimeError: If NestJS does not become ready within
                      NESTJS_STARTUP_TIMEOUT seconds.
    """
    global _nestjs_proc

    # Already running — nothing to do.
    if _nestjs_proc is not None and _nestjs_proc.poll() is None:
        return

    logger.info("Cold start: launching NestJS on port %d …", NESTJS_PORT)

    # ── Quick TCP connectivity check to Aurora before starting NestJS ─────────
    db_url = os.environ.get("DATABASE_URL", "")
    if db_url:
        try:
            import re as _re
            _m = _re.match(r"postgresql://[^@]+@([^:/]+):?(\d+)?/", db_url)
            if _m:
                _db_host, _db_port = _m.group(1), int(_m.group(2) or 5432)
                _t0 = time.monotonic()
                with socket.create_connection((_db_host, _db_port), timeout=10.0):
                    pass
                logger.info("TCP to Aurora %s:%d succeeded in %.1fs", _db_host, _db_port, time.monotonic() - _t0)
        except Exception as _e:
            logger.error("TCP connectivity check to Aurora FAILED: %s", _e)

    env: dict[str, str] = {
        **os.environ,
        "PORT": str(NESTJS_PORT),
        "NODE_ENV": "production",
    }

    # stdout/stderr are piped so we can capture startup errors if the server
    # fails to become ready.
    _nestjs_proc = subprocess.Popen(  # noqa: S603
        ["node", os.path.join(NESTJS_APP_DIR, "dist", "main.js")],
        cwd=NESTJS_APP_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    if not _wait_for_port(NESTJS_PORT, NESTJS_STARTUP_TIMEOUT):
        # Capture whatever output the process produced before failing.
        _nestjs_proc.terminate()
        try:
            out, _ = _nestjs_proc.communicate(timeout=5)
            snippet = out.decode("utf-8", errors="replace")[-3000:] if out else "(no output)"
        except Exception:
            snippet = "(could not read output)"
        raise RuntimeError(
            f"NestJS did not start within {NESTJS_STARTUP_TIMEOUT}s. "
            f"stdout/stderr: {snippet}"
        )

    logger.info("NestJS ready on port %d.", NESTJS_PORT)


def _parse_event(event: dict[str, Any]) -> tuple[str, str, dict[str, str], bytes | None]:
    """
    Extract (method, path_with_qs, headers, body_bytes) from an API Gateway
    event in either payload format v1.0 or v2.0.

    API GW HTTP API  → ``event["version"] == "2.0"``
    REST API / Invoke → no ``version`` key, or ``"1.0"``
    """
    version: str = event.get("version", "1.0")

    if version == "2.0":
        # ── HTTP API payload format v2.0 ──────────────────────────────────
        http_ctx: dict[str, str] = event.get("requestContext", {}).get("http", {})
        method = (http_ctx.get("method") or "GET").upper()
        path = event.get("rawPath") or "/"
        raw_qs = event.get("rawQueryString") or ""
        if raw_qs:
            path = f"{path}?{raw_qs}"
    else:
        # ── REST API / direct Lambda Invoke payload format v1.0 ───────────
        method = (event.get("httpMethod") or "GET").upper()
        path = event.get("path") or "/"
        qs_params: dict[str, str] = event.get("queryStringParameters") or {}
        if qs_params:
            path = f"{path}?{'&'.join(f'{k}={v}' for k, v in qs_params.items())}"

    # Headers — strip hop-by-hop and Lambda-injected fields that would
    # confuse NestJS or cause it to return incorrect responses.
    raw_headers: dict[str, str] = event.get("headers") or {}
    headers: dict[str, str] = {
        k: v
        for k, v in raw_headers.items()
        if k.lower() not in ("host", "connection", "x-forwarded-for")
    }

    # Body
    body_raw: str | None = event.get("body")
    body_bytes: bytes | None = None
    if body_raw:
        if event.get("isBase64Encoded"):
            body_bytes = base64.b64decode(body_raw)
        else:
            body_bytes = body_raw.encode("utf-8")

    return method, path, headers, body_bytes


# ── Lambda handler ─────────────────────────────────────────────────────────────

def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    Lambda handler — ensures NestJS is running then proxies the event.

    Accepts API Gateway payload format v1.0 (REST API / Lambda Invoke)
    and v2.0 (HTTP API).  Returns an API Gateway-compatible response object.
    """
    logger.debug("Event: %s", json.dumps(event)[:400])

    _ensure_nestjs()

    method, path, headers, body_bytes = _parse_event(event)
    url = f"http://127.0.0.1:{NESTJS_PORT}{path}"

    logger.info("%s %s", method, path)

    req = urllib.request.Request(
        url,
        data=body_bytes,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=PROXY_TIMEOUT) as resp:
            status: int = resp.status
            resp_headers: dict[str, str] = dict(resp.headers)
            body: bytes = resp.read()
    except urllib.error.HTTPError as exc:
        status = exc.code
        resp_headers = dict(exc.headers)
        body = exc.read()

    # Strip headers that API Gateway / Lambda cannot forward downstream.
    clean_headers: dict[str, str] = {
        k: v
        for k, v in resp_headers.items()
        if k.lower() not in ("transfer-encoding", "connection", "keep-alive")
    }

    return {
        "statusCode": status,
        "headers": clean_headers,
        "body": body.decode("utf-8", errors="replace"),
        "isBase64Encoded": False,
    }
