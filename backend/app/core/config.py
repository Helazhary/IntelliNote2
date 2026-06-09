"""Application configuration loaded from environment (see docs/ENV_SETUP.md)."""
import logging

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# The insecure development fallback for JWT_SECRET; running with this in production lets anyone forge
# tokens (NFR-SEC-02/04). Surfaced via a startup warning below.
_DEFAULT_JWT_SECRET = "dev-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "sqlite:///./smartnotes.db"

    @field_validator("DATABASE_URL")
    @classmethod
    def _normalize_db_url(cls, v: str) -> str:
        """Normalize managed-Postgres URLs to the psycopg (v3) driver.

        Hosts like Render/Railway hand out `postgres://` or `postgresql://` URLs, which
        SQLAlchemy would route to psycopg2. We ship psycopg 3, so rewrite both forms to
        `postgresql+psycopg://`. SQLite URLs (local dev/tests) pass through untouched.
        """
        if v.startswith("postgres://"):
            v = "postgresql://" + v[len("postgres://") :]
        if v.startswith("postgresql://"):
            v = "postgresql+psycopg://" + v[len("postgresql://") :]
        return v

    # Auth (JWT + bcrypt) — REQ-AUTH-04/05, NFR-SEC-02
    JWT_SECRET: str = _DEFAULT_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # AI — provider: Google Gemini (DEC-018). Backend-only secret (NFR-SEC-04).
    GEMINI_API_KEY: str = ""

    # Per-feature model routing. Empty override falls back to AI_MODEL_DEFAULT, so
    # different features can use different models (e.g. transform vs. notepilot).
    AI_MODEL_DEFAULT: str = "gemini-2.5-flash-lite"
    AI_MODEL_TRANSFORM: str = ""  # /ai/transform + /ai/revise
    AI_MODEL_NOTEPILOT: str = ""  # /ai/notepilot streaming

    # CORS — frontend origin(s)
    CORS_ORIGINS: str = "http://localhost:3100"

    def model_for(self, task: str) -> str:
        """Resolve the model id for a feature task, falling back to the default."""
        return getattr(self, f"AI_MODEL_{task.upper()}", "") or self.AI_MODEL_DEFAULT


settings = Settings()

if settings.JWT_SECRET == _DEFAULT_JWT_SECRET:
    logging.getLogger("uvicorn.error").warning(
        "JWT_SECRET is the insecure default %r — anyone can forge auth tokens. Set a strong, "
        "random JWT_SECRET via the environment before deploying (NFR-SEC-02/04).",
        _DEFAULT_JWT_SECRET,
    )
