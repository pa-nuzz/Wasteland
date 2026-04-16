from fastapi import APIRouter
from fastapi_cache.decorator import cache
from loguru import logger

from api.config import CACHE_TTL_SECONDS
from api.db import get_pathogen_summary
from api.models import PathogensResponse, PathogenSummary

router = APIRouter(prefix="/pathogens", tags=["pathogens"])


@router.get("", response_model=PathogensResponse)
@cache(expire=CACHE_TTL_SECONDS)
async def get_pathogens():
    """Get list of pathogens with site counts and national averages."""
    logger.info("Fetching pathogen summary")
    
    pathogens = get_pathogen_summary()
    
    pathogen_list = [PathogenSummary(**p) for p in pathogens]
    
    logger.info(f"Retrieved {len(pathogen_list)} pathogens")
    
    return PathogensResponse(pathogens=pathogen_list)
