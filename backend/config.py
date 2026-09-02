"""
MPLADS Monitor — Application Configuration
==========================================
Loads settings from environment variables / .env file.
All secrets MUST be provided via environment variables in production.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # Database
    database_url: str = Field(
        default="postgresql://mplads_user:mplads_pass@localhost:5432/mplads_db",
        env="DATABASE_URL"
    )

    # API Server
    api_host: str = Field(default="0.0.0.0", env="API_HOST")
    api_port: int = Field(default=8000, env="API_PORT")
    debug: bool = Field(default=True, env="DEBUG")
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        env="CORS_ORIGINS"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    # MPLADS Portal API
    mplads_api_base: str = Field(
        default="https://mplads.mospi.gov.in",
        env="MPLADS_API_BASE"
    )
    mplads_request_timeout: int = Field(default=120, env="MPLADS_REQUEST_TIMEOUT")
    mplads_max_retries: int = Field(default=3, env="MPLADS_MAX_RETRIES")

    # ML Model Settings
    model_version: str = Field(default="1.0.0", env="MODEL_VERSION")
    rules_version: str = Field(default="1.0.0", env="RULES_VERSION")
    isolation_forest_contamination: float = Field(
        default=0.05, env="ISOLATION_FOREST_CONTAMINATION"
    )
    similarity_threshold: float = Field(default=0.75, env="SIMILARITY_THRESHOLD")

    # Risk Score Weights (must sum to 1.0)
    weight_financial: float = Field(default=0.25, env="WEIGHT_FINANCIAL")
    weight_delay: float = Field(default=0.20, env="WEIGHT_DELAY")
    weight_expenditure: float = Field(default=0.20, env="WEIGHT_EXPENDITURE")
    weight_duplicate: float = Field(default=0.15, env="WEIGHT_DUPLICATE")
    weight_peer: float = Field(default=0.10, env="WEIGHT_PEER")
    weight_ml: float = Field(default=0.10, env="WEIGHT_ML")

    # Risk Band Thresholds
    low_max: int = Field(default=24, env="LOW_MAX")
    moderate_max: int = Field(default=49, env="MODERATE_MAX")
    high_max: int = Field(default=74, env="HIGH_MAX")
    # CRITICAL = 75-100

    # Data Paths
    data_raw_dir: Path = Field(
        default=BASE_DIR / "data" / "raw",
        env="DATA_RAW_DIR"
    )
    data_processed_dir: Path = Field(
        default=BASE_DIR / "data" / "processed",
        env="DATA_PROCESSED_DIR"
    )
    model_dir: Path = Field(
        default=BASE_DIR / "ml" / "models",
        env="MODEL_DIR"
    )

    # Security
    secret_key: str = Field(
        default="dev_secret_key_change_in_production",
        env="SECRET_KEY"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    def get_risk_band(self, score: float) -> str:
        """Convert numeric risk score to risk band label."""
        if score <= self.low_max:
            return "LOW"
        elif score <= self.moderate_max:
            return "MODERATE"
        elif score <= self.high_max:
            return "HIGH"
        else:
            return "CRITICAL"


# Global settings instance
settings = Settings()
