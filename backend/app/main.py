from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.seed import seed_demo_data
from app.api.v1 import api_router

@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with SessionLocal() as session:
            await seed_demo_data(session)
    except Exception:
        # Local frontend demos can run without PostgreSQL configured.
        pass
    yield
    await engine.dispose()

app = FastAPI(title="MOVEGRID API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "movegrid-api"}
