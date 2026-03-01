import os

from pydantic_settings import BaseSettings

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://supplier_user:supplier_pass@localhost:5432/supplier_portal"
    ANTHROPIC_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440  # 24 hours
    MAGIC_LINK_EXPIRATION_MINUTES: int = 15
    UPLOAD_DIR: str = os.path.join(_BASE_DIR, "uploads")
    ADMIN_PASSWORD: str = "doorbell-ops-2024"
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "onboarding@resend.dev"

    model_config = {"env_file": ".env"}


settings = Settings()
