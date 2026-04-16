import sqlite3
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
from loguru import logger

from api.config import DB_PATH


@contextmanager
def get_db_connection(db_path: Path = DB_PATH):
    """Context manager for read-only database connections."""
    conn = None
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        yield conn
    except sqlite3.Error as e:
        logger.error(f"Database error: {e}")
        raise
    finally:
        if conn:
            conn.close()


def get_sites_with_risk_scores(
    pathogen: Optional[str] = None,
    risk_level: Optional[str] = None,
    jurisdiction: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get all sites with their latest risk scores, with optional filtering."""
    # If jurisdiction filter requested, need to join with measurements
    if jurisdiction:
        query = """
            SELECT DISTINCT
                r.wwtp_id,
                r.pathogen,
                r.risk_level,
                r.z_score,
                r.trend,
                r.latest_value,
                r.scored_at,
                r.weeks_of_data,
                r.population_served,
                r.county_names,
                m.wwtp_jurisdiction
            FROM risk_scores r
            JOIN measurements m ON r.wwtp_id = m.wwtp_id AND r.pathogen = m.pathogen
            WHERE m.wwtp_jurisdiction = ?
        """
        params = [jurisdiction]
        if pathogen:
            query += " AND r.pathogen = ?"
            params.append(pathogen)
        if risk_level:
            query += " AND r.risk_level = ?"
            params.append(risk_level)
        query += " ORDER BY r.z_score DESC"
    else:
        query = """
            SELECT 
                wwtp_id,
                pathogen,
                risk_level,
                z_score,
                trend,
                latest_value,
                scored_at,
                weeks_of_data,
                population_served,
                county_names,
                NULL as wwtp_jurisdiction
            FROM risk_scores
            WHERE 1=1
        """
        params = []

        if pathogen:
            query += " AND pathogen = ?"
            params.append(pathogen)
        if risk_level:
            query += " AND risk_level = ?"
            params.append(risk_level)

        query += " ORDER BY z_score DESC"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_site_history(wwtp_id: str, pathogen: str, weeks: int = 12) -> List[Dict[str, Any]]:
    """Get last N weeks of measurements for a specific site."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT 
                m.date_start,
                m.detect_prop_15d,
                m.percentile,
                m.ptc_15d,
                COALESCE(r.risk_level, 'unknown') as risk_level
            FROM measurements m
            LEFT JOIN risk_scores r ON m.wwtp_id = r.wwtp_id AND m.pathogen = r.pathogen
            WHERE m.wwtp_id = ? AND m.pathogen = ?
            ORDER BY m.date_start DESC
            LIMIT ?
            """,
            (wwtp_id, pathogen, weeks),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_national_summary() -> Dict[str, Any]:
    """Get national summary statistics."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as total_sites FROM risk_scores")
        total_sites = cursor.fetchone()["total_sites"]

        cursor.execute("SELECT COUNT(*) as critical_count FROM risk_scores WHERE risk_level = 'critical'")
        critical_count = cursor.fetchone()["critical_count"]

        cursor.execute(
            """
            SELECT pathogen, risk_level, COUNT(*) as count
            FROM risk_scores
            GROUP BY pathogen, risk_level
            """
        )
        risk_breakdown = {}
        for row in cursor.fetchall():
            pathogen = row["pathogen"]
            if pathogen not in risk_breakdown:
                risk_breakdown[pathogen] = {}
            risk_breakdown[pathogen][row["risk_level"]] = row["count"]

        cursor.execute("SELECT last_fetched FROM metadata WHERE id = 1")
        row = cursor.fetchone()
        last_refresh = row["last_fetched"] if row else None

        cursor.execute(
            """
            SELECT 
                r.wwtp_id,
                r.pathogen,
                r.z_score,
                r.risk_level,
                r.latest_value,
                m.wwtp_jurisdiction,
                m.county_names
            FROM risk_scores r
            LEFT JOIN measurements m ON r.wwtp_id = m.wwtp_id AND r.pathogen = m.pathogen
            GROUP BY r.wwtp_id, r.pathogen
            ORDER BY r.z_score DESC
            LIMIT 10
            """
        )
        top_sites = [dict(row) for row in cursor.fetchall()]

        return {
            "total_sites": total_sites,
            "critical_count": critical_count,
            "risk_breakdown": risk_breakdown,
            "last_data_refresh": last_refresh,
            "top_sites": top_sites,
        }


def get_alerts() -> List[Dict[str, Any]]:
    """Get critical and elevated sites for alerts."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT 
                r.wwtp_id,
                r.pathogen,
                r.risk_level,
                r.z_score,
                r.trend,
                r.latest_value,
                r.scored_at,
                m.wwtp_jurisdiction,
                m.population_served,
                m.county_names
            FROM risk_scores r
            LEFT JOIN measurements m ON r.wwtp_id = m.wwtp_id AND r.pathogen = m.pathogen
            JOIN (
                SELECT wwtp_id, pathogen, MAX(date_start) as max_date
                FROM measurements
                GROUP BY wwtp_id, pathogen
            ) latest ON m.wwtp_id = latest.wwtp_id 
                   AND m.pathogen = latest.pathogen 
                   AND m.date_start = latest.max_date
            WHERE r.risk_level IN ('critical', 'elevated')
            ORDER BY r.z_score DESC
            """
        )
        return [dict(row) for row in cursor.fetchall()]


def get_pathogen_summary() -> List[Dict[str, Any]]:
    """Get summary stats per pathogen."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT 
                pathogen,
                COUNT(*) as site_count,
                AVG(latest_value) as avg_detect_prop
            FROM risk_scores
            GROUP BY pathogen
            ORDER BY pathogen
            """
        )
        return [dict(row) for row in cursor.fetchall()]


def get_health_status() -> Dict[str, Any]:
    """Get health check status."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT last_fetched, total_records FROM metadata WHERE id = 1")
        row = cursor.fetchone()

        if row:
            return {
                "status": "ok",
                "db_last_updated": row["last_fetched"],
                "total_records": row["total_records"],
            }
        return {
            "status": "ok",
            "db_last_updated": None,
            "total_records": 0,
        }


def check_site_exists(wwtp_id: str, pathogen: str) -> bool:
    """Check if a site exists in the database."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM measurements WHERE wwtp_id = ? AND pathogen = ? LIMIT 1",
            (wwtp_id, pathogen),
        )
        return cursor.fetchone() is not None
