import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Set, Tuple

import httpx
from loguru import logger

from pipeline.config import API_URL, BATCH_SIZE, API_FIELDS
from pipeline.db import upsert_measurements, update_metadata, count_measurements
from pipeline.models import RawMeasurement, CleanedMeasurement, IngestionResult


async def fetch_page(
    client: httpx.AsyncClient,
    offset: int,
    limit: int = BATCH_SIZE,
) -> List[Dict[str, Any]]:
    params = {
        "$select": ", ".join(API_FIELDS),
        "$limit": limit,
        "$offset": offset,
        "$order": "date_start DESC",
    }

    url = f"{API_URL}?{httpx.QueryParams(params)}"
    logger.debug(f"Fetching: {url}")

    try:
        response = await client.get(url, timeout=60.0)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching data: {e}")
        raise
    except httpx.TimeoutException as e:
        logger.error(f"Timeout fetching data: {e}")
        raise
    except Exception as e:
        logger.error(f"Error fetching data: {e}")
        raise


def parse_record(raw: Dict[str, Any]) -> Optional[CleanedMeasurement]:
    try:
        raw_model = RawMeasurement(**raw)

        if not raw_model.wwtp_id or not raw_model.date_start:
            return None

        cleaned = CleanedMeasurement(
            wwtp_id=raw_model.wwtp_id,
            wwtp_jurisdiction=raw_model.wwtp_jurisdiction,
            reporting_jurisdiction=raw_model.reporting_jurisdiction,
            key_plot_id=raw_model.key_plot_id,
            date_start=raw_model.date_start,
            date_end=raw_model.date_end or raw_model.date_start,
            detect_prop_15d=raw_model.detect_prop_15d,
            percentile=raw_model.percentile,
            ptc_15d=raw_model.ptc_15d,
            county_names=raw_model.county_names,
            population_served=raw_model.population_served,
        )
        return cleaned
    except Exception as e:
        logger.warning(f"Failed to parse record: {e} - Data: {raw}")
        return None


def deduplicate_records(records: List[CleanedMeasurement]) -> List[CleanedMeasurement]:
    seen: Set[Tuple[str, str, str]] = set()
    unique_records: List[CleanedMeasurement] = []

    for record in records:
        key = (record.wwtp_id, record.date_start.isoformat(), record.pathogen)
        if key not in seen:
            seen.add(key)
            unique_records.append(record)

    return unique_records


def record_to_tuple(record: CleanedMeasurement) -> Tuple:
    return (
        record.wwtp_id,
        record.wwtp_jurisdiction,
        record.pathogen,
        record.date_start.isoformat(),
        record.date_end.isoformat() if record.date_end else record.date_start.isoformat(),
        record.detect_prop_15d,
        record.percentile,
        record.ptc_15d,
        record.population_served,
        record.county_names,
        datetime.utcnow().isoformat(),
    )


async def run_ingestion() -> IngestionResult:
    result = IngestionResult()
    all_records: List[CleanedMeasurement] = []
    offset = 0

    logger.info("Starting data ingestion from CDC NWSS API")

    async with httpx.AsyncClient() as client:
        while True:
            logger.info(f"Fetching batch at offset {offset}")

            try:
                page_data = await fetch_page(client, offset, BATCH_SIZE)
            except Exception:
                logger.error(f"Failed to fetch page at offset {offset}")
                break

            if not page_data:
                logger.info("No more records to fetch")
                break

            page_records = []
            for raw in page_data:
                parsed = parse_record(raw)
                if parsed:
                    page_records.append(parsed)

            all_records.extend(page_records)
            result.records_fetched += len(page_data)

            logger.info(f"Fetched {len(page_data)} records, parsed {len(page_records)} valid records")

            if len(page_data) < BATCH_SIZE:
                logger.info("Reached end of dataset")
                break

            offset += BATCH_SIZE
            await asyncio.sleep(0.1)

    if all_records:
        logger.info(f"Deduplicating {len(all_records)} records")
        unique_records = deduplicate_records(all_records)
        result.duplicates_filtered = len(all_records) - len(unique_records)
        logger.info(f"Removed {result.duplicates_filtered} duplicates, {len(unique_records)} unique records remain")

        records_tuples = [record_to_tuple(r) for r in unique_records]
        inserted, skipped = upsert_measurements(records_tuples)

        result.records_inserted = inserted
        result.records_skipped = skipped

        total_in_db = count_measurements()
        update_metadata(total_in_db)

        logger.info(
            f"Ingestion complete: {result.records_fetched} fetched, "
            f"{result.records_inserted} inserted, {result.records_skipped} skipped, "
            f"{result.duplicates_filtered} duplicates filtered"
        )
    else:
        logger.warning("No records fetched from API")

    return result


if __name__ == "__main__":
    asyncio.run(run_ingestion())
