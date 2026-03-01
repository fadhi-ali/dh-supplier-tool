#!/bin/sh
set -e

# Run database migrations
echo "Running Alembic migrations..."
PYTHONPATH=/app python -m alembic upgrade head 2>&1 || {
  echo "Migration failed — stamping baseline at 001 and retrying..."
  PYTHONPATH=/app python -m alembic stamp 001
  PYTHONPATH=/app python -m alembic upgrade head
}
echo "Migrations complete."

# Auto-seed if AUTO_SEED=true (for PR/test environments)
if [ "$AUTO_SEED" = "true" ]; then
  echo "AUTO_SEED enabled — running seed script..."
  python -m scripts.seed || echo "WARNING: Seed failed (non-fatal), continuing..."
  echo "Seed step done."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
