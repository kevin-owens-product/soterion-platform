"""Pydantic models for the Soterion Edge SDK."""

from __future__ import annotations

from enum import Enum
from typing import List, Literal

from pydantic import BaseModel, Field


class SensorConfig(BaseModel):
    """Configuration for a LiDAR sensor connected to the Soterion platform."""

    sensor_id: str = Field(..., description="Unique identifier for this sensor")
    facility_id: str = Field(..., description="Facility this sensor belongs to")
    api_key: str = Field(..., description="API key for authenticating with the Soterion cloud")
    api_url: str = Field(
        default="https://api.soterion.io",
        description="Base URL for the Soterion API",
    )
    model: str = Field(default="Generic", description="Sensor model name (e.g. Hesai JT128)")
    fov_degrees: float = Field(default=360.0, description="Horizontal field of view in degrees")
    range_meters: float = Field(default=200.0, description="Maximum detection range in meters")


class Point3D(BaseModel):
    """A single 3-D point in the sensor's coordinate frame."""

    x: float
    y: float
    z: float


class PointCloud(BaseModel):
    """A timestamped collection of 3-D points from a single sensor frame."""

    sensor_id: str
    timestamp: str = Field(..., description="ISO-8601 timestamp of the capture")
    points: List[Point3D] = Field(default_factory=list)


class TrackObject(BaseModel):
    """A tracked object derived from clustered point-cloud data."""

    track_id: str = Field(..., description="UUID for this track")
    centroid: Point3D
    classification: Literal["PERSON", "VEHICLE", "OBJECT", "UNKNOWN"] = "UNKNOWN"
    velocity_ms: float = Field(default=0.0, description="Estimated velocity in m/s")
    behavior_score: float = Field(
        default=0.0,
        description="Anomaly / behavior score (0.0 = normal, 1.0 = highly anomalous)",
    )
    dwell_secs: int = Field(default=0, description="Time in seconds the object has dwelled")


class IngestBatch(BaseModel):
    """Payload sent to the Soterion cloud ingest endpoint."""

    sensor_id: str
    facility_id: str
    timestamp: str
    points: List[Point3D] = Field(default_factory=list)
    track_objects: List[TrackObject] = Field(default_factory=list)


class IngestReceipt(BaseModel):
    """Acknowledgement returned by the Soterion cloud after ingestion."""

    receipt_id: str
    tracks_ingested: int
    processing_queued: bool = True
