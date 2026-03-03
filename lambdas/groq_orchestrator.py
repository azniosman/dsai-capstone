"""Lambda handler — generic Groq LLM invoker (OpenAI-compatible API).

Replaces the former bedrock_orchestrator. Accepts the same event shape so
callers require no change:
    {model_id?, system?, messages: [{role, content}], max_tokens?}
Returns:
    {statusCode, body: {text}}

CMD override: lambdas.groq_orchestrator.handler

Environment variables:
    GROQ_API_KEY    — required; from console.groq.com
    GROQ_MODEL      — optional; default: llama-3.3-70b-versatile
    AI_TEMPERATURE  — optional; default: 0.3
    AI_MAX_TOKENS   — ignored if per-request max_tokens is provided
"""

import json
import logging
import os

from lambdas.base import bootstrap_env

bootstrap_env()

logger = logging.getLogger(__name__)

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
_DEFAULT_MODEL = "llama-3.3-70b-versatile"
_DEFAULT_TEMPERATURE = 0.3


def handler(event: dict, context) -> dict:
    try:
        from openai import OpenAI

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            logger.error("GROQ_API_KEY is not set")
            return {
                "statusCode": 500,
                "body": json.dumps({"error": "GROQ_API_KEY not configured"}),
            }

        model = event.get("model_id") or os.environ.get("GROQ_MODEL", _DEFAULT_MODEL)
        system = event.get("system", "")
        messages = event.get("messages", [])
        max_tokens = int(event.get("max_tokens", int(os.environ.get("AI_MAX_TOKENS", 1024))))
        temperature = float(os.environ.get("AI_TEMPERATURE", _DEFAULT_TEMPERATURE))

        if not messages:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "messages required"}),
            }

        groq_messages = []
        if system:
            groq_messages.append({"role": "system", "content": system})
        groq_messages.extend(messages)

        client = OpenAI(api_key=api_key, base_url=_GROQ_BASE_URL)
        completion = client.chat.completions.create(
            model=model,
            messages=groq_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        text = completion.choices[0].message.content or ""
        return {"statusCode": 200, "body": json.dumps({"text": text})}

    except Exception as e:
        logger.error("Groq orchestrator error: %s", e, exc_info=True)
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
