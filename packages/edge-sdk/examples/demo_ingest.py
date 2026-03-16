"""Demo: Generate fake LiDAR data and ingest to Soterion.

Run with:
    python -m examples.demo_ingest

Assumes the Soterion API is running locally on port 3001.
"""

import random
import time
from datetime import datetime, timezone

from soterion_edge import (
    EdgeProcessor,
    Point3D,
    PointCloud,
    SensorConfig,
    SoterionEdgeClient,
)

FRAMES = 10

config = SensorConfig(
    sensor_id="d0000000-0000-4000-8000-000000000001",
    facility_id="a0000000-0000-4000-8000-000000000001",
    api_key="dev-api-key",
    api_url="http://localhost:3001",
    model="Hesai JT128",
)

processor = EdgeProcessor(config.sensor_id, config.facility_id)

with SoterionEdgeClient(config) as client:
    print(f"Connected to {config.api_url}")
    print(f"Sensor: {config.sensor_id}")
    print()

    for i in range(FRAMES):
        # Generate a random point cloud simulating people in a zone
        points = [
            Point3D(
                x=random.uniform(0, 50),
                y=random.uniform(0, 30),
                z=random.uniform(0, 2.5),
            )
            for _ in range(random.randint(50, 200))
        ]

        cloud = PointCloud(
            sensor_id=config.sensor_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            points=points,
        )

        batch = processor.process(cloud)

        try:
            receipt = client.ingest(batch)
            print(
                f"[{i + 1}/{FRAMES}] Ingested {receipt.tracks_ingested} tracks "
                f"(receipt: {receipt.receipt_id})"
            )
        except Exception as e:
            print(f"[{i + 1}/{FRAMES}] Failed: {e}")

        time.sleep(1)

    print()
    print("Demo complete!")
