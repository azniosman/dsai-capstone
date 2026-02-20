"""Lambda handler — WebSocket voice coaching pipeline.

Routes:
  $connect    → acknowledge connection
  $disconnect → cleanup (no-op for now)
  $default    → parse binary audio frame, run voice_coaching_pipeline()

Binary frame format (browser → Lambda):
  Bytes 0-3:  profile_id  (uint32 big-endian)
  Byte  4:    format byte (0x01=webm, 0x02=mp3, 0x03=wav, 0x04=ogg)
  Bytes 5+:   raw audio bytes

CMD override: lambdas.voice_coaching_handler.handler
"""

import base64
import json
import logging
import struct

import boto3

from lambdas.base import bootstrap_env

bootstrap_env()

logger = logging.getLogger(__name__)

FORMAT_MAP = {0x01: "webm", 0x02: "mp3", 0x03: "wav", 0x04: "ogg"}


def _make_apigw_client(domain: str, stage: str) -> boto3.client:
    endpoint = f"https://{domain}/{stage}"
    return boto3.client(
        "apigatewaymanagementapi",
        endpoint_url=endpoint,
    )


def handler(event: dict, context) -> dict:
    route = event.get("requestContext", {}).get("routeKey", "$default")
    connection_id = event.get("requestContext", {}).get("connectionId", "")
    domain = event.get("requestContext", {}).get("domainName", "")
    stage = event.get("requestContext", {}).get("stage", "dev")

    if route == "$connect":
        return {"statusCode": 200, "body": "Connected"}

    if route == "$disconnect":
        return {"statusCode": 200, "body": "Disconnected"}

    # $default — audio payload
    try:
        apigw = _make_apigw_client(domain, stage)

        # Body is base64-encoded binary when isBase64Encoded=true
        raw_body = event.get("body", "")
        is_b64 = event.get("isBase64Encoded", False)

        # Handle ping
        if not is_b64:
            try:
                msg = json.loads(raw_body) if raw_body else {}
                if msg.get("action") == "ping":
                    apigw.post_to_connection(
                        ConnectionId=connection_id,
                        Data=json.dumps({"type": "pong"}).encode(),
                    )
                    return {"statusCode": 200, "body": "pong"}
            except json.JSONDecodeError:
                pass

        audio_bytes = base64.b64decode(raw_body) if is_b64 else raw_body.encode("latin-1")

        if len(audio_bytes) < 5:
            return {"statusCode": 400, "body": "Frame too short"}

        # Parse 5-byte header
        profile_id = struct.unpack(">I", audio_bytes[:4])[0]
        fmt_byte = audio_bytes[4]
        audio_data = audio_bytes[5:]
        audio_format = FORMAT_MAP.get(fmt_byte, "webm")

        logger.info(
            "Voice frame: connection=%s profile_id=%d format=%s bytes=%d",
            connection_id, profile_id, audio_format, len(audio_data),
        )

        from app.services.voice_service import voice_service
        voice_service.voice_coaching_pipeline(
            audio_bytes=audio_data,
            profile_id=profile_id,
            connection_id=connection_id,
            apigw_management_client=apigw,
            audio_format=audio_format,
        )

        return {"statusCode": 200, "body": "OK"}

    except Exception as e:
        logger.error("Voice handler error: %s", e, exc_info=True)
        try:
            apigw.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps({"type": "error", "message": str(e)}).encode(),
            )
        except Exception:
            pass
        return {"statusCode": 500, "body": str(e)}
