from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core import database
from app.core.config import settings
from app.core.database import Base
from app.core.seed import seed_bootstrap_data

logger = logging.getLogger("movegrid.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
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
