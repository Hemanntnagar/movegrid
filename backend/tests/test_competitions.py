from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.entities import Competition, User


@pytest_asyncio.fixture
async def comp_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    ends_at = datetime.utcnow() + timedelta(days=14)
    async with session_factory() as session:
        user = User(
            email="comp.user@example.com",
            name="Comp User",
            password_hash=hash_password("test-pass-1234"),
            role="member",
            total_points=800,
            streak=5,
        )
        session.add(user)
        session.add(
            Competition(
                name="Open Cup",
                description="Anyone can join",
                eligibility="Open to all members",
                min_points=0,
                min_streak=0,
                is_active=True,
                ends_at=ends_at,
            )
        )
        session.add(
            Competition(
                name="Streak Only",
                description="Needs streak",
                eligibility="10+ day streak",
                min_points=0,
                min_streak=10,
                is_active=True,
                ends_at=ends_at,
            )
        )
        await session.commit()

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_list_competitions_includes_eligibility_and_dates(comp_client):
    http = comp_client
    login = await http.post("/api/v1/auth/login", json={"email": "comp.user@example.com", "password": "test-pass-1234"})
    token = login.json()["access_token"]
    response = await http.get("/api/v1/competitions", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 2
    open_cup = next(item for item in body if item["name"] == "Open Cup")
    assert open_cup["eligibility"] == "Open to all members"
    assert open_cup["eligible"] is True
    assert open_cup["starts_at"]
    assert open_cup["is_participating"] is False


@pytest.mark.asyncio
async def test_participate_respects_eligibility(comp_client):
    http = comp_client
    login = await http.post("/api/v1/auth/login", json={"email": "comp.user@example.com", "password": "test-pass-1234"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    listed = await http.get("/api/v1/competitions", headers=headers)
    open_id = next(item["id"] for item in listed.json() if item["name"] == "Open Cup")
    streak_id = next(item["id"] for item in listed.json() if item["name"] == "Streak Only")

    ok = await http.post(f"/api/v1/competitions/{open_id}/participate", headers=headers)
    assert ok.status_code == 200
    assert ok.json()["status"] == "joined"
    assert ok.json()["competition"]["is_participating"] is True

    blocked = await http.post(f"/api/v1/competitions/{streak_id}/participate", headers=headers)
    assert blocked.status_code == 400


@pytest.mark.asyncio
async def test_create_company_competition(comp_client):
    http = comp_client
    login = await http.post("/api/v1/auth/login", json={"email": "comp.user@example.com", "password": "test-pass-1234"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "company_name": "Nike Fitness",
        "name": "Nike 10K Step Challenge",
        "description": "Compete with movers globally to win exclusive gear.",
        "reward": "$500 Gift Card + Nike Running Shoes",
        "eligibility": "Open to all members",
        "min_points": 0,
        "min_streak": 0,
        "ends_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
    }

    res = await http.post("/api/v1/competitions", json=payload, headers=headers)
    assert res.status_code == 201
    created = res.json()
    assert created["name"] == "Nike 10K Step Challenge"
    assert created["company_name"] == "Nike Fitness"
    assert created["reward"] == "$500 Gift Card + Nike Running Shoes"

    # Verify it shows up in the competition listing
    list_res = await http.get("/api/v1/competitions", headers=headers)
    assert list_res.status_code == 200
    listed_names = [c["name"] for c in list_res.json()]
    assert "Nike 10K Step Challenge" in listed_names
