# WasteWatch

Public health wastewater surveillance platform. Real-time monitoring of viral pathogen levels across wastewater treatment facilities.

## Overview

WasteWatch is a full-stack application that:
- Ingests CDC wastewater surveillance data every 6 hours
- Calculates risk scores using z-score analysis and trend detection
- Serves live data via FastAPI backend
- Visualizes threats on an interactive map dashboard

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CDC API   │────▶│  Pipeline   │────▶│  SQLite DB  │
│  (Socrata)  │     │  (Python)   │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                      ┌────────▼────────┐
                                      │   FastAPI       │
                                      │   Backend       │
                                      └────────┬────────┘
                                               │
                                      ┌────────▼────────┐
                                      │   Next.js       │
                                      │   Dashboard     │
                                      └─────────────────┘
```

## Project Structure

```
├── api/                    # FastAPI backend
│   ├── config.py          # API configuration
│   ├── db.py              # Database queries
│   ├── main.py            # FastAPI app entry
│   ├── models.py          # Pydantic schemas
│   └── routes/            # API endpoints
│       ├── alerts.py
│       ├── pathogens.py
│       └── sites.py
├── pipeline/              # Data ingestion
│   ├── config.py          # Pipeline config
│   ├── db.py              # DB operations
│   ├── ingest.py          # CDC data fetcher
│   ├── models.py          # Data models
│   ├── scheduler.py       # APScheduler job
│   └── scorer.py          # Risk scoring engine
├── wastewatch-ui/         # Next.js frontend
│   ├── src/
│   │   ├── app/           # Pages (App Router)
│   │   ├── components/    # React components
│   │   └── lib/           # Utils, API client
│   └── package.json
├── data/                  # SQLite database
├── requirements.txt       # Python deps
└── start.sh              # API startup script
```

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+

### Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database (auto-created on first run)
python -c "from pipeline.db import init_db; init_db()"

# Run ingestion once to populate data
python -m pipeline.scheduler --once

# Start API server
./start.sh
# or: uvicorn api.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd wastewatch-ui
npm install
npm run dev
```

Open http://localhost:3000

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /health | Health check, DB status |
| GET /api/sites | All sites with risk scores |
| GET /api/sites/{id}/history | 12-week history for site |
| GET /api/summary | National summary + top 10 |
| GET /api/alerts | Critical/elevated sites |
| GET /api/pathogens | Pathogen list with counts |

## Configuration

Backend config in `api/config.py` and `pipeline/config.py`:
- Database path: `./data/wastewatch.db`
- CORS origins: `http://localhost:3000`, `*`
- Cache TTL: 300 seconds
- Refresh interval: 6 hours

Frontend config in `wastewatch-ui/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## How It Works

### Data Ingestion
- Fetches from CDC Wastewater Surveillance API
- Stores ~800k records in SQLite
- Deduplicates by `wwtp_id` + `pathogen` + `date_start`

### Risk Scoring
For each site/pathogen combination:
- Calculates z-score: `(latest - mean) / std`
- Determines risk level: critical (z>3), elevated (z>2), moderate (z>1), low, insufficient_data
- Computes trend: rising/falling/stable based on linear regression
- Updates every 6 hours via scheduler

### Dashboard
- Dark theme with CartoDB Dark Matter tiles
- Circle markers sized by population served
- Color-coded by risk level
- Auto-refreshing data with SWR
- Mobile-responsive sidebar

## Tech Stack

**Backend:**
- FastAPI + Uvicorn
- SQLite (read-only API, write pipeline)
- APScheduler (background jobs)
- Pydantic v2
- Loguru (logging)
- fastapi-cache2 (5min caching)

**Frontend:**
- Next.js 14 (App Router)
- React + TypeScript
- Tailwind CSS
- Leaflet (maps)
- Recharts (sparklines)
- SWR (data fetching)
- Lucide icons

## Scheduler Deployment

For production, run the scheduler as a background service:

```bash
# Using systemd (Linux)
sudo systemctl enable wastewatch-scheduler

# Or using PM2
pm2 start "python -m pipeline.scheduler" --name wastewatch-scheduler
```

## License

MIT
