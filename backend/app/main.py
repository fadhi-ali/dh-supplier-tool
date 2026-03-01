import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router

logger = logging.getLogger("startup")

app = FastAPI(
    title="DH Supplier Self-Service Portal",
    version="0.1.0",
)

cors_origins = ["http://localhost:3000", "http://localhost:3001"]
extra_origins = os.environ.get("CORS_ORIGINS", "")
if extra_origins:
    cors_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
async def _warn_missing_config():
    from app.config import settings

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            "SMTP_USER / SMTP_PASSWORD not configured. "
            "Magic link emails will be logged to the console only."
        )
    if not settings.ANTHROPIC_API_KEY:
        logger.warning(
            "ANTHROPIC_API_KEY not configured. "
            "The AI chat assistant will return 503."
        )
    if settings.SECRET_KEY == "change-me-in-production":
        logger.warning(
            "SECRET_KEY is using the default value. "
            "Change this in production for JWT security."
        )
    if settings.ADMIN_PASSWORD == "doorbell-ops-2024":
        logger.warning(
            "ADMIN_PASSWORD is using the default value. "
            "Change this in production."
        )


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
