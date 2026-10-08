import os
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from app.core.base import Base
from app.core.config import settings

__all__ = ["Base", "engine", "SessionLocal", "get_db", "use_sqlite_fallback", "create_app_engine"]

def _needs_render_ssl(db_url: str) -> bool:
    """External Render Postgres requires TLS; internal short hostnames do not include render.com."""
    return "render.com" in db_url


def create_app_engine(url: str | None = None) -> AsyncEngine:
    db_url = url or settings.database_url
    if db_url.startswith("sqlite"):
        return create_async_engine(db_url, connect_args={"check_same_thread": False})
    connect_args = {"ssl": True} if _needs_render_ssl(db_url) else {}
    return create_async_engine(db_url, pool_pre_ping=True, connect_args=connect_args)

engine = create_app_engine()
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

def use_sqlite_fallback():
    global engine, SessionLocal
    sqlite_url = "sqlite+aiosqlite:///./movegrid.db"
    engine = create_app_engine(sqlite_url)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session

