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

class InterviewTurnResponse(BaseModel):
    transcript: str
    reply_text: str
    audio_base64: str

@router.post("/voice/interview_turn", response_model=InterviewTurnResponse)
async def process_interview_turn(
    audio: UploadFile = File(...), 
    profile_id: Optional[int] = None,
    user=Depends(get_current_user_optional)
):
    """
    End-to-End Voice Interview Turn:
    1. Transcribes uploaded audio (webm/wav)
    2. Sends transcript to Chat/Bedrock API for an interviewer response
    3. Synthesizes the response to speech (MP3)
    4. Returns transcript, text response, and audio bytes (base64)
    """
    import base64
    from app.services.bedrock_service import bedrock_service
    from app.routers.chat import _build_system_prompt
    
    try:
        audio_bytes = await audio.read()
        
        # 1. Transcribe
        # This uses the sync wrapper in voice_service
        # requires VOICE_TRANSCRIBE_BUCKET to be set in env
        bucket = getattr(settings, "voice_transcribe_bucket", "skillbridge-voice-temp")
        file_ext = audio.filename.split('.')[-1] if '.' in audio.filename else 'webm'
        format_map = {'webm': 'webm', 'wav': 'wav', 'mp3': 'mp3', 'ogg': 'ogg'}
        audio_format = format_map.get(file_ext.lower(), 'webm')
        
        transcript = voice_service.transcribe_audio_sync(
            audio_bytes=audio_bytes,
            audio_format=audio_format,
            bucket=bucket,
            timeout_seconds=30
        )
        
        # 2. Generate Response using Bedrock
        # We reuse the chat system prompt logic, simplified for the interviewer persona
        system_prompt = (
            "You are a Senior Tech Recruiter in Singapore conducting a behavioral interview. "
            "Keep your responses concise, conversational, and under 50 words. "
            "Acknowledge the candidate's answer and ask a short relevant follow-up question."
        )
        messages = [{"role": "user", "content": transcript}]
        
        reply_text = bedrock_service.invoke_model(
            system_prompt=system_prompt,
            messages=messages,
            temperature=0.7
        )
        
        # 3. Text to Speech
        audio_out = voice_service.text_to_speech(reply_text, voice_id="Matthew")
        audio_b64 = base64.b64encode(audio_out).decode("utf-8") if audio_out else ""
        
        return InterviewTurnResponse(
            transcript=transcript,
            reply_text=reply_text,
            audio_base64=audio_b64
        )
        
    except Exception as e:
        import logging
        logging.error(f"Voice interview turn failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
