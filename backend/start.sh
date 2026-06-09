#!/usr/bin/env bash
# Production start command (Render/Railway). Runs DB migrations, then serves the API.
# The host injects $PORT; default to 8000 for local `bash start.sh` runs.
set -euo pipefail

echo "==> Applying database migrations (alembic upgrade head)"
alembic upgrade head

echo "==> Starting uvicorn on 0.0.0.0:${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
