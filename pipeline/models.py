from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


def clean_text(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    return v.replace('\n', '').replace('\r', '').strip()


class RawMeasurement(BaseModel):
    wwtp_id: Optional[str] = None
    wwtp_jurisdiction: Optional[str] = None
    reporting_jurisdiction: Optional[str] = None
    key_plot_id: Optional[str] = None
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    detect_prop_15d: Optional[str] = None
    percentile: Optional[str] = None
    ptc_15d: Optional[str] = None
    county_names: Optional[str] = None
    population_served: Optional[str] = None

    @field_validator("wwtp_jurisdiction", "reporting_jurisdiction", "county_names", mode="before")
    @classmethod
    def clean_newlines(cls, v):
        return clean_text(v)


class CleanedMeasurement(BaseModel):
    wwtp_id: str
    wwtp_jurisdiction: Optional[str] = None
    reporting_jurisdiction: Optional[str] = None
    key_plot_id: Optional[str] = None
    date_start: datetime
    date_end: datetime
    pathogen: str = "sars-cov-2"
    detect_prop_15d: Optional[float] = None
    percentile: Optional[float] = None
    ptc_15d: Optional[float] = None
    county_names: Optional[str] = None
    population_served: Optional[float] = None
    ingested_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("detect_prop_15d", "percentile", "ptc_15d", "population_served", mode="before")
    @classmethod
    def parse_float(cls, v):
        if v is None or v == "" or v == "null":
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None

    @field_validator("date_start", "date_end", mode="before")
    @classmethod
    def parse_datetime(cls, v):
        if v is None or v == "" or v == "null":
            return None
        if isinstance(v, datetime):
            return v
        formats = ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"]
        for fmt in formats:
            try:
                return datetime.strptime(v, fmt)
            except ValueError:
                continue
        raise ValueError(f"Unable to parse datetime: {v}")


class IngestionResult(BaseModel):
    records_fetched: int = 0
    records_inserted: int = 0
    records_skipped: int = 0
    duplicates_filtered: int = 0
