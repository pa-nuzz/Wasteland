from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from fastapi_cache.decorator import cache
from loguru import logger

from api.config import CACHE_TTL_SECONDS
from api.db import get_sites_with_risk_scores, get_site_history, check_site_exists
from api.models import SiteRiskResponse, SiteHistoryResponse, SiteHistoryPoint, ErrorResponse

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("", response_model=List[SiteRiskResponse])
@cache(expire=CACHE_TTL_SECONDS)
async def get_sites(
    pathogen: Optional[str] = Query(None, description="Filter by pathogen (e.g., sars-cov-2)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (critical, elevated, moderate, low)"),
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction/state"),
):
    """Get all monitoring sites with their latest risk scores."""
    logger.info(f"Fetching sites with filters: pathogen={pathogen}, risk_level={risk_level}, jurisdiction={jurisdiction}")
    
    sites = get_sites_with_risk_scores(
        pathogen=pathogen,
        risk_level=risk_level,
        jurisdiction=jurisdiction,
    )
    
    logger.info(f"Retrieved {len(sites)} sites")
    return sites


@router.get("/{wwtp_id}/history", response_model=SiteHistoryResponse)
@cache(expire=CACHE_TTL_SECONDS)
async def get_site_history_endpoint(
    wwtp_id: str,
    pathogen: str = Query(..., description="Pathogen to query (e.g., sars-cov-2)"),
    weeks: int = Query(12, ge=1, le=52, description="Number of weeks of history"),
):
    """Get historical measurements for a specific site."""
    logger.info(f"Fetching history for site {wwtp_id}, pathogen={pathogen}, weeks={weeks}")
    
    if not check_site_exists(wwtp_id, pathogen):
        logger.warning(f"Site {wwtp_id} with pathogen {pathogen} not found")
        raise HTTPException(status_code=404, detail=f"Site {wwtp_id} with pathogen {pathogen} not found")
    
    history = get_site_history(wwtp_id, pathogen, weeks)
    
    history_points = [SiteHistoryPoint(**row) for row in history]
    
    logger.info(f"Retrieved {len(history_points)} history points for {wwtp_id}")
    
    return SiteHistoryResponse(
        wwtp_id=wwtp_id,
        pathogen=pathogen,
        history=history_points,
    )
