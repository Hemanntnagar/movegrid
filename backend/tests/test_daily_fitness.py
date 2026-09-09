from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.core.exercise_catalog import SEED_EXERCISES
from app.main import app
from app.models.entities import Challenge, DailyAssignment, Exercise, User, Zone
from app.services import fitness_assignment_service as fitness


@pytest_asyncio.fixture
async def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        session.add_all(
            [
                User(
                    email="demo@movegrid.demo",
                    name="Alex Morgan",
                    password_hash=hash_password("movegrid-demo"),
                    role="member",
                    fitness_level="Beginner",
                    total_points=1000,
                ),
                *[
                    Exercise(
                        name=item["name"],
                        description=item["description"],
                        category=item["category"],
                        difficulty=item["difficulty"],
                        duration_minutes=item["duration_minutes"],
                        target_reps=item["target_reps"],
                        instructions=item["instructions"],
                        points=item["points"],
                        requires_equipment=False,
                        is_active=True,
                    )
                    for item in SEED_EXERCISES
                ],
            ]
        )
        await session.commit()

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as http:
        yield http, session_factory

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_daily_fitness_flow_awards_move(client):
    http, _ = client
    login = await http.post(
        "/api/v1/auth/login",
        json={"email": "demo@movegrid.demo", "password": "movegrid-demo"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_before = await http.get("/api/v1/auth/me", headers=headers)
    assert me_before.status_code == 200
    points_before = me_before.json()["total_points"]

    today = await http.get("/api/v1/daily-fitness/today", headers=headers)
    assert today.status_code == 200
    payload = today.json()
    assert payload["progress"]["total"] == 3
    assert all(item["status"] == "ASSIGNED" for item in payload["assigned"])
    for item in payload["assignments"]:
        assigned_at = datetime.fromisoformat(item["assigned_at"])
        expires_at = datetime.fromisoformat(item["expires_at"])
        assert expires_at - assigned_at == timedelta(hours=24)

    assignment = payload["assigned"][0]
    complete = await http.post(f"/api/v1/daily-fitness/{assignment['id']}/complete", headers=headers)
    assert complete.status_code == 200
    body = complete.json()
    assert body["points_awarded"] == assignment["points"]
    assert body["total_points"] == points_before + assignment["points"]

    me_after = await http.get("/api/v1/auth/me", headers=headers)
    assert me_after.json()["total_points"] == points_before + assignment["points"]

    again = await http.post(f"/api/v1/daily-fitness/{assignment['id']}/complete", headers=headers)
    assert again.status_code == 400


@pytest.mark.asyncio
async def test_expired_assignment_cannot_complete(client):
    http, session_factory = client
    login = await http.post(
        "/api/v1/auth/login",
        json={"email": "demo@movegrid.demo", "password": "movegrid-demo"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    today = await http.get("/api/v1/daily-fitness/today", headers=headers)
    assignment_id = today.json()["assigned"][0]["id"]

    async with session_factory() as session:
        assignment = await session.get(DailyAssignment, assignment_id)
        assignment.expires_at = datetime.utcnow() - timedelta(minutes=1)
        await session.commit()

    expired = await http.post(f"/api/v1/daily-fitness/{assignment_id}/complete", headers=headers)
    assert expired.status_code == 400
    assert "expired" in expired.json()["detail"].lower()


@pytest.mark.asyncio
async def test_expire_due_assignments_helper(client):
    _, session_factory = client
    async with session_factory() as session:
        user = (await session.execute(select(User))).scalars().first()
        exercise = (await session.execute(select(Exercise))).scalars().first()
        past = datetime.utcnow() - timedelta(hours=25)
        row = DailyAssignment(
            user_id=user.id,
            exercise_id=exercise.id,
            assigned_at=past,
            expires_at=past + timedelta(hours=24),
            status="ASSIGNED",
            points=15,
        )
        session.add(row)
        await session.commit()
        count = await fitness.expire_due_assignments(session, user_id=user.id)
        await session.commit()
        await session.refresh(row)
        assert count == 1
        assert row.status == "EXPIRED"


@pytest.mark.asyncio
async def test_sync_steps_and_start_mission(client):
    http, session_factory = client
    login = await http.post(
        "/api/v1/auth/login",
        json={"email": "demo@movegrid.demo", "password": "movegrid-demo"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test sync steps
    res = await http.post("/api/v1/daily-fitness/steps", json={"steps": 1250, "active_minutes": 15}, headers=headers)
    assert res.status_code == 200
    assert res.json()["steps"] == 1250

    me = await http.get("/api/v1/auth/me", headers=headers)
    assert me.json()["steps"] == 1250

    # Test start mission with steps
    async with session_factory() as session:
        zone = Zone(name="Test Zone", description="Test", latitude=0.0, longitude=0.0, qr_token="movegrid-demo")
        session.add(zone)
        await session.commit()
        await session.refresh(zone)

        ch = Challenge(title="10k Step Challenge", description="Hit 10k steps", type="Walk", zone_id=zone.id)
        session.add(ch)
        await session.commit()
        await session.refresh(ch)
        ch_id = ch.id

    start_res = await http.post(f"/api/v1/missions/{ch_id}/start", json={"steps": 1500}, headers=headers)
    assert start_res.status_code == 200
    assert start_res.json()["steps_count"] == 1500

    me_after = await http.get("/api/v1/auth/me", headers=headers)
    assert me_after.json()["steps"] == 1500

