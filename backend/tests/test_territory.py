import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.entities import User
from app.services.territory_service import CELL_DEG, cell_center, to_cell
from app.services.territory_shape import append_cells, fill_loop, find_closed_loop


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


def _square_points(origin_lat=12.9716, origin_lng=77.5946, size=4):
    ox, oy = to_cell(origin_lat, origin_lng)
    corners = [
        (ox, oy),
        (ox + size, oy),
        (ox + size, oy + size),
        (ox, oy + size),
        (ox, oy),
    ]
    return [{"latitude": cell_center(x, y)[0], "longitude": cell_center(x, y)[1]} for x, y in corners]


def test_to_cell_is_stable():
    first = to_cell(12.9716, 77.5946)
    second = to_cell(12.9716, 77.5946)
    assert first == second
    assert CELL_DEG > 0


def test_closed_square_fills_interior():
    ring = [(0, 0), (4, 0), (4, 4), (0, 4), (0, 0)]
    trail = append_cells([], ring)
    closed = find_closed_loop(trail)
    assert closed is not None
    filled = fill_loop(closed)
    assert (2, 2) in filled
    assert (0, 0) in filled
    assert len(filled) >= 16


def test_open_path_does_not_close():
    trail = append_cells([], [(0, 0), (4, 0), (4, 4)])
    assert find_closed_loop(trail) is None


@pytest.mark.asyncio
async def test_open_walk_does_not_claim(territory_client):
    http = territory_client
    token = await _login(http, "alpha@example.com")
    lat, lng = 12.9716, 77.5946
    response = await http.post(
        "/api/v1/territory/claim",
        headers={"Authorization": f"Bearer {token}"},
        json={"latitude": lat, "longitude": lng, "is_playing": True},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["closed"] is False
    assert body["captured"] == 0
    assert body["trail"]


@pytest.mark.asyncio
async def test_closing_a_shape_claims_the_inside(territory_client):
    http = territory_client
    token = await _login(http, "alpha@example.com")
    points = _square_points()
    response = await http.post(
        "/api/v1/territory/claim",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "latitude": points[-1]["latitude"],
            "longitude": points[-1]["longitude"],
            "trail": points[:-1],
            "is_playing": True,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["closed"] is True
    assert body["captured"] >= 16
    assert body["me"]["cell_count"] >= 16


@pytest.mark.asyncio
async def test_closed_overlap_steals_interior(territory_client):
    http = territory_client
    alpha = await _login(http, "alpha@example.com")
    bravo = await _login(http, "bravo@example.com")
    points = _square_points()

    first = await http.post(
        "/api/v1/territory/claim",
        headers={"Authorization": f"Bearer {alpha}"},
        json={
            "latitude": points[-1]["latitude"],
            "longitude": points[-1]["longitude"],
            "trail": points[:-1],
            "is_playing": True,
        },
    )
    assert first.json()["closed"] is True
    alpha_id = first.json()["me"]["id"]
    alpha_cells = {(cell["x"], cell["y"]) for cell in first.json()["cells"] if cell["owner_id"] == alpha_id}

    steal = await http.post(
        "/api/v1/territory/claim",
        headers={"Authorization": f"Bearer {bravo}"},
        json={
            "latitude": points[-1]["latitude"],
            "longitude": points[-1]["longitude"],
            "trail": points[:-1],
            "is_playing": True,
        },
    )
    steal_body = steal.json()
    assert steal_body["closed"] is True
    assert steal_body["stolen"] >= 1
    bravo_id = steal_body["me"]["id"]
    stolen = {(cell["x"], cell["y"]) for cell in steal_body["cells"] if cell["owner_id"] == bravo_id}
    assert stolen & alpha_cells
