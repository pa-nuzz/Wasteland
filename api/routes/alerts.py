from fastapi import APIRouter
from fastapi_cache.decorator import cache
from loguru import logger

from api.config import CACHE_TTL_SECONDS
from api.db import get_alerts
from api.models import AlertsResponse, AlertSite

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=AlertsResponse)
@cache(expire=CACHE_TTL_SECONDS)
async def get_alerts_endpoint():
    """Get critical and elevated sites for the alert banner."""
    logger.info("Fetching alerts (critical and elevated sites)")
    
    alerts = get_alerts()
    
    alert_sites = [AlertSite(**alert) for alert in alerts]
    
    logger.info(f"Retrieved {len(alert_sites)} alerts")
    
    return AlertsResponse(
        alerts=alert_sites,
        total=len(alert_sites),
    )
