from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="AI Teaching Assistant - Python Speech & ML Service",
    version="0.1.0",
    description=(
        "Python backend service for AssemblyAI speech processing, "
        "Claude LLM integration, and visual generation"
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranscriptionRequest(BaseModel):
    audio_url: Optional[str] = None
    audio_base64: Optional[str] = None


class TranscriptionResponse(BaseModel):
    transcript: str
    confidence: float
    words_count: int


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        service="python-ml-speech-service",
        timestamp=datetime.utcnow().isoformat(),
    )


@app.post("/api/speech/transcribe", response_model=TranscriptionResponse)
def transcribe_speech(request: TranscriptionRequest):
    if not request.audio_url and not request.audio_base64:
        raise HTTPException(
            status_code=400,
            detail="Either audio_url or audio_base64 must be provided",
        )

    # Stub response representing AssemblyAI transcription pipeline
    return TranscriptionResponse(
        transcript="Explain QuickSort with an example.",
        confidence=0.98,
        words_count=5,
    )
