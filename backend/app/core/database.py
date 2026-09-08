import os
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

def create_app_engine(url: str | None = None) -> AsyncEngine:
    db_url = url or settings.database_url
    if db_url.startswith("sqlite"):
        return create_async_engine(db_url, connect_args={"check_same_thread": False})
    return create_async_engine(db_url, pool_pre_ping=True)

engine = create_app_engine()
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

def use_sqlite_fallback():
    global engine, SessionLocal
    sqlite_url = "sqlite+aiosqlite:///./movegrid.db"
    engine = create_app_engine(sqlite_url)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session

