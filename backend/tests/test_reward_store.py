import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.entities import Reward, User


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
                    email="student@movegrid.demo",
                    name="Alex Morgan",
                    password_hash=hash_password("movegrid-demo"),
                    role="student",
                    total_points=1000,
                ),
                Reward(
                    title="Canteen Voucher",
                    description="Campus canteen credit.",
                    category="Food",
                    points_required=400,
                    stock=5,
                    image="/rewards/canteen.png",
                    active=True,
                ),
                Reward(
                    title="Sold Out Pass",
                    description="No stock left.",
                    category="Events",
                    points_required=100,
                    stock=0,
                    image="/rewards/event-pass.png",
                    active=True,
                ),
                Reward(
                    title="Inactive Gift",
                    description="Hidden from the store.",
                    category="Sponsors",
                    points_required=200,
                    stock=3,
                    image="/rewards/sponsor-gift.png",
                    active=False,
                ),
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


async def _login(http: AsyncClient) -> dict:
    login = await http.post(
        "/api/v1/auth/login",
        json={"email": "student@movegrid.demo", "password": "movegrid-demo"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.asyncio
async def test_list_rewards_only_active(client):
    http, _ = client
    response = await http.get("/api/v1/rewards")
    assert response.status_code == 200
    titles = [item["title"] for item in response.json()]
    assert "Canteen Voucher" in titles
    assert "Sold Out Pass" in titles
    assert "Inactive Gift" not in titles


@pytest.mark.asyncio
async def test_reward_detail_and_history_routes(client):
    http, _ = client
    headers = await _login(http)

    listed = await http.get("/api/v1/rewards")
    reward_id = next(item["id"] for item in listed.json() if item["title"] == "Canteen Voucher")

    detail = await http.get(f"/api/v1/rewards/{reward_id}")
    assert detail.status_code == 200
    assert detail.json()["points_required"] == 400

    history = await http.get("/api/v1/rewards/history", headers=headers)
    assert history.status_code == 200
    assert history.json() == []


@pytest.mark.asyncio
async def test_redeem_deducts_move_and_stock_atomically(client):
    http, session_factory = client
    headers = await _login(http)

    me_before = await http.get("/api/v1/auth/me", headers=headers)
    points_before = me_before.json()["total_points"]

    listed = await http.get("/api/v1/rewards")
    reward = next(item for item in listed.json() if item["title"] == "Canteen Voucher")

    redeem = await http.post(f"/api/v1/rewards/{reward['id']}/redeem", headers=headers)
    assert redeem.status_code == 200
    body = redeem.json()
    assert body["status"] == "redeemed"
    assert body["points_spent"] == 400
    assert body["total_points"] == points_before - 400
    assert body["stock_remaining"] == reward["stock"] - 1

    me_after = await http.get("/api/v1/auth/me", headers=headers)
    assert me_after.json()["total_points"] == points_before - 400

    history = await http.get("/api/v1/rewards/history", headers=headers)
    assert history.status_code == 200
    assert len(history.json()) == 1
    assert history.json()[0]["reward"]["title"] == "Canteen Voucher"
    assert history.json()[0]["status"] == "COMPLETED"

    async with session_factory() as session:
        row = await session.get(Reward, reward["id"])
        assert row.stock == reward["stock"] - 1


@pytest.mark.asyncio
async def test_redeem_rejects_insufficient_move_and_out_of_stock(client):
    http, session_factory = client
    headers = await _login(http)

    async with session_factory() as session:
        user = (
            await session.execute(
                __import__("sqlalchemy").select(User).where(User.email == "student@movegrid.demo")
            )
        ).scalar_one()
        user.total_points = 50
        await session.commit()

    listed = await http.get("/api/v1/rewards")
    voucher = next(item for item in listed.json() if item["title"] == "Canteen Voucher")
    sold_out = next(item for item in listed.json() if item["title"] == "Sold Out Pass")

    poor = await http.post(f"/api/v1/rewards/{voucher['id']}/redeem", headers=headers)
    assert poor.status_code == 400
    assert "MOVE" in poor.json()["detail"]

    empty = await http.post(f"/api/v1/rewards/{sold_out['id']}/redeem", headers=headers)
    assert empty.status_code == 400
    assert "stock" in empty.json()["detail"].lower()

    me = await http.get("/api/v1/auth/me", headers=headers)
    assert me.json()["total_points"] == 50


@pytest.mark.asyncio
async def test_redeem_requires_auth(client):
    http, _ = client
    listed = await http.get("/api/v1/rewards")
    reward_id = listed.json()[0]["id"]
    response = await http.post(f"/api/v1/rewards/{reward_id}/redeem")
    assert response.status_code == 401
