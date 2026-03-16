"""Local edge processing pipeline.

Runs on the edge node to convert raw point clouds into tracked objects
before shipping them to the Soterion cloud.
"""

from __future__ import annotations

import math
import uuid
from typing import Dict, List

from .models import IngestBatch, Point3D, PointCloud, TrackObject


class EdgeProcessor:
    """Process raw point clouds into track objects locally on the edge node."""

    def __init__(self, sensor_id: str, facility_id: str) -> None:
        self.sensor_id = sensor_id
        self.facility_id = facility_id
        self._active_tracks: Dict[str, TrackObject] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process(self, cloud: PointCloud) -> IngestBatch:
        """Process a single point-cloud frame into an ingest batch."""
        clusters = self._cluster_points(cloud.points, threshold=1.0)

        tracks: List[TrackObject] = []
        for cluster in clusters:
            centroid = self._compute_centroid(cluster)
            track = TrackObject(
                track_id=str(uuid.uuid4()),
                centroid=centroid,
                classification="PERSON" if centroid.z > 0.5 else "OBJECT",
                velocity_ms=0.0,
                behavior_score=0.0,
                dwell_secs=0,
            )
            tracks.append(track)

        return IngestBatch(
            sensor_id=self.sensor_id,
            facility_id=self.facility_id,
            timestamp=cloud.timestamp,
            points=cloud.points,
            track_objects=tracks,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _cluster_points(
        self, points: List[Point3D], threshold: float
    ) -> List[List[Point3D]]:
        """Simple distance-based clustering (greedy, single-link)."""
        if not points:
            return []

        clusters: List[List[Point3D]] = [[points[0]]]

        for point in points[1:]:
            added = False
            for cluster in clusters:
                center = self._compute_centroid(cluster)
                dist = math.sqrt(
                    (point.x - center.x) ** 2
                    + (point.y - center.y) ** 2
                    + (point.z - center.z) ** 2
                )
                if dist < threshold:
                    cluster.append(point)
                    added = True
                    break
            if not added:
                clusters.append([point])

        return clusters

    @staticmethod
    def _compute_centroid(points: List[Point3D]) -> Point3D:
        """Return the arithmetic mean of a list of points."""
        n = len(points)
        if n == 0:
            return Point3D(x=0, y=0, z=0)
        return Point3D(
            x=sum(p.x for p in points) / n,
            y=sum(p.y for p in points) / n,
            z=sum(p.z for p in points) / n,
        )
