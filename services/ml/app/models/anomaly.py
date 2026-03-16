"""Mock anomaly detection model.

Uses deterministic heuristics so responses look realistic without a trained
ONNX model.  In production the ``load()`` method would deserialise an ONNX
session and ``predict()`` would run the real inference graph.
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

from app.schemas import AnomalyPrediction

if TYPE_CHECKING:
    from app.schemas import PointCloudBatch


class AnomalyDetector:
    """Heuristic-based anomaly scorer (Phase-1 mock)."""

    def __init__(self) -> None:
        self._loaded = False
        self.version = "mock-v0.1.0"

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def load(self, path: str = "") -> None:
        """Load model weights.  Currently a no-op stub."""
        # In production: self._session = ort.InferenceSession(path)
        self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def predict(self, batch: PointCloudBatch) -> list[AnomalyPrediction]:
        predictions: list[AnomalyPrediction] = []

        for obj in batch.track_objects:
            speed = math.sqrt(
                obj.velocity.x ** 2 + obj.velocity.y ** 2 + obj.velocity.z ** 2
            )
            dwell = obj.dwell_time_s

            anomaly_type = "normal"
            severity = 1
            confidence = 0.0
            behavior_score = 0.0

            # --- Loitering: high dwell time in one spot -----------------
            if dwell > 120:
                anomaly_type = "loitering"
                severity = min(5, 2 + int(dwell / 180))
                confidence = min(1.0, 0.60 + (dwell - 120) / 600)
                behavior_score = min(100.0, 40.0 + dwell / 6.0)

            # --- Intrusion: high speed in a zone (restricted area) ------
            elif speed > 3.0:
                anomaly_type = "intrusion"
                severity = min(5, 2 + int(speed / 2.5))
                confidence = min(1.0, 0.55 + speed / 20.0)
                behavior_score = min(100.0, 35.0 + speed * 8.0)

            # --- Tailgating: two objects very close, both moving --------
            elif speed > 0.5 and dwell < 5:
                # Simple proxy: fast entry with near-zero dwell suggests
                # someone following right behind an authorised person.
                anomaly_type = "tailgating"
                severity = 2
                confidence = 0.45 + speed / 15.0
                behavior_score = 25.0 + speed * 5.0

            # --- Counter-flow: negative velocity component (mock) -------
            elif obj.velocity.x < -1.0 or obj.velocity.y < -1.0:
                anomaly_type = "counter_flow"
                reverse_speed = abs(min(obj.velocity.x, obj.velocity.y))
                severity = min(4, 1 + int(reverse_speed / 2.0))
                confidence = min(1.0, 0.50 + reverse_speed / 10.0)
                behavior_score = min(100.0, 20.0 + reverse_speed * 12.0)

            # --- Normal behaviour ---------------------------------------
            else:
                anomaly_type = "normal"
                severity = 1
                confidence = max(0.0, 0.90 - speed / 10.0 - dwell / 600.0)
                behavior_score = max(0.0, 10.0 + speed * 2.0 + dwell / 30.0)

            # Crowd-surge is evaluated at batch level (below).
            predictions.append(
                AnomalyPrediction(
                    track_id=obj.track_id,
                    anomaly_type=anomaly_type,
                    severity=severity,
                    confidence=round(min(confidence, 1.0), 4),
                    behavior_score=round(min(behavior_score, 100.0), 2),
                )
            )

        # --- Crowd surge: cluster density across entire batch -----------
        n_tracks = len(batch.track_objects)
        if n_tracks >= 8:
            centroids = [
                (o.centroid.x, o.centroid.y) for o in batch.track_objects
            ]
            spread = self._bounding_box_area(centroids)
            density = n_tracks / max(spread, 1.0)

            if density > 0.5:  # more than 0.5 persons per m^2 in the bbox
                surge_severity = min(5, 2 + int(density))
                surge_confidence = min(1.0, 0.55 + density / 5.0)
                surge_score = min(100.0, 50.0 + density * 15.0)
                predictions.append(
                    AnomalyPrediction(
                        track_id="__crowd__",
                        anomaly_type="crowd_surge",
                        severity=surge_severity,
                        confidence=round(surge_confidence, 4),
                        behavior_score=round(surge_score, 2),
                    )
                )

        return predictions

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _bounding_box_area(points: list[tuple[float, float]]) -> float:
        if len(points) < 2:
            return 1.0
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        width = max(xs) - min(xs)
        height = max(ys) - min(ys)
        return max(width * height, 0.01)
