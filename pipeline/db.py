import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Tuple
from loguru import logger

from pipeline.config import DB_PATH


def init_db(db_path: Path = DB_PATH) -> None:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Enable WAL mode for concurrent reads/writes
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA cache_size=-64000")

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wwtp_id TEXT NOT NULL,
            wwtp_jurisdiction TEXT,
            pathogen TEXT NOT NULL,
            date_start TEXT NOT NULL,
            date_end TEXT,
            detect_prop_15d REAL,
            percentile REAL,
            ptc_15d REAL,
            population_served REAL,
            county_names TEXT,
            ingested_at TEXT NOT NULL
        )
        """
    )

    cursor.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_measurement
        ON measurements (wwtp_id, date_start, pathogen)
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_measurements_date
        ON measurements (date_start)
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_measurements_pathogen
        ON measurements (pathogen)
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_measurements_wwtp_pathogen_date
        ON measurements (wwtp_id, pathogen, date_start)
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_measurements_jurisdiction
        ON measurements (wwtp_jurisdiction)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS risk_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wwtp_id TEXT NOT NULL,
            pathogen TEXT NOT NULL,
            scored_at TEXT NOT NULL,
            latest_value REAL,
            rolling_mean REAL,
            rolling_std REAL,
            z_score REAL,
            ptc_15d REAL,
            risk_level TEXT NOT NULL,
            trend TEXT,
            weeks_of_data INTEGER,
            population_served REAL,
            county_names TEXT,
            UNIQUE(wwtp_id, pathogen)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_risk_scores_pathogen
        ON risk_scores (pathogen)
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_risk_scores_risk_level
        ON risk_scores (risk_level)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS metadata (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            last_fetched TIMESTAMP,
            total_records INTEGER DEFAULT 0
        )
        """
    )

    cursor.execute(
        """
        INSERT OR IGNORE INTO metadata (id, last_fetched, total_records)
        VALUES (1, NULL, 0)
        """
    )

    conn.commit()
    conn.close()
    logger.info(f"Database initialized at {db_path}")


def upsert_measurements(records: List[Tuple], db_path: Path = DB_PATH) -> Tuple[int, int]:
    if not records:
        return 0, 0

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    inserted = 0
    skipped = 0

    for record in records:
        try:
            cursor.execute(
                """
                INSERT OR IGNORE INTO measurements
                (wwtp_id, wwtp_jurisdiction, pathogen, date_start, date_end,
                 detect_prop_15d, percentile, ptc_15d, population_served,
                 county_names, ingested_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                record,
            )
            if cursor.rowcount > 0:
                inserted += 1
            else:
                skipped += 1
        except sqlite3.Error as e:
            logger.warning(f"Error inserting record: {e}")
            skipped += 1

    conn.commit()
    conn.close()
    return inserted, skipped


def update_metadata(total_records: int, db_path: Path = DB_PATH) -> None:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE metadata
        SET last_fetched = ?, total_records = ?
        WHERE id = 1
        """,
        (datetime.utcnow().isoformat(), total_records),
    )
    conn.commit()
    conn.close()


def get_last_fetched(db_path: Path = DB_PATH) -> Optional[datetime]:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT last_fetched FROM metadata WHERE id = 1")
    row = cursor.fetchone()
    conn.close()

    if row and row[0]:
        try:
            return datetime.fromisoformat(row[0])
        except (ValueError, TypeError):
            return None
    return None


def get_total_records(db_path: Path = DB_PATH) -> int:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT total_records FROM metadata WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else 0


def count_measurements(db_path: Path = DB_PATH) -> int:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM measurements")
    count = cursor.fetchone()[0]
    conn.close()
    return count
