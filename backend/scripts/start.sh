#!/bin/sh
set -e

# Ensure app module is importable
export PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}/app"

# Run database migrations
echo "Running Alembic migrations..."
alembic upgrade head
echo "Migrations complete."

# Auto-seed if AUTO_SEED=true (for PR/test environments)
if [ "$AUTO_SEED" = "true" ]; then
  echo "AUTO_SEED enabled — running seed script..."
  python -m scripts.seed || echo "WARNING: Seed failed (non-fatal), continuing..."
  echo "Seed step done."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
