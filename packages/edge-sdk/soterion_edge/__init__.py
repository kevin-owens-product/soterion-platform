"""Soterion Edge SDK - Connect any LiDAR sensor to the Soterion cloud platform."""

from .client import SoterionEdgeClient
from .models import PointCloud, TrackObject, SensorConfig
from .processor import EdgeProcessor

__version__ = "0.1.0"
__all__ = ["SoterionEdgeClient", "PointCloud", "TrackObject", "SensorConfig", "EdgeProcessor"]
