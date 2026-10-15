#!/usr/bin/env python3
"""Profile MOVEGRID sign-in + post-login waterfall timings.

Simulates the web client's current request pattern after login:
  Batch A (page.tsx + AppChrome): me + me(duplicate) + leaderboard + missions
  Batch B (DashboardPath): todayFitness + fitnessHistory

Also measures an optimized pattern for comparison.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import time
from dataclasses import dataclass, field

import httpx

BASE = "http://127.0.0.1:8000/api/v1"


@dataclass
class Timed:
    name: str
    ms: float
    status: int
    ok: bool
    bytes: int = 0


@dataclass
class RunResult:
    label: str
    login_ms: float
    steps: list[Timed] = field(default_factory=list)
    wall_ms: float = 0.0
    critical_path_ms: float = 0.0  # time until interactive dashboard


async def timed_request(
    client: httpx.AsyncClient,
    name: str,
    method: str,
    url: str,
    **kwargs,
) -> Timed:
    t0 = time.perf_counter()
    resp = await client.request(method, url, **kwargs)
    ms = (time.perf_counter() - t0) * 1000
    body = resp.content
    return Timed(name=name, ms=ms, status=resp.status_code, ok=resp.is_success, bytes=len(body))


async def ensure_user(client: httpx.AsyncClient, email: str, password: str) -> None:
    # Try login first; register if needed
    r = await client.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        return
    name = "Profile Bench"
    r = await client.post(
        f"{BASE}/auth/register",
        json={"name": name, "full_name": name, "email": email, "password": password, "fitness_level": "Beginner"},
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"register failed: {r.status_code} {r.text}")


async def run_current_waterfall(client: httpx.AsyncClient, email: str, password: str) -> RunResult:
    """Mirrors frontend: login → store token → parallel me×2+board+missions → parallel today+history."""
    wall0 = time.perf_counter()
    result = RunResult(label="current (web post-login)", login_ms=0)

    t0 = time.perf_counter()
    login = await client.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    result.login_ms = (time.perf_counter() - t0) * 1000
    login.raise_for_status()
    data = login.json()
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    result.steps.append(
        Timed("POST /auth/login", result.login_ms, login.status_code, True, len(login.content))
    )

    # Batch A — as fired today by page.tsx + AppChrome (duplicate /auth/me)
    batch_a_t0 = time.perf_counter()
    batch_a = await asyncio.gather(
        timed_request(client, "GET /auth/me (page)", "GET", f"{BASE}/auth/me", headers=headers),
        timed_request(client, "GET /auth/me (chrome)", "GET", f"{BASE}/auth/me", headers=headers),
        timed_request(client, "GET /leaderboard/move", "GET", f"{BASE}/leaderboard/move?limit=20", headers=headers),
        timed_request(client, "GET /missions", "GET", f"{BASE}/missions"),
    )
    batch_a_ms = (time.perf_counter() - batch_a_t0) * 1000
    result.steps.extend(batch_a)

    # Batch B — DashboardPath (blocks trail UI)
    batch_b_t0 = time.perf_counter()
    batch_b = await asyncio.gather(
        timed_request(client, "GET /daily-fitness/today", "GET", f"{BASE}/daily-fitness/today", headers=headers),
        timed_request(client, "GET /daily-fitness/history", "GET", f"{BASE}/daily-fitness/history?limit=50", headers=headers),
    )
    batch_b_ms = (time.perf_counter() - batch_b_t0) * 1000
    result.steps.extend(batch_b)

    # Critical path: login + max(batch A overlapping with B if sequential batches)
    # Frontend fires A and B from different components nearly simultaneously after mount,
    # so also measure overlapped critical path.
    result.critical_path_ms = result.login_ms + max(batch_a_ms, batch_b_ms)
    # Sequential batch wall (worst case if A then B)
    sequential = result.login_ms + batch_a_ms + batch_b_ms
    result.wall_ms = (time.perf_counter() - wall0) * 1000
    result.steps.append(Timed("_batch_A_wall", batch_a_ms, 0, True))
    result.steps.append(Timed("_batch_B_wall", batch_b_ms, 0, True))
    result.steps.append(Timed("_login+A+B_sequential", sequential, 0, True))
    result.steps.append(Timed("_login+max(A,B)_overlap", result.critical_path_ms, 0, True))
    return result


async def run_optimized_waterfall(client: httpx.AsyncClient, email: str, password: str) -> RunResult:
    """Optimized: use login.user (skip me), parallel essential, defer history."""
    wall0 = time.perf_counter()
    result = RunResult(label="optimized", login_ms=0)

    t0 = time.perf_counter()
    login = await client.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    result.login_ms = (time.perf_counter() - t0) * 1000
    login.raise_for_status()
    data = login.json()
    token = data["access_token"]
    assert data.get("user"), "login must return user"
    headers = {"Authorization": f"Bearer {token}"}
    result.steps.append(
        Timed("POST /auth/login (+user)", result.login_ms, login.status_code, True, len(login.content))
    )

    # Essential for first paint: today + leaderboard + missions (no duplicate me, no history)
    ess_t0 = time.perf_counter()
    essential = await asyncio.gather(
        timed_request(client, "GET /daily-fitness/today", "GET", f"{BASE}/daily-fitness/today", headers=headers),
        timed_request(client, "GET /leaderboard/move", "GET", f"{BASE}/leaderboard/move?limit=20", headers=headers),
        timed_request(client, "GET /missions", "GET", f"{BASE}/missions"),
    )
    ess_ms = (time.perf_counter() - ess_t0) * 1000
    result.steps.extend(essential)

    # Deferred (non-blocking): history after interactive
    hist = await timed_request(
        client, "GET /daily-fitness/history (deferred)", "GET", f"{BASE}/daily-fitness/history?limit=50", headers=headers
    )
    result.steps.append(hist)

    result.critical_path_ms = result.login_ms + ess_ms
    result.wall_ms = (time.perf_counter() - wall0) * 1000
    result.steps.append(Timed("_essential_wall", ess_ms, 0, True))
    result.steps.append(Timed("_login+essential_critical", result.critical_path_ms, 0, True))
    return result


def print_run(run: RunResult) -> None:
    print(f"\n=== {run.label} ===")
    print(f"login: {run.login_ms:.1f} ms | critical_path: {run.critical_path_ms:.1f} ms | wall: {run.wall_ms:.1f} ms")
    for s in run.steps:
        if s.name.startswith("_"):
            print(f"  {s.name}: {s.ms:.1f} ms")
        else:
            print(f"  {s.name}: {s.ms:.1f} ms  status={s.status}  bytes={s.bytes}")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", default="signin.bench@example.com")
    parser.add_argument("--password", default="bench-pass-1234")
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument("--warmup", type=int, default=1)
    args = parser.parse_args()

    async with httpx.AsyncClient(timeout=60.0) as client:
        health = await client.get("http://127.0.0.1:8000/health")
        health.raise_for_status()
        await ensure_user(client, args.email, args.password)

        current_crit: list[float] = []
        opt_crit: list[float] = []
        login_times: list[float] = []
        me_times: list[float] = []
        today_times: list[float] = []
        history_times: list[float] = []
        board_times: list[float] = []
        missions_times: list[float] = []

        for i in range(args.warmup + args.runs):
            cur = await run_current_waterfall(client, args.email, args.password)
            opt = await run_optimized_waterfall(client, args.email, args.password)
            if i < args.warmup:
                print(f"warmup {i+1} done")
                continue
            print_run(cur)
            print_run(opt)
            current_crit.append(cur.critical_path_ms)
            opt_crit.append(opt.critical_path_ms)
            login_times.append(cur.login_ms)
            for s in cur.steps:
                if s.name == "GET /auth/me (page)":
                    me_times.append(s.ms)
                elif s.name == "GET /daily-fitness/today":
                    today_times.append(s.ms)
                elif s.name == "GET /daily-fitness/history":
                    history_times.append(s.ms)
                elif s.name == "GET /leaderboard/move":
                    board_times.append(s.ms)
                elif s.name == "GET /missions":
                    missions_times.append(s.ms)

        def avg(xs: list[float]) -> float:
            return statistics.mean(xs) if xs else 0.0

        summary = {
            "runs": args.runs,
            "avg_login_ms": round(avg(login_times), 1),
            "avg_me_ms": round(avg(me_times), 1),
            "avg_today_ms": round(avg(today_times), 1),
            "avg_history_ms": round(avg(history_times), 1),
            "avg_leaderboard_ms": round(avg(board_times), 1),
            "avg_missions_ms": round(avg(missions_times), 1),
            "avg_current_critical_path_ms": round(avg(current_crit), 1),
            "avg_optimized_critical_path_ms": round(avg(opt_crit), 1),
            "critical_path_improvement_pct": round(
                (1 - avg(opt_crit) / avg(current_crit)) * 100, 1
            )
            if current_crit and avg(current_crit)
            else 0,
            "bottleneck_ranking": sorted(
                [
                    ("login", avg(login_times)),
                    ("auth/me", avg(me_times)),
                    ("daily-fitness/today", avg(today_times)),
                    ("daily-fitness/history", avg(history_times)),
                    ("leaderboard/move", avg(board_times)),
                    ("missions", avg(missions_times)),
                ],
                key=lambda x: -x[1],
            ),
        }
        print("\n======== SUMMARY ========")
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
