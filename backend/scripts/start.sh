#!/bin/sh
set -e

# Auto-seed if AUTO_SEED=true (for PR/test environments)
if [ "$AUTO_SEED" = "true" ]; then
  echo "AUTO_SEED enabled — running seed script..."
  python -m scripts.seed
  echo "Seed complete."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
