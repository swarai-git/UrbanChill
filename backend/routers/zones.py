import math
import os
import httpx
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

API_KEYS = {
    "grok": os.getenv("GROK_API_KEY", ""),
    "gemini": os.getenv("GEMINI_API_KEY", ""),
    "geocoding": os.getenv("GEOCODING_API_KEY", ""),
}

CITY_COORDS = {
    "new_delhi": {"lat": 28.6139, "lon": 77.2090, "name": "New Delhi"},
    "mumbai": {"lat": 19.0760, "lon": 72.8777, "name": "Mumbai"},
    "bangalore": {"lat": 12.9716, "lon": 77.5946, "name": "Bangalore"},
    "chennai": {"lat": 13.0827, "lon": 80.2707, "name": "Chennai"},
    "kolkata": {"lat": 22.5726, "lon": 88.3639, "name": "Kolkata"},
    "hyderabad": {"lat": 17.3850, "lon": 78.4867, "name": "Hyderabad"},
    "pune": {"lat": 18.5204, "lon": 73.8567, "name": "Pune"},
    "ahmedabad": {"lat": 23.0225, "lon": 72.5714, "name": "Ahmedabad"},
    "jaipur": {"lat": 26.9124, "lon": 75.7873, "name": "Jaipur"},
    "lucknow": {"lat": 26.8467, "lon": 80.9462, "name": "Lucknow"},
}

def generate_zones_for_city(city: str, base_coords: dict) -> List[dict]:
    city_key = city.lower().replace(" ", "_").replace("-", "_")
    
    base_lat = base_coords["lat"]
    base_lon = base_coords["lon"]
    
    zones_data = [
        {"id": f"{city_key}_1", "name": f"Central {base_coords['name']} Core", "severity": "critical",
         "lst": 52.0 + (hash(city_key) % 10) * 0.3, "ndvi": 0.08, "svi": 0.88, "density": 92,
         "lat": base_lat + 0.02, "lng": base_lon + 0.01,
         "recommendation": "Plant 200+ trees, install cool roofs on 40% of buildings", "roi_annual": 12400},
        {"id": f"{city_key}_2", "name": f"East {base_coords['name']}", "severity": "high",
         "lst": 49.5 + (hash(city_key) % 8) * 0.3, "ndvi": 0.12, "svi": 0.75, "density": 85,
         "lat": base_lat + 0.015, "lng": base_lon + 0.025,
         "recommendation": "Green corridors along main roads, reflective pavement", "roi_annual": 9200},
        {"id": f"{city_key}_3", "name": f"West {base_coords['name']}", "severity": "medium",
         "lst": 46.0 + (hash(city_key) % 7) * 0.3, "ndvi": 0.22, "svi": 0.52, "density": 70,
         "lat": base_lat - 0.01, "lng": base_lon - 0.02,
         "recommendation": "Expand existing tree canopy, increase park coverage", "roi_annual": 7800},
        {"id": f"{city_key}_4", "name": f"{base_coords['name']} Green Belt", "severity": "low",
         "lst": 36.5 + (hash(city_key) % 5) * 0.3, "ndvi": 0.65, "svi": 0.18, "density": 25,
         "lat": base_lat - 0.03, "lng": base_lon + 0.03,
         "recommendation": "Maintain existing green cover, monitor for changes", "roi_annual": 2100},
    ]
    return zones_data


class Zone(BaseModel):
    id: str
    name: str
    severity: str
    lst: float
    ndvi: float
    svi: float
    density: int
    lat: float
    lng: float
    recommendation: str
    roi_annual: int


class CityStats(BaseModel):
    peak_lst: float
    mean_ndvi: float
    svi_score: float
    built_cover: int
    critical_zones: int
    date: str
    city: str


class ZonesResponse(BaseModel):
    zones: List[Zone]
    stats: CityStats


class ZoneInput(BaseModel):
    name: str
    temp: float
    ndvi: float
    poverty: float


@router.get("/zones", response_model=ZonesResponse)
def get_zones(
    city: str = Query(default="new_delhi"),
    date: str = Query(default="2024-07-15"),
):
    city_key = city.lower().replace(" ", "_").replace("-", "_")
    base_coords = CITY_COORDS.get(city_key, {"lat": 28.6139, "lon": 77.2090, "name": city.title()})
    
    zones_data = generate_zones_for_city(city_key, base_coords)
    zones = [Zone(**z) for z in zones_data]
    
    lsts = [z.lst for z in zones]
    ndvis = [z.ndvi for z in zones]
    critical_n = sum(1 for z in zones if z.severity == "critical")

    stats = CityStats(
        peak_lst=round(max(lsts), 1),
        mean_ndvi=round(sum(ndvis) / len(ndvis), 2),
        svi_score=0.78,
        built_cover=75,
        critical_zones=critical_n,
        date=date,
        city=base_coords["name"],
    )
    return ZonesResponse(zones=zones, stats=stats)


@router.get("/zones/{zone_id}")
def get_zone_detail(zone_id: str):
    for city_key, coords in CITY_COORDS.items():
        zones_data = generate_zones_for_city(city_key, coords)
        zone = next((z for z in zones_data if z["id"] == zone_id), None)
        if zone:
            annual_savings = zone["roi_annual"]
            r = 0.05
            n = 20
            pv = annual_savings * ((1 - (1 + r) ** -n) / r)
            
            return {
                **zone,
                "roi_detail": {
                    "annual_savings": annual_savings,
                    "discount_rate": r,
                    "lifespan_years": n,
                    "present_value": round(pv, 2),
                },
            }
    
    raise HTTPException(status_code=404, detail="Zone not found")


@router.get("/cities")
def get_cities():
    return {
        "cities": [
            {"id": k, "name": v["name"], "lat": v["lat"], "lon": v["lon"]}
            for k, v in CITY_COORDS.items()
        ]
    }


@router.post("/recommend")
def get_recommendation(zone: ZoneInput):
    key = API_KEYS.get("grok") or API_KEYS.get("gemini")
    
    prompt = f"""You are an urban heat resilience planner for Indian cities.
Zone: {zone.name}
Surface Temperature: {zone.temp}°C
Vegetation Index (NDVI): {zone.ndvi} (0=barren, 1=dense vegetation)
Poverty Rate: {zone.poverty}%

Give exactly 3 specific, actionable cooling interventions.
Consider the poverty rate when suggesting cost of interventions.
Format as a numbered list. Be concise."""

    if not key or key in ("", "your-key-here", "your_grok_key_here", "your_gemini_key_here"):
        return {"recommendation": f"""Based on the zone data (Temperature: {zone.temp}°C, NDVI: {zone.ndvi}):

1. Plant 150-200 shade trees along streets and open spaces to reduce ambient temperature by 2-4°C
2. Install cool/reflective roofs on commercial buildings (40-60% coverage) to reduce surface temps by 10-15°C
3. Create green corridors along major roads connecting parks for airflow and shade

Estimated combined ROI: ₹8,000-15,000 annually per 1000 sqm"""}

    try:
        if API_KEYS.get("grok") and API_KEYS["grok"]:
            url = "https://api.x.ai/v1/chat/completions"
            response = httpx.post(
                url,
                headers={
                    "Authorization": f"Bearer {API_KEYS['grok']}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "grok-3-fast",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 500
                },
                timeout=30.0
            )
            result = response.json()
            if isinstance(result, dict) and "choices" in result:
                return {"recommendation": result["choices"][0]["message"]["content"]}
        
        return {"recommendation": f"""Based on the zone data (Temperature: {zone.temp}°C, NDVI: {zone.ndvi}):

1. Plant 150-200 shade trees along streets and open spaces
2. Install cool/reflective roofs on commercial buildings
3. Create green corridors along major roads

Estimated combined ROI: ₹8,000-15,000 annually"""}

    except httpx.HTTPStatusError as e:
        return {"recommendation": f"""AI API error (HTTP {e.response.status_code}). Using offline recommendations:

1. Plant 150-200 shade trees along streets and open spaces
2. Install cool/reflective roofs on commercial buildings
3. Create green corridors along major roads

Estimated combined ROI: ₹8,000-15,000 annually"""}

    except Exception as e:
        return {"recommendation": f"""AI service unavailable ({type(e).__name__}). Using offline recommendations:

1. Plant 150-200 shade trees along streets and open spaces
2. Install cool/reflective roofs on commercial buildings
3. Create green corridors along major roads

Estimated combined ROI: ₹8,000-15,000 annually"""}


def dn_to_lst(dn: float, emissivity: float = 0.97) -> float:
    ML = 3.3420e-4
    AL = 0.1
    radiance = ML * dn + AL
    K1 = 774.8853
    K2 = 1321.0789
    brightness_temp = K2 / math.log((K1 / radiance) + 1)
    wavelength = 10.895e-6
    rho = 1.438e-2
    lst_kelvin = brightness_temp / (
        1 + (wavelength * brightness_temp / rho) * math.log(emissivity)
    )
    return round(lst_kelvin - 273.15, 2)
