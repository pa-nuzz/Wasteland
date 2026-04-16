#!/usr/bin/env python3
import sys
from datetime import datetime, timedelta
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
from loguru import logger

sys.path.insert(0, str(Path(__file__).parent.parent))

from pipeline.config import REFRESH_INTERVAL_HOURS
from pipeline.db import init_db, get_last_fetched, get_total_records
from pipeline.ingest import run_ingestion, IngestionResult
from pipeline.scorer import run_scoring


logger.remove()
logger.add(
    sys.stdout,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
    level="INFO",
)
logger.add(
    Path(__file__).parent.parent / "data" / "pipeline.log",
    rotation="1 day",
    retention="7 days",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
    level="DEBUG",
)


def on_job_executed(event):
    if event.exception:
        logger.error(f"Job crashed: {event.exception}")
    else:
        logger.info("Job completed successfully")


def on_job_error(event):
    logger.error(f"Job failed: {event.exception}")


def run_ingestion_job() -> IngestionResult:
    logger.info("=" * 60)
    logger.info("Running scheduled ingestion job")
    logger.info("=" * 60)

    start_time = datetime.utcnow()

    try:
        result = asyncio_run_ingestion()
        duration = (datetime.utcnow() - start_time).total_seconds()

        logger.info("-" * 40)
        logger.info(f"Records fetched:    {result.records_fetched}")
        logger.info(f"Records inserted:   {result.records_inserted}")
        logger.info(f"Records skipped:    {result.records_skipped}")
        logger.info(f"Duplicates filtered: {result.duplicates_filtered}")
        logger.info(f"Duration:           {duration:.2f}s")
        logger.info("-" * 40)

        if result.records_inserted > 0 or result.records_fetched > 0:
            logger.info("Running risk scoring engine...")
            scoring_result = run_scoring()
            logger.info(f"Scoring complete: {scoring_result['sites_scored']} sites scored")

        return result
    except Exception as e:
        logger.error(f"Ingestion job failed: {e}")
        raise


def asyncio_run_ingestion():
    import asyncio
    return asyncio.run(run_ingestion())


def should_skip_fetch() -> bool:
    last_fetched = get_last_fetched()

    if last_fetched is None:
        logger.info("No previous fetch found, will run ingestion")
        return False

    hours_since_fetch = (datetime.utcnow() - last_fetched).total_seconds() / 3600
    logger.info(f"Last fetch was {hours_since_fetch:.2f} hours ago")

    if hours_since_fetch < REFRESH_INTERVAL_HOURS:
        logger.info("Data is fresh, skipping fetch")
        return True

    logger.info(f"Data is stale (>{REFRESH_INTERVAL_HOURS} hours), will fetch")
    return False


def get_next_run_time(scheduler: BackgroundScheduler) -> str:
    jobs = scheduler.get_jobs()
    if jobs:
        next_run = jobs[0].next_run_time
        if next_run:
            return next_run.strftime("%Y-%m-%d %H:%M:%S UTC")
    return "Unknown"


def main():
    logger.info("=" * 60)
    logger.info("WasteWatch Pipeline Scheduler Starting")
    logger.info("=" * 60)

    init_db()

    total_records = get_total_records()
    logger.info(f"Database initialized. Current total records: {total_records}")

    scheduler = BackgroundScheduler()
    scheduler.add_listener(on_job_executed, EVENT_JOB_EXECUTED)
    scheduler.add_listener(on_job_error, EVENT_JOB_ERROR)

    skip_initial_fetch = should_skip_fetch()

    if not skip_initial_fetch:
        logger.info("Running initial ingestion...")
        try:
            result = run_ingestion_job()
        except Exception as e:
            logger.error(f"Initial ingestion failed: {e}")
            logger.info("Continuing with scheduler...")
    else:
        logger.info("Skipping initial fetch due to fresh data")

    scheduler.add_job(
        run_ingestion_job,
        trigger=IntervalTrigger(hours=REFRESH_INTERVAL_HOURS),
        id="ingestion_job",
        name="CDC NWSS Data Ingestion",
        replace_existing=True,
    )

    scheduler.start()
    next_run = get_next_run_time(scheduler)

    logger.info("=" * 60)
    logger.info("Scheduler started successfully")
    logger.info(f"Refresh interval:   {REFRESH_INTERVAL_HOURS} hours")
    logger.info(f"Next scheduled run: {next_run}")
    logger.info("=" * 60)
    logger.info("Press Ctrl+C to stop")

    try:
        while True:
            import time
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        logger.info("Shutting down scheduler...")
        scheduler.shutdown()
        logger.info("Scheduler stopped")


if __name__ == "__main__":
    main()
