"""Pydantic models for request and response validation."""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Point-cloud / tracking input
# ---------------------------------------------------------------------------

class Point3D(BaseModel):
    x: float
    y: float
    z: float


class TrackedObject(BaseModel):
    track_id: str
    centroid: Point3D
    classification: str = Field(
        ..., description="Object class: person, vehicle, unknown"
    )
    velocity: Point3D = Field(
        default_factory=lambda: Point3D(x=0.0, y=0.0, z=0.0),
        description="Velocity vector in m/s",
    )
    dwell_time_s: float = Field(
        0.0, description="Time the object has lingered in the current zone (seconds)"
    )


class PointCloudBatch(BaseModel):
    sensor_id: str
    facility_id: str
    zone_id: str
    timestamp: str = Field(..., description="ISO-8601 timestamp")
    points: list[Point3D] = Field(
        default_factory=list, description="Raw 3-D point cloud"
    )
    track_objects: list[TrackedObject] = Field(
        default_factory=list, description="Objects already tracked upstream"
    )


# ---------------------------------------------------------------------------
# Anomaly detection
# ---------------------------------------------------------------------------

class AnomalyPrediction(BaseModel):
    track_id: str
    anomaly_type: str = Field(
        ...,
        description="One of: loitering, intrusion, crowd_surge, tailgating, counter_flow, normal",
    )
    severity: int = Field(..., ge=1, le=5)
    confidence: float = Field(..., ge=0.0, le=1.0)
    behavior_score: float = Field(
        ..., ge=0.0, le=100.0, description="Composite behaviour risk score"
    )


class AnomalyResponse(BaseModel):
    predictions: list[AnomalyPrediction]
    processing_time_ms: float


# ---------------------------------------------------------------------------
# Queue prediction
# ---------------------------------------------------------------------------

class HistoricalDataPoint(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    avg_wait_mins: float
    avg_depth: int


class QueuePredictionRequest(BaseModel):
    zone_id: str
    current_depth: int = Field(..., ge=0)
    current_wait_mins: float = Field(..., ge=0.0)
    historical_data: list[HistoricalDataPoint] = Field(default_factory=list)


class QueuePredictionResponse(BaseModel):
    predicted_wait_mins: float
    predicted_depth: int
    confidence: float = Field(..., ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Crowd density
# ---------------------------------------------------------------------------

class CrowdDensityRequest(BaseModel):
    zone_id: str
    track_count: int = Field(..., ge=0)
    area_sqm: float = Field(..., gt=0.0)


class CrowdDensityResponse(BaseModel):
    density_pct: float = Field(
        ..., ge=0.0, le=100.0, description="Percentage of safe capacity used"
    )
    risk_level: str = Field(
        ..., description="One of: low, medium, high, critical"
    )
    predicted_trend: str = Field(
        ..., description="One of: stable, increasing, decreasing"
    )


# ---------------------------------------------------------------------------
# Crowd surge prediction
# ---------------------------------------------------------------------------

class CrowdSurgePredictionRequest(BaseModel):
    zone_id: str
    current_density_pct: float = Field(..., ge=0.0, le=100.0)
    current_count: int = Field(..., ge=0)
    hour_of_day: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    historical_avg_density: float = Field(
        ..., ge=0.0, le=100.0, description="24h historical average density for this zone"
    )


class CrowdSurgePredictionResponse(BaseModel):
    zone_id: str
    predicted_density_15m: float = Field(
        ..., ge=0.0, le=100.0, description="Predicted density in 15 minutes"
    )
    predicted_density_30m: float = Field(
        ..., ge=0.0, le=100.0, description="Predicted density in 30 minutes"
    )
    surge_risk: str = Field(
        ..., description="One of: LOW, MEDIUM, HIGH, CRITICAL"
    )
    surge_eta_minutes: Optional[float] = Field(
        None, description="Estimated minutes until surge, null if LOW risk"
    )
    confidence: float = Field(..., ge=0.0, le=1.0)
    recommended_actions: List[str] = Field(
        default_factory=list, description="Recommended operator actions based on risk level"
    )
