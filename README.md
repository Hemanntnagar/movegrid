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

Demo login: `student@movegrid.demo` / `movegrid-demo`

The frontend reads `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).

## Daily Personalized Fitness

- `GET /api/v1/daily-fitness/today` — assign or return today's exercises (auto-expires overdue rows)
- `POST /api/v1/daily-fitness/{assignment_id}/complete` — complete a task and award MOVE from the backend
- `GET /api/v1/daily-fitness/history` — assignment history including completed and expired

Every assignment lasts exactly 24 hours (`expires_at = assigned_at + 24h`) and never stays active indefinitely.

## Leaderboards

Rankings are computed on the backend with SQL ordering. Completing a mission or daily fitness task updates MOVE, monthly streak score, team competition points, and rank deltas.

- `GET /api/v1/leaderboard/move?limit=20` — students by total MOVE
- `GET /api/v1/leaderboard/streak?limit=20` — students by monthly streak score
- `GET /api/v1/leaderboard/competition?limit=20` — teams by competition points

Authenticated requests include a `me` entry so the current user (or their team) stays highlighted even outside the top N. Student UI: `/leaderboard`.

## MOVE Reward Store

- `GET /api/v1/rewards` — active rewards catalog
- `GET /api/v1/rewards/{id}` — reward detail
- `POST /api/v1/rewards/{id}/redeem` — spend MOVE (authenticated; cost/stock verified server-side)
- `GET /api/v1/rewards/history` — redemption history for the current user

Redemption deducts MOVE and stock in one transaction. The client never supplies the cost. MOVE is an internal campus currency — no payment processing.

Student UI: `/rewards`

## API surface

`/health`, `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/missions`, `/api/v1/missions/{id}/complete`, `/api/v1/daily-fitness/*`, `/api/v1/leaderboard/move`, `/api/v1/leaderboard/streak`, `/api/v1/leaderboard/competition`, `/api/v1/rewards`, `/api/v1/rewards/{id}/redeem`, `/api/v1/rewards/history`, and `/api/v1/admin/analytics`.
