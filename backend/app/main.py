from contextlib import asynccontextmanager
from pathlib import Path
import logging

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, inspect, text

from app.api.v1 import api_router
from app.core import database
from app.core.config import settings
from app.core.database import Base
from app.core.seed import seed_bootstrap_data

logger = logging.getLogger("movegrid.api")


def _sync_database_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg"):
        return url.replace("postgresql+asyncpg", "postgresql+psycopg2", 1)
    if url.startswith("sqlite+aiosqlite"):
        return url.replace("sqlite+aiosqlite", "sqlite", 1)
    return url


def _alembic_config() -> Config:
    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "migrations"))
    cfg.set_main_option("sqlalchemy.url", _sync_database_url(settings.database_url))
    return cfg


def _current_alembic_revision(conn) -> str | None:
    inspector = inspect(conn)
    if "alembic_version" not in inspector.get_table_names():
        return None
    row = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
    return row[0] if row else None


def _infer_stamp_revision(conn) -> str | None:
    """Map a create_all-era DB (no alembic_version) onto the closest revision."""
    inspector = inspect(conn)
    tables = set(inspector.get_table_names())
    if "users" not in tables:
        return None

    exercise_cols = (
        {col["name"] for col in inspector.get_columns("exercises")} if "exercises" in tables else set()
    )
    if "tracking_mode" in exercise_cols:
        return "0010_exercise_tracking"
    if "buddy_connections" in tables:
        return "0009_buddy_connections"

    user_cols = {col["name"] for col in inspector.get_columns("users")}
    if "steps" in user_cols:
        return "0008_user_steps"
    if "competitions" in tables:
        return "0007_company_competition_rewards"
    if "user_presence" in tables:
        return "0005_user_presence"
    if "rewards" in tables:
        return "0004_reward_store"
    if "leaderboard_ranks" in tables:
        return "0003_leaderboards"
    if "daily_assignments" in tables:
        return "0002_daily_fitness"
    return "0001_initial"


def _stamp_legacy_database(cfg: Config) -> None:
    engine = create_engine(_sync_database_url(settings.database_url))
    try:
        with engine.connect() as conn:
            if _current_alembic_revision(conn) is not None:
                return
            stamp_to = _infer_stamp_revision(conn)
            if not stamp_to:
                return
            logger.warning("No alembic_version found; stamping existing schema to %s", stamp_to)
        command.stamp(cfg, stamp_to)
    finally:
        engine.dispose()


def _run_migrations() -> None:
    """Stamp legacy DBs if needed, then apply pending Alembic revisions."""
    cfg = _alembic_config()
    _stamp_legacy_database(cfg)
    command.upgrade(cfg, "head")


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        _run_migrations()
    except Exception:
        logger.exception("Alembic upgrade failed; falling back to create_all only")
    async with database.engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with database.SessionLocal() as session:
        await seed_bootstrap_data(session)
    yield
    await database.engine.dispose()


app = FastAPI(title="MOVEGRID API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://([a-z0-9-]+\.)*vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "movegrid-api"}
