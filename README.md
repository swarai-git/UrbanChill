# UrbanChill AI — Hackathon Prototype

Urban heat island detection using free satellite data. No paid APIs.

## Project Structure

```
urbanchill/
├── backend/
│   ├── main.py                    ← FastAPI app entry point
│   ├── requirements.txt
│   ├── routers/
│   │   ├── satellite.py           ← Feature 2: /api/satellite/search
│   │   ├── lst.py                 ← Feature 3: /api/lst/compute
│   │   └── heatmap.py             ← Feature 1: /api/heatmap/detect  (main endpoint)
│   └── services/
│       ├── satellite.py           ← Microsoft Planetary Computer data fetch
│       ├── lst_engine.py          ← Physics: DN → Radiance → BT → LST
│       └── heat_detector.py       ← Blob detection → GeoJSON polygons
└── frontend/
    ├── package.json
    └── src/
        ├── App.jsx                ← Main map + sidebar
        ├── App.css
        └── components/
            ├── StatsPanel.jsx     ← Temperature statistics
            ├── HotZoneList.jsx    ← List of detected hot zones
            └── LSTLegend.jsx      ← Map color scale legend
```

---

## Setup & Run

### 1. Backend

```bash
cd urbanchill/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate          # Mac/Linux
venv\Scripts\activate             # Windows

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at:     http://localhost:8000/docs   ← Swagger UI, test here first!

### 2. Frontend

```bash
cd urbanchill/frontend
npm install
npm start
```

Frontend runs at: http://localhost:3000

---

## How to Use

1. Open http://localhost:3000
2. Click **Draw Region** in the sidebar
3. Click two corners on the map to define your analysis area
   - Recommended size: ~0.2° × 0.2° (roughly 20km × 20km)
   - Larger = slower fetch, smaller = fewer hot zones
4. Wait ~15–30s for satellite data download + processing
5. See results:
   - Colored heatmap grid (blue = cool, red = hot)
   - Red/orange polygons = detected heat traps
   - Click any polygon for zone details
   - Stats panel shows temperature range, NDVI, hot zone %

---

## API Endpoints

### Test in Swagger: http://localhost:8000/docs

| Endpoint | Method | Description |
|---|---|---|
| `/api/satellite/search` | GET | Find available Landsat scenes for a bbox |
| `/api/lst/compute` | POST | Compute LST for a bbox, return stats + grid |
| `/api/heatmap/detect` | POST | Full pipeline: LST + heat trap detection |

### Example request (Mumbai):

```bash
curl -X POST http://localhost:8000/api/heatmap/detect \
  -H "Content-Type: application/json" \
  -d '{
    "min_lon": 72.80,
    "min_lat": 18.90,
    "max_lon": 73.00,
    "max_lat": 19.10,
    "date_range": "2024-01-01/2024-12-31",
    "max_cloud": 25,
    "percentile": 75
  }'
```

---

## Tech Stack (100% Free)

| Layer | Technology | Why |
|---|---|---|
| Backend | FastAPI | Async, fast, auto-docs |
| Satellite data | Microsoft Planetary Computer | Free STAC API, no key needed |
| Thermal math | NumPy + Rasterio | USGS-standard LST formulas |
| Spatial ops | DuckDB + GeoPandas | Fast, no PostGIS needed |
| Frontend | React + Leaflet.js | Free mapping, no API key |
| Styling | CSS (custom dark theme) | No paid component library |
| Deploy | Vercel (frontend) + Render (backend) | Both free tier |

---

## LST Physics (Feature 3)

```
Band 10 DN  →  Radiance (W/m²·sr·µm)
              L = 0.0003342 × DN + 0.1

Radiance    →  Brightness Temperature (Kelvin)
              BT = 1321.08 / ln(774.89/L + 1)

NDVI        →  Emissivity
              ε = 0.97 + 0.02 × FVC  (mixed pixels)

BT + ε      →  Land Surface Temperature (°C)
              LST = BT / (1 + (λ·BT/ρ) × ln(ε)) − 273.15
```

---

## Common Issues

**"No Landsat scene found"**
→ Try `max_cloud: 40` or change `date_range` to `"2023-01-01/2023-12-31"`

**Slow response (>60s)**
→ Use a smaller bbox (0.1° × 0.1°), or increase `downsample` to 8–10

**CORS error in browser**
→ Make sure backend is running on port 8000 and frontend on 3000

**Empty map after analysis**
→ Check browser console — likely the bbox was too small for Landsat resolution