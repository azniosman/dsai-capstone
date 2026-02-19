from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from app.services.voice_service import voice_service
from app.auth import get_current_user_optional

router = APIRouter(tags=["voice"])

class TTSRequest(BaseModel):
    text: str
    voice_id: str = "Matthew"

@router.post("/voice/speak")
def text_to_speech(payload: TTSRequest, user=Depends(get_current_user_optional)):
    """Convert text to speech audio (MP3)."""
    try:
        audio_bytes = voice_service.text_to_speech(payload.text, payload.voice_id)
        if not audio_bytes:
            raise HTTPException(status_code=500, detail="Failed to generate speech")
        
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice/transcribe")
def transcribe_audio(file: UploadFile = File(...), user=Depends(get_current_user_optional)):
    """
    Mock endpoint for transcription interaction.
    In production, use WebSocket or direct S3 upload + Transcribe triggers.
    """
    return {"message": "Real-time transcription should use WebSocket. This is a placeholder for file upload flow."}
