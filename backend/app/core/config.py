"""Application configuration loaded from environment (see docs/ENV_SETUP.md)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "sqlite:///./smartnotes.db"

    # Auth (JWT + bcrypt) — REQ-AUTH-04/05, NFR-SEC-02
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # AI — wired in Phase 4b. Backend-only secret (NFR-SEC-04).
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

    # CORS — frontend origin(s)
    CORS_ORIGINS: str = "http://localhost:3000"


settings = Settings()
