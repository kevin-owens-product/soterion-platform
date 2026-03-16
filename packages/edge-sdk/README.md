# Soterion Edge SDK

**Connect any LiDAR sensor to the Soterion cloud platform in 5 lines of code.**

The Soterion Edge SDK runs on edge compute nodes (NVIDIA Jetson, industrial PCs, or any Linux/macOS/Windows host) and handles the full pipeline from raw point-cloud capture to cloud ingestion. It is hardware-agnostic -- bring your own sensor and the SDK takes care of the rest.

## Installation

```bash
pip install soterion-edge
```

## Quick Start

```python
from soterion_edge import SoterionEdgeClient, EdgeProcessor, SensorConfig, PointCloud, Point3D

config = SensorConfig(
    sensor_id="S-001",
    facility_id="f-heathrow-t2",
    api_key="sk_live_...",
    api_url="https://api.soterion.io",
    model="Hesai JT128",
)

processor = EdgeProcessor(config.sensor_id, config.facility_id)

with SoterionEdgeClient(config) as client:
    cloud = PointCloud(
        sensor_id="S-001",
        timestamp="2026-03-16T12:00:00Z",
        points=[Point3D(x=1.0, y=2.0, z=1.5), Point3D(x=1.1, y=2.1, z=1.6)],
    )
    batch = processor.process(cloud)
    receipt = client.ingest(batch)
    print(f"Ingested {receipt.tracks_ingested} tracks")
```

## Supported Sensors

| Manufacturer | Models                        |
|-------------|-------------------------------|
| Hesai       | JT128, XT32, Pandar64         |
| Velodyne    | VLP-16, VLP-32C, Alpha Prime  |
| Ouster      | OS0, OS1, OS2                 |
| Luminar     | Iris, Iris+                   |

The SDK is sensor-agnostic. Any device that produces 3-D point clouds can be integrated by constructing `PointCloud` objects from its output.

## Architecture

```
+-----------+      +------------------+      +------------------+
|  LiDAR    | ---> |  EdgeProcessor   | ---> | SoterionEdge     |
|  Sensor   |      |  (on-device)     |      | Client (HTTPS)   |
+-----------+      +------------------+      +------------------+
                        |                          |
                   clustering &               POST /api/v1/
                   classification             lidar/ingest
                        |                          |
                        v                          v
                   TrackObjects              Soterion Cloud
                   (local)                   (analytics, alerts)
```

## API Reference

### `SensorConfig`

Configuration model for a LiDAR sensor.

| Field          | Type    | Default                    | Description                          |
|---------------|---------|----------------------------|--------------------------------------|
| `sensor_id`   | `str`   | *required*                 | Unique sensor identifier             |
| `facility_id` | `str`   | *required*                 | Facility the sensor belongs to       |
| `api_key`     | `str`   | *required*                 | API key for Soterion cloud           |
| `api_url`     | `str`   | `https://api.soterion.io`  | Base URL of the Soterion API         |
| `model`       | `str`   | `Generic`                  | Sensor model name                    |
| `fov_degrees` | `float` | `360.0`                    | Horizontal field of view (degrees)   |
| `range_meters`| `float` | `200.0`                    | Maximum detection range (meters)     |

### `PointCloud`

A timestamped frame of 3-D points.

| Field       | Type            | Description                    |
|------------|-----------------|--------------------------------|
| `sensor_id`| `str`           | Sensor that produced this cloud|
| `timestamp`| `str`           | ISO-8601 capture timestamp     |
| `points`   | `list[Point3D]` | The raw 3-D points             |

### `TrackObject`

A tracked object derived from clustered points.

| Field             | Type    | Description                                      |
|------------------|---------|--------------------------------------------------|
| `track_id`       | `str`   | UUID for this track                              |
| `centroid`       | `Point3D` | Center of the cluster                          |
| `classification` | `str`   | One of PERSON, VEHICLE, OBJECT, UNKNOWN          |
| `velocity_ms`    | `float` | Estimated velocity (m/s)                         |
| `behavior_score` | `float` | Anomaly score (0.0 normal -- 1.0 anomalous)     |
| `dwell_secs`     | `int`   | How long the object has remained stationary      |

### `EdgeProcessor`

Runs on-device to cluster raw points and produce track objects.

- `EdgeProcessor(sensor_id, facility_id)` -- create a processor bound to a sensor.
- `processor.process(cloud: PointCloud) -> IngestBatch` -- process one frame.

### `SoterionEdgeClient`

HTTPS client that ships batches to the Soterion cloud.

- `SoterionEdgeClient(config: SensorConfig)` -- create a client.
- `client.ingest(batch: IngestBatch) -> IngestReceipt` -- send a batch.
- `client.heartbeat() -> bool` -- check cloud connectivity.
- Supports context-manager protocol (`with SoterionEdgeClient(...) as client:`).

## License

Proprietary -- Soterion Ltd. All rights reserved.
