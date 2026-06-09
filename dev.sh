#!/usr/bin/env bash
# SmartNotes AI — one-shot local launcher.
# Starts the FastAPI backend (:8000) and the Next.js frontend (:3000), waits for the
# frontend to come up, opens it in Chrome, and tears both down on Ctrl+C.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=3000
URL="http://localhost:$FRONTEND_PORT"

backend_pid=""
frontend_pid=""

# True if something is already listening on the given localhost port (checks IPv4 and IPv6).
port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3>&- 3<&-; return 0; }
  (exec 3<>"/dev/tcp/::1/$1")       2>/dev/null && { exec 3>&- 3<&-; return 0; }
  return 1
}

cleanup() {
  echo ""
  echo "› shutting down…"
  [ -n "$frontend_pid" ] && kill "$frontend_pid" 2>/dev/null || true
  [ -n "$backend_pid" ]  && kill "$backend_pid"  2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# --- bootstrap env files (first run) --------------------------------------------------
[ -f "$BACKEND/.env" ]          || { cp "$BACKEND/.env.example" "$BACKEND/.env";          echo "› created backend/.env (set GEMINI_API_KEY for live AI)"; }
[ -f "$FRONTEND/.env.local" ]   || { cp "$FRONTEND/.env.example" "$FRONTEND/.env.local";  echo "› created frontend/.env.local"; }

# --- backend --------------------------------------------------------------------------
if [ ! -d "$BACKEND/.venv" ]; then
  echo "✗ backend/.venv missing — create it and 'pip install -r backend/requirements.txt' first." >&2
  exit 1
fi
# shellcheck disable=SC1091
source "$BACKEND/.venv/bin/activate"

if port_in_use "$BACKEND_PORT"; then
  echo "✗ port $BACKEND_PORT is already in use, and the frontend expects the backend there." >&2
  echo "  Free it (e.g. 'lsof -i :$BACKEND_PORT') and retry." >&2
  exit 1
fi

# Pick the frontend port BEFORE starting the backend: another app may hold :3000 (e.g. Obsidian),
# so we bump to the next free port — and the backend must allow that exact origin via CORS.
while port_in_use "$FRONTEND_PORT"; do
  echo "› port $FRONTEND_PORT is busy, trying $((FRONTEND_PORT + 1))…"
  FRONTEND_PORT=$((FRONTEND_PORT + 1))
done
URL="http://localhost:$FRONTEND_PORT"
# Allow the chosen frontend origin (env overrides the .env CORS_ORIGINS value in pydantic-settings).
export CORS_ORIGINS="http://localhost:$FRONTEND_PORT,http://127.0.0.1:$FRONTEND_PORT"

echo "› applying database migrations…"
( cd "$BACKEND" && alembic upgrade head >/dev/null )

echo "› starting backend on :$BACKEND_PORT (CORS → $URL)…"
( cd "$BACKEND" && exec uvicorn app.main:app --reload --port "$BACKEND_PORT" ) &
backend_pid=$!

# --- frontend -------------------------------------------------------------------------
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "› installing frontend deps (first run)…"
  ( cd "$FRONTEND" && npm install )
fi

echo "› starting frontend on :$FRONTEND_PORT…"
( cd "$FRONTEND" && exec npm run dev -- --port "$FRONTEND_PORT" ) &
frontend_pid=$!

# --- wait for the frontend, then open Chrome ------------------------------------------
echo "› waiting for $URL …"
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "$URL"; then break; fi
  # bail early if either process already died
  kill -0 "$backend_pid" 2>/dev/null  || { echo "✗ backend exited early." >&2; exit 1; }
  kill -0 "$frontend_pid" 2>/dev/null || { echo "✗ frontend exited early." >&2; exit 1; }
  sleep 1
done

CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
if [ -n "$CHROME" ]; then
  echo "› opening $URL in Chrome…"
  "$CHROME" "$URL" >/dev/null 2>&1 &
else
  echo "› Chrome not found — open $URL manually."
fi

echo ""
echo "✓ running.  backend → http://localhost:$BACKEND_PORT   frontend → $URL"
echo "  press Ctrl+C to stop both."

# Keep the script alive until a child exits or the user interrupts.
wait
