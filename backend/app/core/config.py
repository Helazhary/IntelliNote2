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

    # AI — provider: Google Gemini (DEC-018). Backend-only secret (NFR-SEC-04).
    GEMINI_API_KEY: str = ""

    # Per-feature model routing. Empty override falls back to AI_MODEL_DEFAULT, so
    # different features can use different models (e.g. transform vs. notepilot).
    AI_MODEL_DEFAULT: str = "gemini-2.5-flash-lite"
    AI_MODEL_TRANSFORM: str = ""  # /ai/transform + /ai/revise
    AI_MODEL_NOTEPILOT: str = ""  # /ai/notepilot streaming

    # CORS — frontend origin(s)
    CORS_ORIGINS: str = "http://localhost:3000"

    def model_for(self, task: str) -> str:
        """Resolve the model id for a feature task, falling back to the default."""
        return getattr(self, f"AI_MODEL_{task.upper()}", "") or self.AI_MODEL_DEFAULT


settings = Settings()
