import sys
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
from loguru import logger

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.config import CORS_ORIGINS, API_PREFIX, CACHE_TTL_SECONDS
from api.routes import sites, pathogens, alerts
from api.db import get_national_summary, get_health_status
from api.models import NationalSummaryResponse, HealthResponse, TopSite

logger.remove()
logger.add(
    sys.stdout,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
    level="INFO",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    FastAPICache.init(InMemoryBackend(), prefix="wastewatch-cache")
    logger.info("API started with in-memory caching")
    yield
    logger.info("API shutting down")


app = FastAPI(
    title="WasteWatch API",
    description="Public health wastewater surveillance API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sites.router, prefix=API_PREFIX)
app.include_router(pathogens.router, prefix=API_PREFIX)
app.include_router(alerts.router, prefix=API_PREFIX)


@app.get("/", tags=["root"])
async def root():
    return {
        "message": "WasteWatch API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health", response_model=HealthResponse, tags=["health"])
@cache(expire=CACHE_TTL_SECONDS)
async def health_check():
    """Health check endpoint."""
    return get_health_status()


@app.get(f"{API_PREFIX}/summary", response_model=NationalSummaryResponse, tags=["summary"])
@cache(expire=CACHE_TTL_SECONDS)
async def get_summary():
    """Get national summary statistics."""
    logger.info("Fetching national summary")
    
    summary = get_national_summary()
    
    top_sites = [TopSite(**site) for site in summary["top_sites"]]
    
    return NationalSummaryResponse(
        total_sites=summary["total_sites"],
        critical_count=summary["critical_count"],
        risk_breakdown=summary["risk_breakdown"],
        last_data_refresh=summary["last_data_refresh"],
        top_sites=top_sites,
    )
