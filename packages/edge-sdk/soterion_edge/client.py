"""HTTP client for the Soterion cloud API."""

from __future__ import annotations

from typing import Any

import httpx

from .models import IngestBatch, IngestReceipt, SensorConfig


class SoterionEdgeClient:
    """Thin HTTP wrapper that ships point-cloud batches to the Soterion cloud."""

    def __init__(self, config: SensorConfig) -> None:
        self.config = config
        self._client = httpx.Client(
            base_url=config.api_url,
            headers={"X-API-Key": config.api_key},
            timeout=10.0,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def ingest(self, batch: IngestBatch) -> IngestReceipt:
        """Send a point-cloud batch to the Soterion cloud."""
        resp = self._client.post(
            "/api/v1/lidar/ingest",
            json=batch.model_dump(),
        )
        resp.raise_for_status()
        return IngestReceipt(**resp.json())

    def heartbeat(self) -> bool:
        """Send a sensor heartbeat; returns *True* if the API is reachable."""
        try:
            resp = self._client.get("/health")
            return resp.status_code == 200
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Lifecycle helpers
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Close the underlying HTTP transport."""
        self._client.close()

    def __enter__(self) -> "SoterionEdgeClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
