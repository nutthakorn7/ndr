"""
Application configuration settings.
"""
from typing import List, Dict, Optional
from pydantic import BaseSettings, AnyHttpUrl, validator
from pydantic.env_settings import SettingsSourceCallable
import os
import secrets
from datetime import datetime
import json

class Settings(BaseSettings):
    # Application
    PROJECT_NAME: str = "zcrLog"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True  # Changed to True for development
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", secrets.token_urlsafe(32))

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:8080",
        "*"  # Added for development
    ]

    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/zcrlog"
    )
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30

    # ClickHouse
    CLICKHOUSE_HOST: str = os.getenv("CLICKHOUSE_HOST", "localhost")
    CLICKHOUSE_PORT: int = int(os.getenv("CLICKHOUSE_PORT", "8123"))
    CLICKHOUSE_DATABASE: str = os.getenv("CLICKHOUSE_DATABASE", "zcrlog")
    CLICKHOUSE_USER: str = os.getenv("CLICKHOUSE_USER", "default")
    CLICKHOUSE_PASSWORD: str = os.getenv("CLICKHOUSE_PASSWORD", "")

    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_URL: str = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"

    # Logging
    LOG_LEVEL: str = "DEBUG"  # Changed for development
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: str = "logs/zcrlog.log"
    LOG_RETENTION_DAYS: int = 90

    # Collection Service
    COLLECTION_INTERVAL: int = 300  # 5 minutes
    COLLECTION_BATCH_SIZE: int = 1000
    COLLECTION_TIMEOUT: int = 60

    # AI Assistant
    AI_PROVIDER: str = "local"  # "local" or "openai"
    AI_MODEL: str = "llama3.2:3b"
    AI_HOST: str = os.getenv("AI_HOST", "http://localhost:11434")
    AI_MAX_TOKENS: int = 2000
    AI_TEMPERATURE: float = 0.3
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # File paths
    EXPORT_DIR: str = "exports"
    LOGS_DIR: str = "logs"
    TEMPLATES_DIR: str = "templates"

    # Backup Configuration
    BACKUP_ENABLED: bool = True
    BACKUP_INTERVAL_HOURS: int = 24
    BACKUP_RETENTION_DAYS: int = 365

    # Log Sources
    FIREWALL_SOURCES: List[str] = ["firewall1.company.com", "firewall2.company.com"]
    PROXY_SOURCES: List[str] = ["proxy1.company.com", "proxy2.company.com"]
    AD_SOURCES: List[str] = ["dc1.company.com", "dc2.company.com"]
    SERVER_SOURCES: List[str] = ["server1.company.com", "server2.company.com"]

    @validator("FIREWALL_SOURCES", "PROXY_SOURCES", "AD_SOURCES", "SERVER_SOURCES", pre=True)
    def parse_list(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            try:
                # Try to parse as JSON string
                return json.loads(v)
            except:
                # Fall back to comma-separated string
                return [i.strip() for i in v.split(",") if i.strip()]
        return v

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"  # Allow extra fields

        @classmethod
        def customise_sources(
            cls,
            init_settings: SettingsSourceCallable,
            env_settings: SettingsSourceCallable,
            file_secret_settings: SettingsSourceCallable,
        ) -> tuple[SettingsSourceCallable, ...]:
            return (
                init_settings,
                env_settings,
                file_secret_settings,
            )

# Create settings instance
settings = Settings(_env_file=None, _env_file_encoding="utf-8", _env_nested_delimiter="__", _env_prefix="APP_", model_config={"extra": "allow"})

# Ensure required directories exist
for directory in [settings.EXPORT_DIR, settings.LOGS_DIR, settings.TEMPLATES_DIR]:
    os.makedirs(directory, exist_ok=True) 