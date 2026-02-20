import base64
import json
import logging
import time
import urllib.request
import uuid

import boto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)


class VoiceService:
    def __init__(self):
        self.polly_client = boto3.client('polly', region_name=settings.aws_region)
        self.transcribe_client = boto3.client('transcribe', region_name=settings.aws_region)
        self.s3_client = boto3.client('s3', region_name=settings.aws_region)

    def text_to_speech(self, text: str, voice_id: str = "Matthew") -> bytes:
        """Convert text to speech using AWS Polly. Returns mp3 bytes."""
        try:
            response = self.polly_client.synthesize_speech(
                Text=text,
                OutputFormat='mp3',
                VoiceId=voice_id,
                Engine='neural'
            )
            if "AudioStream" in response:
                return response["AudioStream"].read()
            return None
        except ClientError as e:
            logger.error("Polly failed: %s", e)
            raise

    def start_transcription(self, file_uri: str, job_name: str, format: str = "mp3"):
        """Start a Transcribe batch job for a given S3 URI."""
        try:
            self.transcribe_client.start_transcription_job(
                TranscriptionJobName=job_name,
                Media={'MediaFileUri': file_uri},
                MediaFormat=format,
                LanguageCode='en-US'
            )
        except ClientError as e:
            logger.error("Transcribe job creation failed: %s", e)
            raise

    def transcribe_audio_sync(
        self,
        audio_bytes: bytes,
        audio_format: str,
        bucket: str,
        timeout_seconds: int = 25,
    ) -> str:
        """Upload audio to S3, poll Transcribe batch job, return transcript string.

        Raises TimeoutError if the job doesn't complete within timeout_seconds.
        Raises RuntimeError if the job fails.
        Cleans up both the S3 object and the Transcribe job on completion.
        """
        job_name = f"skillbridge-voice-{uuid.uuid4().hex}"
        s3_key = f"voice-temp/{job_name}.{audio_format}"

        # 1. Upload audio to S3
        self.s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=audio_bytes,
        )
        s3_uri = f"s3://{bucket}/{s3_key}"
        logger.info("Uploaded voice audio to %s", s3_uri)

        try:
            # 2. Start Transcribe job
            self.transcribe_client.start_transcription_job(
                TranscriptionJobName=job_name,
                Media={"MediaFileUri": s3_uri},
                MediaFormat=audio_format,
                LanguageCode="en-US",
            )

            # 3. Poll until complete or timeout
            deadline = time.time() + timeout_seconds
            while time.time() < deadline:
                response = self.transcribe_client.get_transcription_job(
                    TranscriptionJobName=job_name
                )
                status = response["TranscriptionJob"]["TranscriptionJobStatus"]

                if status == "COMPLETED":
                    transcript_uri = (
                        response["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
                    )
                    # 4. Fetch transcript JSON
                    with urllib.request.urlopen(transcript_uri) as f:
                        transcript_data = json.loads(f.read())
                    transcript = transcript_data["results"]["transcripts"][0]["transcript"]
                    logger.info("Transcription complete: %s", transcript[:100])
                    return transcript

                if status == "FAILED":
                    reason = response["TranscriptionJob"].get("FailureReason", "unknown")
                    raise RuntimeError(f"Transcription job failed: {reason}")

                time.sleep(2)

            raise TimeoutError(f"Transcription job did not complete within {timeout_seconds}s")

        finally:
            # 5. Cleanup S3 object + Transcribe job (best-effort)
            try:
                self.s3_client.delete_object(Bucket=bucket, Key=s3_key)
            except Exception:
                pass
            try:
                self.transcribe_client.delete_transcription_job(
                    TranscriptionJobName=job_name
                )
            except Exception:
                pass

    def _ws_send(self, client, connection_id: str, payload: dict) -> None:
        """Push a JSON payload to a WebSocket connection."""
        client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(payload).encode("utf-8"),
        )

    def voice_coaching_pipeline(
        self,
        audio_bytes: bytes,
        profile_id: int,
        connection_id: str,
        apigw_management_client,
        audio_format: str = "webm",
    ) -> None:
        """End-to-end voice coaching pipeline:
        1. Transcribe audio → text
        2. Generate coaching response via Bedrock/chat
        3. Synthesise response → mp3 bytes
        4. Push JSON response over WebSocket

        Sends {type, transcript, response_text, audio_base64, audio_format}
        back to the connected client.
        """
        bucket = settings.voice_transcribe_bucket
        if not bucket:
            raise RuntimeError("VOICE_TRANSCRIBE_BUCKET env var not configured")

        # 1. Transcribe
        transcript = self.transcribe_audio_sync(
            audio_bytes=audio_bytes,
            audio_format=audio_format,
            bucket=bucket,
        )

        # 2. AI coaching response
        try:
            from app.routers.chat import _get_ai_response  # type: ignore
            coaching_response = _get_ai_response(transcript, profile_id=profile_id)
        except Exception:
            # Fallback: simple rule-based response
            coaching_response = (
                f"I heard: '{transcript}'. "
                "That's a great question about your career. "
                "Consider focusing on building your core technical skills and applying to roles "
                "that match your current experience level."
            )

        # 3. Text-to-speech
        audio_out = self.text_to_speech(coaching_response)
        audio_b64 = base64.b64encode(audio_out).decode("utf-8") if audio_out else ""

        # 4. Send WebSocket response
        self._ws_send(
            apigw_management_client,
            connection_id,
            {
                "type": "audio_response",
                "transcript": transcript,
                "response_text": coaching_response,
                "audio_base64": audio_b64,
                "audio_format": "mp3",
            },
        )


voice_service = VoiceService()
