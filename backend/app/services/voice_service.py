import boto3
import logging
import base64
import time
from botocore.exceptions import ClientError
from app.config import settings

logger = logging.getLogger(__name__)

class VoiceService:
    def __init__(self):
        self.polly_client = boto3.client('polly', region_name=settings.aws_region)
        self.transcribe_client = boto3.client('transcribe', region_name=settings.aws_region)

    def text_to_speech(self, text: str, voice_id: str = "Matthew") -> bytes:
        """
        Converts text to speech using AWS Polly.
        Returns audio stream bytes (mp3).
        """
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
            logger.error(f"Polly failed: {e}")
            raise e

    # Note: Real-time transcription usually is done via WebSocket directly from frontend to AWS Transcribe Streaming.
    # However, if we upload an audio file, we can use StartTranscriptionJob.
    # For a "Service", here is a helper to generate a presigned URL or handle small audio uploads.
    
    # Implementing a simple mock for now as realtime usually requires frontend-direct WebSocket for low latency,
    # or a backend WebSocket proxy which is complex to scaffold in one go.
    # We will assume frontend sends audio blob to an endpoint.
    
    # Placeholder for Transcribe if needed for file-based uploads
    def start_transcription(self, file_uri: str, job_name: str, format: str = "mp3"):
        try:
            self.transcribe_client.start_transcription_job(
                TranscriptionJobName=job_name,
                Media={'MediaFileUri': file_uri},
                MediaFormat=format,
                LanguageCode='en-US'
            )
        except ClientError as e:
            logger.error(f"Transcribe job creation failed: {e}")
            raise e

voice_service = VoiceService()
