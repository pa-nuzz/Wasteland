from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SiteRiskResponse(BaseModel):
    wwtp_id: str
    pathogen: str
    risk_level: str
    z_score: Optional[float] = None
    trend: Optional[str] = None
    latest_value: Optional[float] = None
    scored_at: Optional[str] = None
    weeks_of_data: Optional[int] = None
    wwtp_jurisdiction: Optional[str] = None
    population_served: Optional[float] = None
    county_names: Optional[str] = None


class SiteHistoryPoint(BaseModel):
    date_start: str
    detect_prop_15d: Optional[float] = None
    percentile: Optional[float] = None
    ptc_15d: Optional[float] = None
    risk_level: str


class SiteHistoryResponse(BaseModel):
    wwtp_id: str
    pathogen: str
    history: List[SiteHistoryPoint]


class TopSite(BaseModel):
    wwtp_id: str
    pathogen: str
    z_score: Optional[float] = None
    risk_level: str
    latest_value: Optional[float] = None
    wwtp_jurisdiction: Optional[str] = None
    county_names: Optional[str] = None


class NationalSummaryResponse(BaseModel):
    total_sites: int
    critical_count: int
    risk_breakdown: Dict[str, Dict[str, int]]
    last_data_refresh: Optional[str] = None
    top_sites: List[TopSite]
    population_total: Optional[float] = None


class AlertSite(BaseModel):
    wwtp_id: str
    pathogen: str
    risk_level: str
    z_score: Optional[float] = None
    trend: Optional[str] = None
    latest_value: Optional[float] = None
    scored_at: Optional[str] = None
    wwtp_jurisdiction: Optional[str] = None
    population_served: Optional[float] = None
    county_names: Optional[str] = None


class AlertsResponse(BaseModel):
    alerts: List[AlertSite]
    total: int


class PathogenSummary(BaseModel):
    pathogen: str
    site_count: int
    avg_detect_prop: Optional[float] = None


class PathogensResponse(BaseModel):
    pathogens: List[PathogenSummary]


class HealthResponse(BaseModel):
    status: str
    db_last_updated: Optional[str] = None
    total_records: int


class ErrorResponse(BaseModel):
    detail: str
