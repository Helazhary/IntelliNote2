# DEPLOYMENT.md — SmartNotes AI

Phase 7 output. How to deploy SmartNotes AI to production, the env-var reference, redeploy
instructions, and the production smoke test.

**Stack chosen (first-time / MVP, $0, no credit card):**
- **Frontend** → **Vercel** (free).
- **Backend (FastAPI)** → **Render** free web service.
- **Database** → **Render managed Postgres** (free). The app is DB-agnostic; the migration is
  Postgres-compatible (generic SQLAlchemy types only).

> The repo already has a GitHub remote: `https://github.com/Helazhary/IntelliNote2`. Both Vercel and
> Render deploy straight from GitHub — no CLI, no Docker needed.

---

## 0. Files that make this work (already in the repo)

| File | Purpose |
|---|---|
| `render.yaml` | Render Blueprint — provisions the Postgres DB + Python web service, wires `DATABASE_URL`, auto-generates `JWT_SECRET`. |
| `backend/start.sh` | Production start command: `alembic upgrade head` then `uvicorn` on `$PORT`. |
| `backend/requirements.txt` | Adds `psycopg[binary]` (Postgres driver). |
| `backend/app/core/config.py` | Auto-rewrites `postgres://` / `postgresql://` → `postgresql+psycopg://`. |
| `frontend/vercel.json` | Pins the Next.js framework for Vercel. |

---

## 1. What you need before you start (≈5 min)

1. A **GitHub account** with this repo pushed (it already is — but push the latest changes, see §2).
2. A **Vercel account** — sign up at https://vercel.com with "Continue with GitHub". Free, no card.
3. A **Render account** — sign up at https://render.com with "Sign up with GitHub". Free, no card.
4. A **Google Gemini API key**:
   - Go to https://aistudio.google.com/apikey
   - Click **Create API key** → copy it. (Free tier is fine for an MVP.)
   - Keep it somewhere safe — you paste it into Render once, and it never goes in the frontend.

---

## 2. Step 0 — push the deploy configs to GitHub

From the project root:

```bash
git add render.yaml frontend/vercel.json backend/start.sh backend/requirements.txt \
        backend/app/core/config.py backend/.env.example docs/
git commit -m "Phase 7: deployment configs (Render + Vercel)"
git push origin Phase7
```

> You can deploy from the `Phase7` branch, or merge to `main` first and deploy from `main`. The
> steps below let you pick the branch in each dashboard.

---

## 3. Step 1 — deploy the backend on Render (the Blueprint does most of it)

1. Go to the Render Dashboard → **New** → **Blueprint**.
2. Connect your GitHub and pick the **IntelliNote2** repo. Choose the branch (`Phase7` or `main`).
3. Render reads `render.yaml` and shows a plan: **1 web service** (`smartnotes-api`) + **1 Postgres
   database** (`smartnotes-db`). Click **Apply**.
4. Render now builds the backend. `DATABASE_URL` and `JWT_SECRET` are wired/generated automatically.
   It will pause because two vars are marked "set manually":
   - **`GEMINI_API_KEY`** → paste your Gemini key from §1.
   - **`CORS_ORIGINS`** → leave a placeholder for now (e.g. `http://localhost:3100`). You'll fix it
     in §5 once you have the Vercel URL.
5. Wait for the deploy to go green. Open the service URL — it looks like
   **`https://smartnotes-api.onrender.com`**. Visit `https://<that-url>/health` → you should see
   `{"status":"ok"}`.

📋 **Write down your backend URL** — you need it in the next step.

---

## 4. Step 2 — deploy the frontend on Vercel

1. Go to the Vercel Dashboard → **Add New… → Project** → import the **IntelliNote2** repo.
2. **IMPORTANT — set the Root Directory:** in the import screen, set **Root Directory = `frontend`**.
   (The Next.js app lives in `frontend/`, not the repo root.) Framework auto-detects as **Next.js**.
3. Expand **Environment Variables** and add:
   - **Name:** `NEXT_PUBLIC_API_BASE_URL`
   - **Value:** your Render backend URL from §3 (e.g. `https://smartnotes-api.onrender.com`) —
     **no trailing slash.**
4. Click **Deploy**. When it finishes you get a URL like **`https://intellinote2.vercel.app`**.

📋 **Write down your frontend URL** — you need it in the next step.

> ⚠️ `NEXT_PUBLIC_API_BASE_URL` is baked in at **build time**. If you ever change the backend URL,
> you must **redeploy** the frontend for it to take effect.

---

## 5. Step 3 — connect them (fix CORS) and redeploy backend

The backend must allow your real frontend origin, or the browser blocks every API call.

1. Render Dashboard → `smartnotes-api` → **Environment**.
2. Edit **`CORS_ORIGINS`** → set it to your exact Vercel URL from §4, no trailing slash:
   ```
   https://intellinote2.vercel.app
   ```
   (Comma-separate if you want more than one origin.)
3. Save → Render redeploys automatically. Wait for green.

Done. Open your Vercel URL and use the app.

---

## 6. Step 4 — production smoke test

Do these in the browser at your **frontend URL**:

1. **App loads** — the login page renders, no console errors.
2. **Register** — create an account → you land in the workspace.
3. **Create a note** — type a title + content → the save indicator shows **Saved**.
4. **AI formatting** — select text → toolbar action (or run a doc-level preset) → the AI Review
   panel shows output → **Accept** applies it. (Requires the Gemini key from §1.)
5. **NotePilot** — pause typing mid-line → ghost text streams in → **Tab** accepts it.
6. **Export** — export the note as Markdown / HTML / plain text → file downloads.
7. **Reload** — refresh the page → you're still logged in and your note is still there
   (confirms Postgres persistence).

> First request after the backend has been idle ~15 min takes **~50s** to wake (Render free tier
> cold start) — this is normal, not a bug. Subsequent requests are fast.

You (or I, if you paste me the two URLs) can also run a quick API smoke test from a terminal:

```bash
BACKEND=https://smartnotes-api.onrender.com
curl -s $BACKEND/health
curl -s -X POST $BACKEND/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"smoke@test.com","password":"smoke-pass-123"}'
```

---

## 7. Environment variable reference

### Backend (Render — service `smartnotes-api`)

| Variable | Set by | Value |
|---|---|---|
| `DATABASE_URL` | Blueprint (auto) | Internal Postgres URL from `smartnotes-db`. |
| `JWT_SECRET` | Blueprint (auto) | Strong random value generated by Render. |
| `GEMINI_API_KEY` | **you** | Your Google Gemini key (secret, backend-only). |
| `CORS_ORIGINS` | **you** | Your Vercel frontend URL (no trailing slash). |
| `AI_MODEL_DEFAULT` | Blueprint | `gemini-2.5-flash-lite`. |
| `PYTHON_VERSION` | Blueprint | `3.11.5`. |
| `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `AI_MODEL_TRANSFORM`, `AI_MODEL_NOTEPILOT` | optional | Defaults from code are fine; override only if needed. |

### Frontend (Vercel — project `intellinote2`)

| Variable | Set by | Value |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | **you** | Render backend URL, no trailing slash. Build-time only. |

> **Secrets rule (NFR-SEC-04):** `GEMINI_API_KEY` and `JWT_SECRET` live only in the backend env.
> Only `NEXT_PUBLIC_*` vars reach the browser. Verified: the production frontend bundle contains no
> secret values.

---

## 8. Redeploying / making changes

- **Either app, any code change:** push to the deployed branch on GitHub → Vercel and Render both
  **auto-redeploy** on push.
- **Changed the backend URL:** update `NEXT_PUBLIC_API_BASE_URL` in Vercel → **redeploy frontend**
  (build-time var).
- **Added a frontend domain/origin:** update `CORS_ORIGINS` in Render → it redeploys.
- **DB migrations:** `start.sh` runs `alembic upgrade head` on every deploy, so new migrations apply
  automatically.

---

## 9. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| First request hangs ~50s, then works | Render free-tier cold start after idle. Normal. Upgrade the web service to a paid instance to remove it. |
| Browser console: **CORS error** / "blocked by CORS policy" | `CORS_ORIGINS` on Render ≠ your exact Vercel URL. Match it exactly, no trailing slash, then redeploy (§5). |
| API calls 404 / go to `localhost:8000` | `NEXT_PUBLIC_API_BASE_URL` wrong or missing in Vercel. Fix it and **redeploy the frontend**. |
| AI actions return **`502 ai_error`** | `GEMINI_API_KEY` missing/invalid on Render, or out of quota. Re-paste the key (§3). |
| Login works, then everything 401s after a while | Expected when the access token expires; the client auto-refreshes. If it fails outright, `JWT_SECRET` changed between deploys — Render keeps it stable once generated. |
| Data disappeared | Render's **free Postgres is time-limited** (per Render's current policy). For anything beyond an MVP, upgrade the database to a paid plan to keep data permanently. |
| Build fails on Render | Check `PYTHON_VERSION=3.11.5` is set and the build command is `pip install -r requirements.txt` with **Root Directory = `backend`** (the Blueprint sets this). |

---

## 10. Production URLs (fill in after deploy)

| What | URL |
|---|---|
| Frontend (Vercel) | `https://__________.vercel.app` |
| Backend (Render) | `https://__________.onrender.com` |
| Backend health check | `https://__________.onrender.com/health` |

---

## 11. Notes & limitations (MVP)

- Render free web service sleeps after ~15 min idle (cold start on next hit).
- Render free Postgres is time-limited — fine for an MVP/demo; upgrade for permanence.
- Vercel preview deployments get unique URLs; only the production origin is in `CORS_ORIGINS`. Add
  preview origins to `CORS_ORIGINS` if you need API calls from preview builds.
- To move off free tiers later: upgrade the Render web service + database (no code change needed),
  or migrate the backend to Railway with a SQLite/Postgres volume (the app supports both).
