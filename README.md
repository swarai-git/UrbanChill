# 🌡 UrbanChill AI
### Geo-Intelligent Decision Support System for Urban Heat Resilience

> Built for hackathon — shifts urban planning from **Post-Heat Reaction** to **Pre-Heat Prevention**

---

## 🚀 What It Does

UrbanChill AI helps city planners identify and act on urban heat islands before they become public health emergencies. It combines satellite-derived thermal data, social vulnerability indices, and generative AI to deliver actionable, location-specific cooling interventions.

**Core Features (v1):**
- 🗺️ Interactive dark map with color-coded heat severity zones
- 📊 City-level stats dashboard (Peak LST, NDVI, Built Cover, Critical Zones)
- 🤖 AI-powered policy recommendations per zone (powered by Grok)
- 💰 Annual ROI estimates for cooling interventions
- 🔴 Heat severity index (Critical / High / Medium / Low)

---

## 🏗️ Architecture

```
urbanchill-ai/
├── frontend/                  # React + Leaflet
│   └── src/
│       ├── App.jsx            # Main map + sidebar UI
│       └── main.jsx
│
└── backend/                   # FastAPI + Grok AI
    ├── main.py                # App entry point
    ├── routers/
    │   ├── zones.py           # Heat zones + AI recommend endpoints
    │   └── health.py          # Health check
    ├── services/
    │   └── gee.py             # Google Earth Engine stub (future)
    ├── data/
    │   └── heat_zones.geojson # Mock zone data
    └── .env                   # API keys (never commit this)
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Map | Leaflet + React-Leaflet |
| Map Tiles | CartoDB Dark Matter (free) |
| Backend | FastAPI + Uvicorn |
| AI Agent | Grok API (xAI) |
| Data Format | GeoJSON |
| Future: Satellite | Google Earth Engine |
| Future: ML | HuggingFace SegFormer |

---

## 🛠️ Local Setup

### Prerequisites
- Node.js v18+
- Python 3.10+
- Grok API key from [console.x.ai](https://console.x.ai)



### 2. Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

Create `backend/.env`:
```
GROK_API_KEY=xai-your-key-here
```

Start backend:
```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app
```
http://localhost:5173
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/health` | Service status |
| GET | `/api/zones` | Get all heat zones + city stats |
| GET | `/api/zones/{id}` | Get zone detail + ROI breakdown |
| POST | `/api/recommend` | Get AI cooling interventions |

### Example: Get AI Recommendation
```bash
curl -X POST http://localhost:8000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"name": "Karol Bagh", "temp": 54.2, "ndvi": 0.09, "poverty": 91}'
```

Response:
```json
{
  "recommendation": "1. Install reflective cool roofs...\n2. Plant 200+ trees...\n3. Create shaded pedestrian corridors..."
}
```

---

## 🗺️ Current Mock Data

Zones are currently hardcoded for **New Delhi Metro**:

| Zone | LST | Severity |
|---|---|---|
| Karol Bagh Core | 54.2°C | 🔴 Critical |
| Paharganj Junction | 51.7°C | 🟠 High |
| Connaught Place | 47.3°C | 🟡 Medium |
| Lodi Garden Area | 38.1°C | 🟢 Low |

---

## 🔭 Roadmap

- [ ] Real satellite data via Google Earth Engine (Landsat-8 + Sentinel-2)
- [ ] Physics-based LST calibration from Digital Numbers
- [ ] CDC Social Vulnerability Index overlay
- [ ] 3D building extrusion (Mapbox GL JS)
- [ ] What-If simulation (add trees / cool roofs)
- [ ] Cool-Path pedestrian routing (UTCI heat stress)
- [ ] SegFormer land cover classification
- [ ] Multi-city support

---

## 🧠 How the AI Works

When a planner clicks a heat zone, the backend sends zone data to Grok with this context:

```
Zone: Karol Bagh Core
Surface Temperature: 54.2°C
Vegetation Index (NDVI): 0.09 (0=barren, 1=dense)
Poverty Rate: 91%

→ Give 3 actionable cooling interventions
  considering poverty rate for cost sensitivity
```

Grok returns specific, prioritized interventions tailored to that zone's conditions.

---

## 👥 Team

Built at [Hackathon Name] — [Date]

---

## 📄 License

MIT License — free to use and modify