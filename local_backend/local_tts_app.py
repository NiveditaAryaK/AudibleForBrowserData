import io
import re
import wave
from contextlib import asynccontextmanager

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from transformers import AutoTokenizer, VitsModel


MODEL_ID = "facebook/mms-tts-eng"
MAX_TEXT_LENGTH = 6000
TARGET_CHUNK_LENGTH = 280
PAUSE_MS = 180


tokenizer: AutoTokenizer | None = None
model: VitsModel | None = None
sample_rate = 16000


class TTSRequest(BaseModel):
    text: str


def split_text(text: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []

    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(sentence) > TARGET_CHUNK_LENGTH:
            parts = re.split(r"(?<=[,;:])\s+", sentence)
        else:
            parts = [sentence]

        for part in parts:
            part = part.strip()
            if not part:
                continue
            candidate = f"{current} {part}".strip()
            if current and len(candidate) > TARGET_CHUNK_LENGTH:
                chunks.append(current)
                current = part
            else:
                current = candidate

    if current:
        chunks.append(current)

    return chunks


def waveform_to_wav_bytes(waveform: np.ndarray, rate: int) -> bytes:
    clipped = np.clip(waveform, -1.0, 1.0)
    pcm = (clipped * 32767).astype(np.int16)
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(rate)
        wav_file.writeframes(pcm.tobytes())

    return buffer.getvalue()


def synthesize(text: str) -> bytes:
    assert tokenizer is not None
    assert model is not None

    trimmed = re.sub(r"\s+", " ", text).strip()
    if not trimmed:
        raise HTTPException(status_code=400, detail="No readable text was provided.")
    if len(trimmed) > MAX_TEXT_LENGTH:
        trimmed = trimmed[:MAX_TEXT_LENGTH]

    chunks = split_text(trimmed)
    if not chunks:
        raise HTTPException(status_code=400, detail="No readable text was found after cleanup.")

    pause_samples = np.zeros(int(sample_rate * (PAUSE_MS / 1000)), dtype=np.float32)
    rendered: list[np.ndarray] = []

    for index, chunk in enumerate(chunks):
        inputs = tokenizer(chunk, return_tensors="pt")
        with torch.inference_mode():
            output = model(**inputs).waveform
        rendered.append(output.squeeze().cpu().numpy().astype(np.float32))
        if index < len(chunks) - 1:
            rendered.append(pause_samples)

    merged = np.concatenate(rendered)
    return waveform_to_wav_bytes(merged, sample_rate)


@asynccontextmanager
async def lifespan(_: FastAPI):
    global tokenizer, model, sample_rate
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = VitsModel.from_pretrained(MODEL_ID)
    model.eval()
    sample_rate = int(model.config.sampling_rate)
    yield


app = FastAPI(title="Browser TTS", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return JSONResponse(
        {
            "message": "Browser TTS server is running.",
            "model": MODEL_ID,
            "max_text_length": MAX_TEXT_LENGTH,
        }
    )


@app.get("/health")
async def health():
    return {"ok": True, "model_loaded": model is not None}


@app.post("/speak")
async def speak(request: TTSRequest):
    audio_bytes = synthesize(request.text)
    return Response(content=audio_bytes, media_type="audio/wav")
