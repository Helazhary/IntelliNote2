# ENV_SETUP.md — SmartNotes AI

Phase 2 output. Environment variables, required services, and local dev setup. **Locked after
Phase 2** (per CLAUDE.md). Verified against the scaffold produced in Phase 2.

---

## 1. Required Tooling

| Tool | Version used | Notes |
|---|---|---|
| Python | 3.11+ | backend (FastAPI) |
| Node.js | 20.x | frontend (Next.js 14) |
| npm | 10.x | frontend package manager |

No external service is required at MVP: data lives in a local SQLite file (DEC-001). The only
external dependency is the Anthropic API (Phase 4b), which needs an API key but no provisioning.

---

## 2. Repository Layout (top level)

```
IntelliNote2/
├── backend/     # FastAPI + SQLAlchemy + SQLite
└── frontend/    # Next.js 14 + TypeScript + Tailwind
```

---

## 3. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # fill in values (see §5)
uvicorn app.main:app --reload        # serves http://localhost:8000
```

Verify: `curl http://localhost:8000/health` → `{"status":"ok"}`.
Tests: `pytest` (from `backend/`).

> Database file `smartnotes.db` is created on first run in Phase 4a (migrations via Alembic). The
> Phase 2 skeleton boots without a DB file because route handlers are stubbed.

---

## 4. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local           # fill in values (see §5)
npm run dev                          # serves http://localhost:3100 (DEC-019)
```

Verify: open `http://localhost:3100` → skeleton landing renders.
Tests: `npm run test` (Vitest). Build: `npm run build`.

---

## 5. Environment Variables

### Backend (`backend/.env`) — see `backend/.env.example`

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | `sqlite:///./smartnotes.db` | SQLAlchemy DB URL (DEC-001) |
| `JWT_SECRET` | yes | — (set a long random string) | signs JWT access/refresh tokens (NFR-SEC-02) |
| `JWT_ALGORITHM` | no | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | no | `30` | access-token lifetime (REQ-AUTH-05) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | no | `30` | refresh-token lifetime |
| `GEMINI_API_KEY` | Phase 4b | — | Google Gemini key; **backend only** (NFR-SEC-04, DEC-018) |
| `AI_MODEL_DEFAULT` | no | `gemini-2.5-flash-lite` | default model id for AI calls |
| `AI_MODEL_TRANSFORM` | no | — (uses default) | override model for `/ai/transform` + `/ai/revise` |
| `AI_MODEL_NOTEPILOT` | no | — (uses default) | override model for `/ai/notepilot` |
| `CORS_ORIGINS` | yes | `http://localhost:3100` | comma-separated allowed frontend origins (DEC-019) |

### Frontend (`frontend/.env.local`) — see `frontend/.env.example`

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | yes | `http://localhost:8000` | backend API base URL |

> **Secrets rule (NFR-SEC-04):** only `NEXT_PUBLIC_*` vars reach the browser. `ANTHROPIC_API_KEY`
> and `JWT_SECRET` live exclusively in the backend env and must never be added to the frontend or
> committed. `.env` / `.env.local` are git-ignored.

---

## 6. Running Both Together (local dev)

Two terminals:

```bash
# Terminal 1 — backend
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend && npm run dev
```

Frontend at `http://localhost:3100` talks to backend at `http://localhost:8000`. CORS is
preconfigured for that origin (DEC-019).

---

## 7. Production (Phase 7 reference)

- Frontend → Vercel. Set `NEXT_PUBLIC_API_BASE_URL` to the deployed backend URL.
- Backend → Railway/Render. Set all backend vars; use a managed persistent disk for the SQLite file
  (or migrate to managed Postgres if scaling demands — out of MVP scope).
- Set `CORS_ORIGINS` to the production frontend origin. Generate a strong `JWT_SECRET`.
