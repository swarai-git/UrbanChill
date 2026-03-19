from fastapi import APIRouter

router = APIRouter()


@router.get("/infrastructure/buildings")
def get_buildings(bbox: str = "77.1,28.5,77.3,28.7"):
    return {
        "type": "FeatureCollection",
        "features": [],
        "note": "Connect Overpass API for real building data",
        "bbox": bbox
    }


@router.get("/infrastructure/roads")
def get_roads(bbox: str = "77.1,28.5,77.3,28.7"):
    return {
        "type": "FeatureCollection",
        "features": [],
        "note": "Connect Overpass API for real road data",
        "bbox": bbox
    }


@router.get("/infrastructure/landuse")
def get_landuse(bbox: str = "77.1,28.5,77.3,28.7"):
    return {
        "type": "FeatureCollection",
        "features": [],
        "note": "Connect Overpass API for real land use data",
        "bbox": bbox
    }
