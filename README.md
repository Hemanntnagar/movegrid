# MOVEGRID

MOVEGRID is a full-stack campus movement game: missions create reasons to move, QR checkpoints verify the real-world action, and MOVE points power streaks, squads, leaderboards, and rewards.

## Repository

- `frontend/` — Next.js 16, React, TypeScript, Tailwind, Lucide, responsive student/admin prototype.
- `backend/` — Python 3.12+, FastAPI, Pydantic, SQLAlchemy 2 async, Alembic, PostgreSQL, JWT.

## Run locally

1. Start PostgreSQL and create a database named `movegrid`.
2. `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
3. Copy `backend/.env.example` to `backend/.env`, then run `alembic upgrade head`.
4. Start the API with `uvicorn app.main:app --reload --port 8000`.
5. In another terminal, run `pnpm install` from the root, then `pnpm dev`.

The frontend reads `NEXT_PUBLIC_API_URL`. Its current demo UI intentionally remains usable without a running API so the interaction prototype can be reviewed before seeding a database.

## API surface

`/health`, `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/missions`, `/api/v1/missions/{id}/complete`, `/api/v1/leaderboard`, `/api/v1/rewards`, and `/api/v1/admin/analytics`.
