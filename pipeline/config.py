from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

API_URL = "https://data.cdc.gov/resource/2ew6-ywp6.json"
DB_PATH = DATA_DIR / "wastewatch.db"
BATCH_SIZE = 1000
REFRESH_INTERVAL_HOURS = 6

PATHOGENS = ["sars-cov-2"]

API_FIELDS = [
    "wwtp_id",
    "wwtp_jurisdiction",
    "reporting_jurisdiction",
    "key_plot_id",
    "date_start",
    "date_end",
    "detect_prop_15d",
    "percentile",
    "ptc_15d",
    "county_names",
    "population_served",
]
