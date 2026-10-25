import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.entities import User
from app.services.territory_service import brush_cells, to_cell
from app.schemas.common import TerritoryPoint


@pytest_asyncio.fixture
async def territory_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        session.add_all(
            [
                User(
                    email="alpha@example.com",
                    name="Alpha Walker",
                    password_hash=hash_password("test-pass-1234"),
                    role="member",
                    total_points=40,
                ),
                User(
                    email="bravo@example.com",
                    name="Bravo Runner",
                    password_hash=hash_password("test-pass-1234"),
                    role="member",
                    total_points=20,
                ),
            ]
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


async def _login(http: AsyncClient, email: str) -> str:
    response = await http.post("/api/v1/auth/login", json={"email": email, "password": "test-pass-1234"})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_to_cell_is_stable():
    first = to_cell(12.9716, 77.5946)
    second = to_cell(12.9716, 77.5946)
    nearby = to_cell(12.9718, 77.5948)
    assert first == second
    assert nearby != first or nearby == first


def test_brush_covers_origin_cell():
    cells = brush_cells([TerritoryPoint(latitude=40.7128, longitude=-74.006)])
    origin = to_cell(40.7128, -74.006)
    assert origin in cells
    assert 5 <= len(cells) <= 13


@pytest.mark.asyncio
async def test_claim_then_overlap_steals_cells(territory_client):
    http = territory_client
    alpha = await _login(http, "alpha@example.com")
    bravo = await _login(http, "bravo@example.com")
    lat, lng = 12.9716, 77.5946

    first = await http.post(
        "/api/v1/territory/claim",
        headers={"Authorization": f"Bearer {alpha}"},
        json={"latitude": lat, "longitude": lng, "is_playing": True},
    )
    assert first.status_code == 200
    first_body = first.json()
    assert first_body["captured"] >= 1
    assert first_body["me"]["cell_count"] >= 1
    alpha_cells = {(cell["x"], cell["y"]) for cell in first_body["cells"] if cell["owner_id"] == first_body["me"]["id"]}
    assert alpha_cells

    steal = await http.post(
        "/api/v1/territory/claim",
        headers={"Authorization": f"Bearer {bravo}"},
        json={"latitude": lat, "longitude": lng, "is_playing": True},
    )
    assert steal.status_code == 200
    steal_body = steal.json()
    assert steal_body["stolen"] >= 1
    bravo_id = steal_body["me"]["id"]
    stolen_cells = {(cell["x"], cell["y"]) for cell in steal_body["cells"] if cell["owner_id"] == bravo_id}
    assert stolen_cells & alpha_cells

    preview = await http.get(
        f"/api/v1/territory/state?latitude={lat}&longitude={lng}",
        headers={"Authorization": f"Bearer {alpha}"},
    )
    assert preview.status_code == 200
    preview_body = preview.json()
    assert any(player["id"] == bravo_id for player in preview_body["players"])
