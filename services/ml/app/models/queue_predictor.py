"""Mock queue-wait predictor.

Uses a simple weighted heuristic that mimics linear-regression behaviour.
In production this would be backed by a trained model (ONNX / sklearn).
"""

from __future__ import annotations

import math


class QueuePredictor:
    """Deterministic queue-wait estimator (Phase-1 mock)."""

    def __init__(self) -> None:
        self._loaded = False
        self.version = "mock-v0.1.0"

        # Coefficients pretending to be a trained linear model.
        # predicted_wait = b0 + b1*depth + b2*current_wait + b3*hour_factor
        self._b0 = 0.5
        self._b1 = 1.8   # each person in queue adds ~1.8 min
        self._b2 = 0.6   # current wait is a strong signal
        self._b3 = 2.0   # hour-of-day multiplier

    def load(self, path: str = "") -> None:
        """Load model weights.  Currently a no-op stub."""
        self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def predict(
        self,
        current_depth: int,
        current_wait_mins: float,
        hour_of_day: int = 12,
    ) -> dict:
        """Return predicted wait time, predicted depth, and confidence.

        The hour-of-day factor models the typical bell-curve of busy hours
        (peak around 12-14, quieter in early morning / late evening).
        """
        # Hour factor: peaks at 13:00, tapers to ~0.3 at midnight.
        hour_factor = 0.3 + 0.7 * math.exp(-0.5 * ((hour_of_day - 13) / 3.5) ** 2)

        predicted_wait = (
            self._b0
            + self._b1 * current_depth
            + self._b2 * current_wait_mins
            + self._b3 * hour_factor
        )
        predicted_wait = round(max(predicted_wait, 0.0), 2)

        # Predicted depth: assume roughly linear growth proportional to wait.
        predicted_depth = max(0, int(current_depth + hour_factor * 2 - 1))

        # Confidence decreases when inputs are extreme / sparse.
        base_conf = 0.85
        if current_depth == 0 and current_wait_mins == 0:
            base_conf = 0.60
        elif current_depth > 30:
            base_conf -= 0.10
        confidence = round(min(max(base_conf * hour_factor + 0.10, 0.0), 1.0), 4)

        return {
            "predicted_wait_mins": predicted_wait,
            "predicted_depth": predicted_depth,
            "confidence": confidence,
        }
