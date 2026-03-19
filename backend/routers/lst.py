"""
Router: LST Calibration — Feature 3
POST /api/lst/compute  → full LST pipeline for a bbox, returns stats + GeoJSON grid
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.satellite import search_landsat, fetch_surface_temperature, fetch_ndvi_bands
from services.lst_engine import run_lst_pipeline
from services.heat_detector import lst_to_geojson_grid

router = APIRouter()


class BboxRequest(BaseModel):
    min_lon: float = Field(..., example=72.80)
    min_lat: float = Field(..., example=18.90)
    max_lon: float = Field(..., example=73.00)
    max_lat: float = Field(..., example=19.10)
    date_range: str = Field("2024-01-01/2024-12-31")
    max_cloud: int  = Field(25)
    downsample: int = Field(5, description="Grid downsampling factor for payload size")


@router.post("/compute")
async def compute_lst(req: BboxRequest):
    """
    Full LST computation pipeline:
    1. Find best Landsat scene
    2. Download Band 10 + Red + NIR
    3. Run physics-based LST calibration
    4. Return stats + lightweight GeoJSON point grid
    """
    bbox = [req.min_lon, req.min_lat, req.max_lon, req.max_lat]

    # Step 1: Find scene
    item = search_landsat(bbox, req.date_range, req.max_cloud)
    if not item:
        raise HTTPException(404, "No suitable Landsat scene found for this area.")

    # Step 2: Fetch bands
    try:
        st_celsius, profile = fetch_surface_temperature(item, bbox)
        red, nir        = fetch_ndvi_bands(item, bbox)
    except Exception as e:
        raise HTTPException(500, f"Band fetch failed: {str(e)}")

    if band10.size == 0:
        raise HTTPException(400, "No valid pixels in this bbox. Try a larger area.")

    # Step 3: Physics pipeline
    result = run_lst_pipeline(st_celsius, red, nir)
    lst    = result["lst"]

    # Step 4: Convert to GeoJSON grid for heatmap rendering
    geojson_grid = lst_to_geojson_grid(lst, profile, downsample=req.downsample)

    return {
        "scene_id":   item.id,
        "scene_date": item.datetime.isoformat(),
        "cloud_cover": item.properties.get("eo:cloud_cover"),
        "stats":      result["stats"],
        "grid":       geojson_grid        # GeoJSON FeatureCollection of LST points
    }