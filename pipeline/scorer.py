from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import sqlite3
import numpy as np
from loguru import logger

from pipeline.config import DB_PATH


def get_site_data_for_scoring(db_path: Path = DB_PATH) -> List[Tuple[str, str]]:
    """Get all unique (wwtp_id, pathogen) pairs that have data."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT DISTINCT wwtp_id, pathogen
        FROM measurements
        WHERE detect_prop_15d IS NOT NULL
        ORDER BY wwtp_id, pathogen
        """
    )
    results = cursor.fetchall()
    conn.close()
    return results


def get_last_n_weeks(
    wwtp_id: str,
    pathogen: str,
    n: int = 10,
    db_path: Path = DB_PATH,
) -> List[Dict[str, Any]]:
    """Get last N weeks of measurements for a site, ordered by date."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT date_start, detect_prop_15d, ptc_15d, population_served, county_names
        FROM measurements
        WHERE wwtp_id = ? AND pathogen = ? AND detect_prop_15d IS NOT NULL
        ORDER BY date_start DESC
        LIMIT ?
        """,
        (wwtp_id, pathogen, n),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in reversed(rows)]


def compute_trend(detect_values: List[float]) -> str:
    """Compute trend using linear regression on last 3 values."""
    if len(detect_values) < 3:
        return "stable"

    y = np.array(detect_values[-3:], dtype=float)
    x = np.arange(len(y))

    try:
        slope = np.polyfit(x, y, 1)[0]
        if slope > 0.05:
            return "rising"
        elif slope < -0.05:
            return "falling"
        else:
            return "stable"
    except (np.linalg.LinAlgError, ValueError):
        return "stable"


def compute_z_score(latest: float, values: List[float]) -> float:
    """Compute z-score of latest value against rolling mean and std."""
    if len(values) < 2:
        return 0.0

    arr = np.array(values, dtype=float)
    mean = np.mean(arr)
    std = np.std(arr, ddof=1)

    if std == 0 or np.isnan(std) or np.isinf(std):
        return 0.0

    z = (latest - mean) / std
    return float(z)


def determine_risk_level(z_score: float, ptc_15d: Optional[float]) -> str:
    """Determine risk level based on z-score and ptc_15d."""
    ptc = ptc_15d if ptc_15d is not None else float('-inf')

    if z_score >= 2.0 or ptc >= 100:
        return "critical"
    elif z_score >= 1.0 or ptc >= 50:
        return "elevated"
    elif z_score >= 0:
        return "moderate"
    else:
        return "low"


def calculate_risk_score(
    wwtp_id: str,
    pathogen: str,
    db_path: Path = DB_PATH,
) -> Optional[Dict[str, Any]]:
    """Calculate risk score for a single site."""
    data = get_last_n_weeks(wwtp_id, pathogen, n=10, db_path=db_path)

    if not data:
        return None

    weeks_of_data = len(data)
    detect_values = [d["detect_prop_15d"] for d in data if d["detect_prop_15d"] is not None]

    # Get latest measurement for metadata
    latest_measurement = data[-1]
    population_served = latest_measurement.get("population_served")
    county_names = latest_measurement.get("county_names")

    if len(detect_values) < 3:
        latest_value = detect_values[-1] if detect_values else None
        latest_ptc = latest_measurement.get("ptc_15d")

        return {
            "wwtp_id": wwtp_id,
            "pathogen": pathogen,
            "scored_at": datetime.utcnow().isoformat(),
            "latest_value": latest_value,
            "rolling_mean": None,
            "rolling_std": None,
            "z_score": None,
            "ptc_15d": latest_ptc,
            "risk_level": "insufficient_data",
            "trend": None,
            "weeks_of_data": weeks_of_data,
            "population_served": population_served,
            "county_names": county_names,
        }

    latest_value = detect_values[-1]
    historical_values = detect_values[:-1] if len(detect_values) > 1 else detect_values
    latest_ptc = latest_measurement.get("ptc_15d")

    z_score = compute_z_score(latest_value, historical_values)
    risk_level = determine_risk_level(z_score, latest_ptc)
    trend = compute_trend(detect_values)

    rolling_mean = float(np.mean(historical_values))
    rolling_std = float(np.std(historical_values, ddof=1)) if len(historical_values) > 1 else 0.0

    return {
        "wwtp_id": wwtp_id,
        "pathogen": pathogen,
        "scored_at": datetime.utcnow().isoformat(),
        "latest_value": latest_value,
        "rolling_mean": rolling_mean,
        "rolling_std": rolling_std,
        "z_score": z_score,
        "ptc_15d": latest_ptc,
        "risk_level": risk_level,
        "trend": trend,
        "weeks_of_data": weeks_of_data,
        "population_served": population_served,
        "county_names": county_names,
    }


def upsert_risk_score(score: Dict[str, Any], db_path: Path = DB_PATH) -> bool:
    """Upsert a risk score into the database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO risk_scores
            (wwtp_id, pathogen, scored_at, latest_value, rolling_mean, rolling_std,
             z_score, ptc_15d, risk_level, trend, weeks_of_data, population_served, county_names)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(wwtp_id, pathogen) DO UPDATE SET
                scored_at = excluded.scored_at,
                latest_value = excluded.latest_value,
                rolling_mean = excluded.rolling_mean,
                rolling_std = excluded.rolling_std,
                z_score = excluded.z_score,
                ptc_15d = excluded.ptc_15d,
                risk_level = excluded.risk_level,
                trend = excluded.trend,
                weeks_of_data = excluded.weeks_of_data,
                population_served = excluded.population_served,
                county_names = excluded.county_names
            """,
            (
                score["wwtp_id"],
                score["pathogen"],
                score["scored_at"],
                score["latest_value"],
                score["rolling_mean"],
                score["rolling_std"],
                score["z_score"],
                score["ptc_15d"],
                score["risk_level"],
                score["trend"],
                score["weeks_of_data"],
                score.get("population_served"),
                score.get("county_names"),
            ),
        )
        conn.commit()
        conn.close()
        return True
    except sqlite3.Error as e:
        logger.warning(f"Error upserting risk score: {e}")
        conn.close()
        return False


def run_scoring() -> Dict[str, Any]:
    """Run risk scoring for all sites. Returns summary statistics."""
    logger.info("Starting risk scoring engine")

    sites = get_site_data_for_scoring()
    logger.info(f"Found {len(sites)} unique site/pathogen combinations to score")

    scored = 0
    failed = 0
    risk_distribution: Dict[str, int] = {}

    for wwtp_id, pathogen in sites:
        try:
            score = calculate_risk_score(wwtp_id, pathogen)
            if score:
                upsert_risk_score(score)
                scored += 1

                risk_level = score["risk_level"]
                risk_distribution[risk_level] = risk_distribution.get(risk_level, 0) + 1
            else:
                failed += 1
        except Exception as e:
            logger.warning(f"Failed to score {wwtp_id}/{pathogen}: {e}")
            failed += 1

    logger.info(
        f"Scoring complete: {scored} scored, {failed} failed, "
        f"distribution: {risk_distribution}"
    )

    return {
        "sites_scored": scored,
        "sites_failed": failed,
        "risk_distribution": risk_distribution,
    }


def get_risk_summary(db_path: Path = DB_PATH) -> Dict[str, Dict[str, int]]:
    """Get count of sites per risk level per pathogen."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT pathogen, risk_level, COUNT(*) as count
        FROM risk_scores
        GROUP BY pathogen, risk_level
        ORDER BY pathogen, risk_level
        """
    )

    summary: Dict[str, Dict[str, int]] = {}
    for row in cursor.fetchall():
        pathogen, risk_level, count = row
        if pathogen not in summary:
            summary[pathogen] = {}
        summary[pathogen][risk_level] = count

    conn.close()
    return summary
