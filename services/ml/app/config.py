"""Configuration loaded from environment variables."""

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings sourced from environment variables."""

    HOST: str = os.getenv("ML_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("ML_PORT", "8000"))
    LOG_LEVEL: str = os.getenv("ML_LOG_LEVEL", "info")

    # Model paths (used when real ONNX models are available)
    ANOMALY_MODEL_PATH: str = os.getenv("ANOMALY_MODEL_PATH", "")
    QUEUE_MODEL_PATH: str = os.getenv("QUEUE_MODEL_PATH", "")

    # Feature flags
    MOCK_MODE: bool = os.getenv("ML_MOCK_MODE", "true").lower() == "true"

    # CORS
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")

    # Thresholds
    ANOMALY_CONFIDENCE_THRESHOLD: float = float(
        os.getenv("ANOMALY_CONFIDENCE_THRESHOLD", "0.5")
    )
    CROWD_DENSITY_HIGH_RISK: float = float(
        os.getenv("CROWD_DENSITY_HIGH_RISK", "0.80")
    )
    CROWD_DENSITY_MEDIUM_RISK: float = float(
        os.getenv("CROWD_DENSITY_MEDIUM_RISK", "0.50")
    )


settings = Settings()
