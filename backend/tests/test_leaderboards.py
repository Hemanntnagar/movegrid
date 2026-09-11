from datetime import date, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.entities import Competition, Team, User
from app.services.leaderboard_service import refresh_all_leaderboard_ranks
from app.services.progress_service import record_activity_progress


@pytest_asyncio.fixture
async def lb_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    month = f"{date.today().year:04d}-{date.today().month:02d}"
    password = hash_password("test-pass-1234")

    async with session_factory() as session:
        competition = Competition(name="Monthly Move Cup", description="Test cup", is_active=True)
        session.add(competition)
        await session.flush()

        legends = Team(name="Late Night Legends", competition_id=competition.id, competition_points=1000, avatar="initials:LL:#ffd447")
        dashers = Team(name="Park Dashers", competition_id=competition.id, competition_points=800, avatar="initials:PD:#8bd4f4")
        session.add_all([legends, dashers])
        await session.flush()

        session.add_all(
            [
                User(
                    email="alex.morgan@example.com",
                    name="Alex Morgan",
                    password_hash=password,
                    role="member",
                    team_id=legends.id,
                    total_points=1200,
                    streak=5,
                    streak_score=100,
                    streak_month=month,
                    last_activity_date=date.today() - timedelta(days=1),
                    avatar="initials:AM:#f3a8c7",
                ),
                User(
                    email="maya.chen@example.com",
                    name="Maya Chen",
                    password_hash=password,
                    role="member",
                    team_id=legends.id,
                    total_points=2000,
                    streak=10,
                    streak_score=300,
                    streak_month=month,
                    avatar="initials:MC:#ffd447",
                ),
                User(
                    email="sam.rivera@example.com",
                    name="Sam Rivera",
                    password_hash=password,
                    role="member",
                    team_id=dashers.id,
                    total_points=1500,
                    streak=7,
                    streak_score=200,
                    streak_month=month,
                    avatar="initials:SR:#8bd4f4",
                ),
            ]
        )
        await session.flush()
        await refresh_all_leaderboard_ranks(session)
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


async def _login(http: AsyncClient, email="alex.morgan@example.com") -> str:
    response = await http.post("/api/v1/auth/login", json={"email": email, "password": "test-pass-1234"})
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_move_leaderboard_orders_by_total_points(lb_client):
    http, _ = lb_client
    token = await _login(http)
    response = await http.get("/api/v1/leaderboard/move?limit=20", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["board"] == "move"
    names = [entry["name"] for entry in body["entries"]]
    assert names[:3] == ["Maya Chen", "Sam Rivera", "Alex Morgan"]
    assert body["me"]["name"] == "Alex Morgan"
    assert body["me"]["is_current_user"] is True
    assert body["me"]["rank"] == 3
    assert body["entries"][2]["is_current_user"] is True


@pytest.mark.asyncio
async def test_streak_leaderboard_orders_by_highest_streak_days(lb_client):
    http, _ = lb_client
    token = await _login(http)
    response = await http.get("/api/v1/leaderboard/streak", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["board"] == "streak"
    assert body["metric_label"] == "STREAK"
    names = [entry["name"] for entry in body["entries"]]
    assert names[:3] == ["Maya Chen", "Sam Rivera", "Alex Morgan"]
    assert body["entries"][0]["points"] == 10
    assert body["entries"][1]["points"] == 7
    assert body["me"]["points"] == 5


@pytest.mark.asyncio
async def test_competition_leaderboard_orders_teams(lb_client):
    http, _ = lb_client
    token = await _login(http)
    response = await http.get("/api/v1/leaderboard/competition", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["board"] == "competition"
    assert body["entries"][0]["name"] == "Late Night Legends"
    assert body["entries"][0]["is_current_user"] is True
    assert body["me"]["name"] == "Late Night Legends"


@pytest.mark.asyncio
async def test_move_leaderboard_excludes_legacy_demo_accounts(lb_client):
    http, session_factory = lb_client
    async with session_factory() as session:
        session.add(
            User(
                email="legacy.demo@movegrid.demo",
                name="Legacy Demo Mover",
                password_hash=hash_password("test-pass-1234"),
                role="member",
                total_points=99999,
                streak=99,
            )
        )
        await session.commit()

    token = await _login(http)
    response = await http.get("/api/v1/leaderboard/move?limit=20", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    names = [entry["name"] for entry in body["entries"]]
    assert "Legacy Demo Mover" not in names
    assert body["entries"][0]["points"] < 99999


@pytest.mark.asyncio
async def test_activity_updates_rankings_and_team_points(lb_client):
    http, session_factory = lb_client
    token = await _login(http)
    before = await http.get("/api/v1/leaderboard/move", headers={"Authorization": f"Bearer {token}"})
    assert before.json()["me"]["rank"] == 3

    async with session_factory() as session:
        from sqlalchemy import select

        user = (await session.execute(select(User).where(User.email == "alex.morgan@example.com"))).scalar_one()
        await record_activity_progress(session, user, move_awarded=500, active_minutes=10)
        await session.commit()

    after = await http.get("/api/v1/leaderboard/move", headers={"Authorization": f"Bearer {token}"})
    body = after.json()
    assert body["me"]["points"] == 1700
    assert body["me"]["rank"] == 2

    competition = await http.get("/api/v1/leaderboard/competition", headers={"Authorization": f"Bearer {token}"})
    legends = competition.json()["entries"][0]
    assert legends["name"] == "Late Night Legends"
    assert legends["points"] == 1500
