"""Lambda handler — generic async Bedrock invoker.

Used for fire-and-forget Bedrock calls from other services.

Accepts: {model_id?, system?, messages: [{role, content}], max_tokens?}
Returns: {statusCode, body: {text}}

CMD override: lambdas.bedrock_orchestrator.handler
"""

import json
import logging

from lambdas.base import bootstrap_env

bootstrap_env()

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    try:
        import boto3
        import os

        model_id = event.get("model_id") or os.environ.get(
            "BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0"
        )
        system = event.get("system", "")
        messages = event.get("messages", [])
        max_tokens = int(event.get("max_tokens", 1024))

        if not messages:
            return {"statusCode": 400, "body": json.dumps({"error": "messages required"})}

        body_dict: dict = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "messages": messages,
        }
        if system:
            body_dict["system"] = system

        region = os.environ.get("AWS_REGION_ID", "us-east-1")
        client = boto3.client("bedrock-runtime", region_name=region)
        response = client.invoke_model(
            modelId=model_id,
            body=json.dumps(body_dict),
            contentType="application/json",
            accept="application/json",
        )
        raw = json.loads(response["body"].read())
        text = raw["content"][0]["text"] if raw.get("content") else ""
        return {"statusCode": 200, "body": json.dumps({"text": text})}

    except Exception as e:
        logger.error("Bedrock orchestrator error: %s", e, exc_info=True)
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
