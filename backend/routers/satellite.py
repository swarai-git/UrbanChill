from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()


MOCK_LST_DATA = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"lst": 54.2, "timestamp": "2024-07-15T10:30:00Z"},
            "geometry": {"type": "Point", "coordinates": [77.1909, 28.6519]}
        },
        {
            "type": "Feature",
            "properties": {"lst": 51.7, "timestamp": "2024-07-15T10:30:00Z"},
            "geometry": {"type": "Point", "coordinates": [77.2110, 28.6448]}
        },
    ]
}

MOCK_NDVI_DATA = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"ndvi": 0.09, "timestamp": "2024-07-15"},
            "geometry": {"type": "Point", "coordinates": [77.1909, 28.6519]}
        },
        {
            "type": "Feature",
            "properties": {"ndvi": 0.62, "timestamp": "2024-07-15"},
            "geometry": {"type": "Point", "coordinates": [77.2196, 28.5931]}
        },
    ]
}


@router.get("/satellite/lst")
def get_lst(
    city: str = Query(default="new_delhi"),
    date: str = Query(default="2024-07-15"),
):
    return {
        "data": MOCK_LST_DATA,
        "city": city,
        "date": date,
        "source": "Landsat-8 (mock)",
        "note": "Connect Google Earth Engine for real data"
    }


@router.get("/satellite/ndvi")
def get_ndvi(
    city: str = Query(default="new_delhi"),
    date: str = Query(default="2024-07-15"),
):
    return {
        "data": MOCK_NDVI_DATA,
        "city": city,
        "date": date,
        "source": "Sentinel-2 (mock)",
        "note": "Connect Google Earth Engine for real data"
    }


@router.get("/satellite/heatmap")
def get_heatmap(
    city: str = Query(default="new_delhi"),
    date: str = Query(default="2024-07-15"),
):
    return {
        "layers": ["heat", "vegetation"],
        "city": city,
        "date": date,
        "note": "Combined heatmap requires GEE connection"
    }
