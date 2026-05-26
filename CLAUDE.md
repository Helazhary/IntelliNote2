# SmartNotes AI — Project Rules

---

## Ground Truth Files

These are the authoritative sources of truth for this project. Every agent reads the relevant files before doing anything else.

- `docs/SPEC.md` — full product description and feature definitions
- `docs/REQUIREMENTS.md` — locked requirements (do not change after Phase 1)
- `docs/ARCHITECTURE.md` — locked architecture (do not change after Phase 2)
- `docs/API_CONTRACTS.md` — locked API contracts (do not change after Phase 2)
- `docs/DECISIONS.md` — running log of assumptions, conflicts, and resolution decisions
- `docs/AGENT_LOG.md` — phase status tracker (update at start and end of every phase)

---

## Locked Documents

These documents become read-only once their phase is marked DONE. Do not modify them after that point.

| Document | Locked After |
|---|---|
| `docs/REQUIREMENTS.md` | Phase 1 |
| `docs/ARCHITECTURE.md` | Phase 2 |
| `docs/API_CONTRACTS.md` | Phase 2 |
| `docs/DB_SCHEMA.md` | Phase 2 |
| `docs/COMPONENT_TREE.md` | Phase 2 |

If a locked document needs to change, stop. Log the reason in `docs/DECISIONS.md`, notify the user, and wait for explicit approval before making any change.

---

## Rules Every Agent Must Follow

**Before starting:**
- Read `docs/AGENT_LOG.md` first. Know exactly which phase you are in and what the previous phase produced.
- Read all documents listed under your phase in the Phase → Skill Mapping section below.
- If a previous phase's output is missing or incomplete, do not proceed. Surface the gap to the user.

**While working:**
- Never silently deviate from `API_CONTRACTS.md`, `ARCHITECTURE.md`, or `REQUIREMENTS.md`.
- If a deviation is necessary, log it in the relevant phase notes doc (`FRONTEND_NOTES.md`, `BACKEND_NOTES.md`, etc.) and continue only if the deviation is non-breaking. If it is breaking, stop and surface it to the user.
- Never overwrite user note content without explicit confirmation. This is a product rule, not just a code rule.
- Write tests in the same phase as the feature. Do not defer tests to later phases.
- If context gets stale after a user interruption, re-read `docs/AGENT_LOG.md` before continuing.

**Conflict resolution:**
- If you discover a conflict between two ground truth documents, do not guess which is correct.
- Log the conflict in `docs/DECISIONS.md` with a clear description of the contradiction.
- Notify the user and wait for resolution before continuing.

**Before finishing:**
- Run the validation gate for your phase as defined in `docs/AGENT_LOG.md`.
- Do not mark a phase DONE until every gate condition passes.
- If a gate condition cannot be met, log the blocker in `docs/AGENT_LOG.md` and surface it to the user.
- Update `docs/AGENT_LOG.md` with status DONE and a one-line summary of what was produced.
- Commit all outputs before closing the phase.

---

## Validation Gates

Every phase has a validation gate. Gates are defined in `docs/AGENT_LOG.md` under each phase entry. The gate must fully pass before the phase is marked DONE. A phase with a failing gate is not done — it is blocked. Treat it as blocked, not complete.

---

## Phase → Skill + Document Mapping

### Phase 0 — Spec Lock
- **Skill:** `/ultraplan`
- **Reads:** `docs/SPEC.md`
- **Produces:** `docs/SPEC.md` (finalized), `docs/DECISIONS.md`

### Phase 1 — Requirements
- **Skill:** `/ultraplan` + `senior-architect`
- **Reads:** `docs/SPEC.md`, `docs/DECISIONS.md`
- **Produces:** `docs/REQUIREMENTS.md`, `docs/USER_FLOWS.md`

### Phase 2 — Architecture & Scaffold
- **Skill:** `senior-architect`
- **Reads:** `docs/REQUIREMENTS.md`, `docs/USER_FLOWS.md`
- **Produces:** `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md`, `docs/DB_SCHEMA.md`, `docs/COMPONENT_TREE.md`, `docs/ENV_SETUP.md`, project skeleton

### Phase 3 — Frontend
- **Skill:** `senior-frontend`
- **Reads:** `docs/SPEC.md`, `docs/COMPONENT_TREE.md`, `docs/API_CONTRACTS.md`
- **Produces:** fully styled UI with mocked data, component tests, `docs/FRONTEND_NOTES.md`

### Phase 4a — Backend & Database
- **Skill:** `senior-backend`
- **Reads:** `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md`, `docs/DB_SCHEMA.md`, `docs/ENV_SETUP.md`
- **Produces:** all API routes, database migrations, auth, API tests, `docs/BACKEND_NOTES.md`

### Phase 4b — AI Feature Wiring
- **Skill:** `senior-backend` + `senior-fullstack`
- **Reads:** `docs/SPEC.md`, `docs/REQUIREMENTS.md`, `docs/API_CONTRACTS.md`, `docs/BACKEND_NOTES.md`
- **Produces:** Anthropic integration, NotePilot streaming, all AI endpoints wired, frontend connected to real API, integration tests, `docs/AI_PROMPTS.md`

### Phase 5 — Code Review
- **Skill:** `code-reviewer`
- **Reads:** full codebase, all `docs/` outputs
- **Produces:** `docs/CODE_REVIEW.md`, patched codebase

### Phase 6 — QA & Polish
- **Skill:** `senior-qa`
- **Reads:** `docs/REQUIREMENTS.md`, `docs/USER_FLOWS.md`, full codebase
- **Produces:** `docs/QA_REPORT.md`, `docs/QA_SIGNOFF.md`, resolved bugs, UI polish pass

### Phase 7 — Deployment
- **Skill:** `senior-fullstack`
- **Reads:** `docs/ENV_SETUP.md`, `docs/ARCHITECTURE.md`
- **Produces:** deployed frontend (Vercel), deployed backend (Railway/Render), `docs/DEPLOYMENT.md`, production smoke test

---

## Skills Location

`.claude/skills/` — load the skill listed for your phase before executing any work.

---

## Output Document Index

| Document | Produced In |
|---|---|
| `docs/SPEC.md` | Phase 0 |
| `docs/DECISIONS.md` | Phase 0 (ongoing) |
| `docs/REQUIREMENTS.md` | Phase 1 |
| `docs/USER_FLOWS.md` | Phase 1 |
| `docs/ARCHITECTURE.md` | Phase 2 |
| `docs/API_CONTRACTS.md` | Phase 2 |
| `docs/DB_SCHEMA.md` | Phase 2 |
| `docs/COMPONENT_TREE.md` | Phase 2 |
| `docs/ENV_SETUP.md` | Phase 2 |
| `docs/FRONTEND_NOTES.md` | Phase 3 |
| `docs/BACKEND_NOTES.md` | Phase 4a |
| `docs/AI_PROMPTS.md` | Phase 4b |
| `docs/CODE_REVIEW.md` | Phase 5 |
| `docs/QA_REPORT.md` | Phase 6 |
| `docs/QA_SIGNOFF.md` | Phase 6 |
| `docs/DEPLOYMENT.md` | Phase 7 |

---

## Communication Style

- All output to the user must be concise. Caveman brevity. No padding, no summaries of what you just did.
- If you need to flag something, one sentence. If it needs more, use a bullet list. Never prose paragraphs.
- Web search is permitted when necessary to resolve technical unknowns. Do not search for things already defined in the ground truth files.
