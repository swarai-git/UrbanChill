"""
Router: Satellite Data — Feature 2
GET /api/satellite/search  → find available scenes for a bbox
GET /api/satellite/scene   → metadata about best available scene
"""
from fastapi import APIRouter, HTTPException, Query
from services.satellite import search_landsat

router = APIRouter()


@router.get("/search")
async def search_scenes(
    min_lon: float = Query(..., description="West longitude"),
    min_lat: float = Query(..., description="South latitude"),
    max_lon: float = Query(..., description="East longitude"),
    max_lat: float = Query(..., description="North latitude"),
    date_range: str = Query("2024-01-01/2024-12-31", description="ISO date range"),
    max_cloud: int  = Query(20, description="Max cloud cover %")
):
    """
    Search for Landsat scenes over the given bounding box.
    Returns scene metadata (date, cloud cover, scene ID).
    """
    bbox = [min_lon, min_lat, max_lon, max_lat]
    item = search_landsat(bbox, date_range, max_cloud)

    if not item:
        raise HTTPException(
            status_code=404,
            detail="No Landsat scenes found for this area and date range. Try increasing max_cloud or widening the date range."
        )

    return {
        "scene_id":       item.id,
        "datetime":       item.datetime.isoformat(),
        "cloud_cover":    item.properties.get("eo:cloud_cover"),
        "satellite":      item.properties.get("platform"),
        "collection":     item.collection_id,
        "bbox":           item.bbox,
        "available_bands": list(item.assets.keys())
    }