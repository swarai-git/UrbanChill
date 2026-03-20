"""
Router: Heat Trap Detection — Feature 1
POST /api/heatmap/detect
"""


"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.satellite import (
    search_landsat, fetch_surface_temperature,
    fetch_ndvi_bands, get_scene_freshness
)
from services.lst_engine import run_lst_pipeline
from services.heat_detector import detect_heat_traps, lst_to_geojson_grid
from datetime import datetime, timezone

router = APIRouter()


class HeatDetectRequest(BaseModel):
    min_lon: float   = Field(..., example=72.85)
    min_lat: float   = Field(..., example=19.00)
    max_lon: float   = Field(..., example=72.95)
    max_lat: float   = Field(..., example=19.10)
    date_range: str  = Field("auto")
    max_cloud: int   = Field(30)
    percentile: float = Field(75.0)


@router.post("/detect")
async def detect_heat(req: HeatDetectRequest):
    bbox = [req.min_lon, req.min_lat, req.max_lon, req.max_lat]

    # Bbox size guard — recommend small areas for clear results
    lon_span = req.max_lon - req.min_lon
    lat_span = req.max_lat - req.min_lat
    if lon_span > 0.5 or lat_span > 0.5:
        raise HTTPException(400,
            f"Area too large ({lon_span:.2f}°×{lat_span:.2f}°). "
            "Please draw a smaller area — max 0.5°×0.5°. "
            "Tip: zoom into a single city district for best results.")

    # Find most recent scene
    item = search_landsat(bbox, req.date_range, req.max_cloud)
    if not item:
        raise HTTPException(404,
            "No Landsat scene found in the last 90 days. "
            "Try a different location or increase max_cloud.")

    freshness = get_scene_freshness(item)

    # Fetch pre-calibrated Surface Temperature + NDVI bands
    try:
        st_celsius, profile = fetch_surface_temperature(item, bbox)
        red, nir            = fetch_ndvi_bands(item, bbox)
    except Exception as e:
        raise HTTPException(500, f"Band download failed: {str(e)}")

    if st_celsius.size < 50:
        raise HTTPException(400, "Area too small — try a larger bbox.")

    # Process: NDVI + water mask + stats
    result    = run_lst_pipeline(st_celsius, red, nir)
    lst       = result["lst"]

    # Detect heat traps
    hot_zones = detect_heat_traps(lst, profile, percentile_threshold=req.percentile)
    lst_grid  = lst_to_geojson_grid(lst, profile, downsample=1)

    return {
        "scene_info": {
            "scene_id":    item.id,
            "scene_date":  freshness["scene_date"],
            "days_ago":    freshness["days_ago"],
            "freshness":   freshness["freshness"],
            "is_recent":   freshness["is_recent"],
            "today":       freshness["today"],
            "cloud_cover": round(item.properties.get("eo:cloud_cover", 0), 1),
            "satellite":   item.properties.get("platform", "landsat").upper(),
            "note": "Near real-time: most recent Landsat pass. Landsat revisits every 16 days."
        },
        "stats":     result["stats"],
        "hot_zones": {"type": "FeatureCollection", "features": hot_zones},
        "lst_grid":  lst_grid
    }
    """


"""
Router: Heat Trap Detection — Feature 1 + Feature 4 (Heat Equity)
POST /api/heatmap/detect
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.satellite import (
    search_landsat, fetch_surface_temperature,
    fetch_ndvi_bands, get_scene_freshness
)
from services.lst_engine import run_lst_pipeline
from services.heat_detector import (
    detect_heat_traps, lst_to_geojson_grid,
    compute_heat_vulnerability_index
)

router = APIRouter()


class HeatDetectRequest(BaseModel):
    min_lon: float    = Field(..., example=72.85)
    min_lat: float    = Field(..., example=19.00)
    max_lon: float    = Field(..., example=72.95)
    max_lat: float    = Field(..., example=19.10)
    date_range: str   = Field("auto")
    max_cloud: int    = Field(30)
    percentile: float = Field(75.0)


@router.post("/detect")
async def detect_heat(req: HeatDetectRequest):
    bbox     = [req.min_lon, req.min_lat, req.max_lon, req.max_lat]
    lon_span = req.max_lon - req.min_lon
    lat_span = req.max_lat - req.min_lat

    if lon_span > 0.5 or lat_span > 0.5:
        raise HTTPException(400,
            f"Area too large ({lon_span:.2f}°×{lat_span:.2f}°). "
            "Please draw a smaller area — max 0.5°×0.5°.")

    item = search_landsat(bbox, req.date_range, req.max_cloud)
    if not item:
        raise HTTPException(404,
            "No Landsat scene found in the last 90 days. "
            "Try a different location or increase max_cloud.")

    freshness = get_scene_freshness(item)

    try:
        st_celsius, profile = fetch_surface_temperature(item, bbox)
        red, nir            = fetch_ndvi_bands(item, bbox)
    except Exception as e:
        raise HTTPException(500, f"Band download failed: {str(e)}")

    if st_celsius.size < 50:
        raise HTTPException(400, "Area too small — try a larger bbox.")

    result = run_lst_pipeline(st_celsius, red, nir)
    lst    = result["lst"]
    ndvi   = result["ndvi"]

    # Feature 1: detect heat traps
    hot_zones = detect_heat_traps(lst, profile, percentile_threshold=req.percentile)

    # Feature 4: compute Heat Vulnerability Index for each zone
    hot_zones = compute_heat_vulnerability_index(hot_zones, lst, ndvi)

    # LST grid for map dots
    lst_grid = lst_to_geojson_grid(lst, profile, downsample=3)

    return {
        "scene_info": {
            "scene_id":    item.id,
            "scene_date":  freshness["scene_date"],
            "days_ago":    freshness["days_ago"],
            "freshness":   freshness["freshness"],
            "is_recent":   freshness["is_recent"],
            "today":       freshness["today"],
            "cloud_cover": round(item.properties.get("eo:cloud_cover", 0), 1),
            "satellite":   item.properties.get("platform", "landsat").upper(),
            "note": "Near real-time: most recent Landsat pass. Landsat revisits every 16 days."
        },
        "stats":     result["stats"],
        "hot_zones": {"type": "FeatureCollection", "features": hot_zones},
        "lst_grid":  lst_grid
    }