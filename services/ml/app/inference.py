"""Inference router -- exposes prediction endpoints."""

from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.anomaly import AnomalyDetector
from app.models.queue_predictor import QueuePredictor
from app.schemas import (
    AnomalyResponse,
    CrowdDensityRequest,
    CrowdDensityResponse,
    CrowdSurgePredictionRequest,
    CrowdSurgePredictionResponse,
    PointCloudBatch,
    QueuePredictionRequest,
    QueuePredictionResponse,
)

router = APIRouter()

# Singleton model instances -- initialised by the startup event in main.py.
anomaly_detector = AnomalyDetector()
queue_predictor = QueuePredictor()


def load_models() -> None:
    """Called once at application startup."""
    anomaly_detector.load(settings.ANOMALY_MODEL_PATH)
    queue_predictor.load(settings.QUEUE_MODEL_PATH)


# ------------------------------------------------------------------
# POST /predict/anomaly
# ------------------------------------------------------------------

@router.post("/predict/anomaly", response_model=AnomalyResponse)
async def predict_anomaly(batch: PointCloudBatch) -> AnomalyResponse:
    if not anomaly_detector.is_loaded:
        raise HTTPException(status_code=503, detail="Anomaly model not loaded")

    t0 = time.perf_counter()
    predictions = anomaly_detector.predict(batch)
    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

    # Optionally filter low-confidence noise.
    filtered = [
        p
        for p in predictions
        if p.confidence >= settings.ANOMALY_CONFIDENCE_THRESHOLD
        or p.anomaly_type == "normal"
    ]

    return AnomalyResponse(predictions=filtered, processing_time_ms=elapsed_ms)


# ------------------------------------------------------------------
# POST /predict/queue
# ------------------------------------------------------------------

@router.post("/predict/queue", response_model=QueuePredictionResponse)
async def predict_queue(req: QueuePredictionRequest) -> QueuePredictionResponse:
    if not queue_predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Queue model not loaded")

    # Derive hour from historical data or default to midday.
    hour = 12
    if req.historical_data:
        hour = req.historical_data[-1].hour

    result = queue_predictor.predict(
        current_depth=req.current_depth,
        current_wait_mins=req.current_wait_mins,
        hour_of_day=hour,
    )

    return QueuePredictionResponse(**result)


# ------------------------------------------------------------------
# POST /predict/density
# ------------------------------------------------------------------

@router.post("/predict/density", response_model=CrowdDensityResponse)
async def predict_density(req: CrowdDensityRequest) -> CrowdDensityResponse:
    # Safe capacity heuristic: ~1.5 persons per m^2 is 100 %.
    safe_capacity = req.area_sqm * 1.5
    density_pct = round(min((req.track_count / max(safe_capacity, 1.0)) * 100, 100.0), 2)

    # Risk level.
    if density_pct >= settings.CROWD_DENSITY_HIGH_RISK * 100:
        risk_level = "critical" if density_pct >= 95 else "high"
    elif density_pct >= settings.CROWD_DENSITY_MEDIUM_RISK * 100:
        risk_level = "medium"
    else:
        risk_level = "low"

    # Trend: simple mock -- increasing when above 60 %, decreasing below 20 %.
    if density_pct > 60:
        trend = "increasing"
    elif density_pct < 20:
        trend = "decreasing"
    else:
        trend = "stable"

    return CrowdDensityResponse(
        density_pct=density_pct,
        risk_level=risk_level,
        predicted_trend=trend,
    )


# ------------------------------------------------------------------
# POST /predict/crowding
# ------------------------------------------------------------------

@router.post("/predict/crowding", response_model=CrowdSurgePredictionResponse)
async def predict_crowding(req: CrowdSurgePredictionRequest) -> CrowdSurgePredictionResponse:
    density = req.current_density_pct
    historical = req.historical_avg_density
    hour = req.hour_of_day

    # Determine if hour is a peak period (7-9am or 4-7pm).
    is_peak_hour = (7 <= hour <= 9) or (16 <= hour <= 19)

    # Trending up: current density exceeds historical average by 15%+
    trending_up = density > (historical + 15)

    # ---- Risk classification heuristic ----

    if density > 85:
        surge_risk = "CRITICAL"
        surge_eta_minutes = 0.0
        confidence = 0.95
        recommended_actions = [
            "Activate emergency flow protocol",
            "Deploy crowd management team",
            "Notify terminal operations",
        ]
        # Already surging -- project continued high density.
        predicted_15m = min(100.0, density + 3)
        predicted_30m = min(100.0, density + 1)

    elif density > 70 and trending_up:
        surge_risk = "HIGH"
        surge_eta_minutes = 10.0 + (85 - density) / 3  # rough ETA scaling
        confidence = 0.82
        recommended_actions = [
            "Open additional screening lanes",
            "Redirect flow to alternate checkpoint",
            "Alert shift supervisor",
        ]
        predicted_15m = min(100.0, density + (density - historical) * 0.6)
        predicted_30m = min(100.0, density + (density - historical) * 1.0)

    elif density > 60 and is_peak_hour:
        surge_risk = "MEDIUM"
        surge_eta_minutes = 15.0 + (85 - density) / 2.5
        confidence = 0.68
        recommended_actions = [
            "Monitor closely",
            "Pre-position staff at bottleneck zones",
        ]
        predicted_15m = min(100.0, density + 5)
        predicted_30m = min(100.0, density + 10)

    else:
        surge_risk = "LOW"
        surge_eta_minutes = None
        confidence = 0.90
        recommended_actions = []
        # Stable or slightly regressing toward historical average.
        drift = (historical - density) * 0.15
        predicted_15m = max(0.0, min(100.0, density + drift))
        predicted_30m = max(0.0, min(100.0, density + drift * 2))

    return CrowdSurgePredictionResponse(
        zone_id=req.zone_id,
        predicted_density_15m=round(predicted_15m, 1),
        predicted_density_30m=round(predicted_30m, 1),
        surge_risk=surge_risk,
        surge_eta_minutes=round(surge_eta_minutes, 1) if surge_eta_minutes is not None else None,
        confidence=round(confidence, 2),
        recommended_actions=recommended_actions,
    )


# ------------------------------------------------------------------
# GET /models/status
# ------------------------------------------------------------------

@router.get("/models/status")
async def models_status() -> dict:
    return {
        "anomaly_detector": {
            "loaded": anomaly_detector.is_loaded,
            "version": anomaly_detector.version,
            "mock_mode": settings.MOCK_MODE,
        },
        "queue_predictor": {
            "loaded": queue_predictor.is_loaded,
            "version": queue_predictor.version,
            "mock_mode": settings.MOCK_MODE,
        },
    }
