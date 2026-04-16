from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "wastewatch.db"

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "*",
]

CACHE_TTL_SECONDS = 300

API_PREFIX = "/api"
