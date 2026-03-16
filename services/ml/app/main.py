"""Soterion AI Platform -- ML Inference Service."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.inference import load_models, router as inference_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load ML models; Shutdown: (no-op for now)."""
    load_models()
    yield


app = FastAPI(
    title="Soterion ML Inference Service",
    version="0.1.0",
    description="LiDAR-based anomaly detection, queue prediction, and crowd density inference.",
    lifespan=lifespan,
)

# -- CORS --------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Routers ------------------------------------------------------------------
app.include_router(inference_router, tags=["inference"])


# -- Health check -------------------------------------------------------------
@app.get("/health", tags=["ops"])
async def health() -> dict:
    return {"status": "ok", "service": "ml-inference", "version": app.version}
