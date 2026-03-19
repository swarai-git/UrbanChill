"""
services/gee.py
───────────────
Google Earth Engine data pipeline stub.
Fill in each function once you have GEE credentials set up.

Setup:

  1. pip install earthengine-api
  2. Run: earthengine authenticate
  3. Replace each stub below with real ee calls
"""

# Uncomment when credentials are ready:
# import ee
# ee.Initialize()


def fetch_lst_image(city_bbox: dict, date: str) -> dict:
    """
    Fetch Land Surface Temperature from Landsat-8 Band 10.

    Args:
        city_bbox: { west, south, east, north } in WGS84
        date:      'YYYY-MM-DD'
    Returns:
        GeoJSON FeatureCollection of LST values per zone
    """
    # TODO:
    # collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2') \
    #     .filterDate(date, next_day(date)) \
    #     .filterBounds(ee.Geometry.BBox(**city_bbox)) \
    #     .select(['ST_B10'])
    # image = collection.median()
    # return image.getInfo()
    return {"status": "stub — connect GEE credentials to activate"}


def fetch_ndvi_image(city_bbox: dict, date: str) -> dict:
    """
    Fetch NDVI from Sentinel-2 NIR (B8) and Red (B4).
    NDVI = (B8 - B4) / (B8 + B4)
    """
    # TODO:
    # collection = ee.ImageCollection('COPERNICUS/S2_SR') \
    #     .filterDate(date, next_day(date)) \
    #     .filterBounds(ee.Geometry.BBox(**city_bbox)) \
    #     .select(['B4', 'B8'])
    # image = collection.median()
    # ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    # return ndvi.getInfo()
    return {"status": "stub"}


def fetch_svi_data(city: str) -> dict:
    """
    Fetch CDC Social Vulnerability Index data for a city.
    Returns census tract polygons with SVI scores.
    """
    # TODO: load from CDC SVI GeoJSON or PostGIS
    return {"status": "stub"}