from contextlib import asynccontextmanager
from pathlib import Path
import logging

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core import database
from app.core.config import settings
from app.core.database import Base
from app.core.seed import seed_bootstrap_data

logger = logging.getLogger("movegrid.api")


def _run_migrations() -> None:
    """Apply pending Alembic revisions. create_all alone does not add columns."""
    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "migrations"))
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
