# MOVEGRID

MOVEGRID is a full-stack movement game for everyone: missions create reasons to move, QR checkpoints verify the real-world action, and MOVE points power streaks, squads, leaderboards, and rewards.

## Repository

- `frontend/` — Next.js 16, React, TypeScript, Tailwind, Lucide, responsive web app.
- `mobile/` — Expo (React Native) Android-first native client.
- `packages/api-client/` — Shared TypeScript API client for web and mobile.
- `backend/` — Python 3.12+, FastAPI, Pydantic, SQLAlchemy 2 async, Alembic, PostgreSQL, JWT.

## Run locally

1. Start PostgreSQL and create a database named `movegrid`.
2. `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
3. Copy `backend/.env.example` to `backend/.env`, then run `alembic upgrade head`.
4. Start the API with `uvicorn app.main:app --reload --port 8000`.
5. In another terminal, run `pnpm install` from the root, then `pnpm dev`.

Create an account from the app’s **Sign up** screen (or register via `POST /api/v1/auth/register`).

The frontend reads `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).

## Mobile (Android)

1. Copy `mobile/.env.example` to `mobile/.env` (emulator default uses `http://10.0.2.2:8000` to reach local uvicorn).
2. From the repo root: `pnpm install`, then start the backend as above.
3. Run `pnpm mobile:android` (Android Studio emulator or USB device with Expo Go / dev build).

The app uses `EXPO_PUBLIC_API_URL` and the shared `@movegrid/api-client` package.

**Health Connect (steps):** Requires a **development build** — not Expo Go. After `pnpm install`, run `pnpm mobile:android:dev` (installs Health Connect on the device/emulator, then grant **Steps** read access in-app). Pull-to-refresh on **Today** syncs steps to `POST /daily-fitness/steps`.

## Daily Personalized Fitness

- `GET /api/v1/daily-fitness/today` — assign or return today's exercises (auto-expires overdue rows)
- `POST /api/v1/daily-fitness/{assignment_id}/complete` — complete a task and award MOVE from the backend
- `GET /api/v1/daily-fitness/history?limit=50&offset=0` — paged assignment history (completed / expired / assigned)

Every assignment lasts exactly 24 hours (`expires_at = assigned_at + 24h`) and never stays active indefinitely.

## Leaderboards

Rankings are computed on the backend with SQL ordering. Completing a mission or daily fitness task updates MOVE, monthly streak score, team competition points, and rank deltas.

- `GET /api/v1/leaderboard/move?limit=20&offset=0` — members by total MOVE (SQL-paged)
- `GET /api/v1/leaderboard/streak?limit=20&offset=0` — members by monthly streak score (SQL-paged)
- `GET /api/v1/leaderboard/competition?limit=20&offset=0` — teams by competition points (paged)

Authenticated requests include a `me` entry so the current user (or their team) stays highlighted even outside the top N. UI: `/leaderboard`.

## MOVE Reward Store

- `GET /api/v1/rewards` — active rewards catalog
- `GET /api/v1/rewards/{id}` — reward detail
- `POST /api/v1/rewards/{id}/redeem` — spend MOVE (authenticated; cost/stock verified server-side)
- `GET /api/v1/rewards/history?limit=20&offset=0` — paged redemption history for the current user

Redemption deducts MOVE and stock in one transaction. The client never supplies the cost. MOVE is an in-app reward currency — no payment processing.

UI: `/rewards`

## API surface

`/health`, `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/missions`, `/api/v1/missions/history`, `/api/v1/missions/{id}/complete`, `/api/v1/daily-fitness/*`, `/api/v1/leaderboard/move`, `/api/v1/leaderboard/streak`, `/api/v1/leaderboard/competition`, `/api/v1/rewards`, `/api/v1/rewards/{id}/redeem`, `/api/v1/rewards/history`. List/history routes accept `limit` + `offset` for DB paging.
