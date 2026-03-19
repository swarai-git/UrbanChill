"""
Feature 2: Real-Time Satellite Data Pipeline
Fetches Landsat-8/9 Collection 2 Level-2 data from Microsoft Planetary Computer.

KEY FIX: Landsat C2L2 "lwir11" asset is already Surface Temperature in Kelvin
(scale factor 0.00341802, offset 149.0). We just apply scale+offset → Celsius.
No DN→Radiance→BT physics needed — that caused the 55°C saturation bug.
"""
import pystac_client
import planetary_computer
import rasterio
import numpy as np
from rasterio.crs import CRS
from rasterio.warp import transform_bounds
from datetime import datetime, timedelta, timezone
from typing import Optional


STAC_URL   = "https://planetarycomputer.microsoft.com/api/stac/v1"
COLLECTION = "landsat-c2-l2"


def get_today_date_range(lookback_days: int = 30) -> str:
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=lookback_days)
    return f"{start.isoformat()}/{today.isoformat()}"


def get_catalog() -> pystac_client.Client:
    return pystac_client.Client.open(
        STAC_URL,
        modifier=planetary_computer.sign_inplace
    )


def search_landsat(
    bbox: list[float],
    date_range: str = None,
    max_cloud_cover: int = 30
) -> Optional[object]:
    catalog = get_catalog()

    if date_range is None or date_range == "auto":
        search_range = get_today_date_range(lookback_days=30)
    else:
        search_range = date_range

    # Try with requested cloud cover
    for cloud_limit in [max_cloud_cover, 50, 80]:
        search = catalog.search(
            collections=[COLLECTION],
            bbox=bbox,
            datetime=search_range,
            query={"eo:cloud_cover": {"lt": cloud_limit}},
            sortby=["-datetime"],
            max_items=10
        )
        items = list(search.items())
        if items:
            break

    # Fallback: go back 90 days
    if not items:
        fallback_range = get_today_date_range(lookback_days=90)
        search = catalog.search(
            collections=[COLLECTION],
            bbox=bbox,
            datetime=fallback_range,
            sortby=["-datetime"],
            max_items=5
        )
        items = list(search.items())

    if not items:
        return None

    return min(items[:5], key=lambda i: i.properties.get("eo:cloud_cover", 100))


def get_scene_freshness(item) -> dict:
    today      = datetime.now(timezone.utc)
    scene_date = item.datetime
    days_ago   = (today - scene_date).days

    if days_ago == 0:   freshness = "captured today"
    elif days_ago == 1: freshness = "captured yesterday"
    elif days_ago <= 7: freshness = f"captured {days_ago} days ago"
    else:               freshness = f"captured {days_ago} days ago"

    return {
        "days_ago":   days_ago,
        "freshness":  freshness,
        "is_recent":  days_ago <= 20,
        "scene_date": scene_date.isoformat(),
        "today":      today.date().isoformat()
    }


def fetch_surface_temperature(item, bbox: list[float]) -> tuple[np.ndarray, dict]:
    """
    Fetch Landsat C2L2 Surface Temperature band (lwir11).

    Landsat C2L2 ST is stored as scaled integers:
      ST (Kelvin) = DN * 0.00341802 + 149.0
      ST (Celsius) = ST_kelvin - 273.15

    This replaces the old DN→Radiance→BT physics pipeline which was
    incorrectly applying formulas to already-processed data → 55°C bug.
    """
    signed_item = planetary_computer.sign(item)
    st_href     = signed_item.assets["lwir11"].href

    with rasterio.open(st_href) as src:
        dst_crs = src.crs
        src_crs = CRS.from_epsg(4326)
        min_lon, min_lat, max_lon, max_lat = bbox
        left, bottom, right, top = transform_bounds(
            src_crs, dst_crs, min_lon, min_lat, max_lon, max_lat
        )
        window   = src.window(left, bottom, right, top)
        st_dn    = src.read(1, window=window).astype(np.float32)
        tf       = src.window_transform(window)
        profile  = src.profile.copy()
        profile.update({"height": st_dn.shape[0], "width": st_dn.shape[1], "transform": tf})

    # Mask fill values (0 or 65535 = no data in Landsat C2)
    st_dn = np.where((st_dn == 0) | (st_dn == 65535), np.nan, st_dn)

    # Apply USGS C2L2 scale + offset → Kelvin → Celsius
    st_kelvin  = st_dn * 0.00341802 + 149.0
    st_celsius = st_kelvin - 273.15

    # Realistic clamp: 5°C–65°C covers Indian urban extremes
    st_celsius = np.clip(st_celsius, 5.0, 65.0)

    return st_celsius, profile


def fetch_ndvi_bands(item, bbox: list[float]) -> tuple[np.ndarray, np.ndarray]:
    """Fetch Red + NIR bands for NDVI computation."""
    signed_item = planetary_computer.sign(item)
    results = {}

    for band_name, asset_key in [("red", "red"), ("nir", "nir08")]:
        href = signed_item.assets[asset_key].href
        with rasterio.open(href) as src:
            dst_crs = src.crs
            src_crs = CRS.from_epsg(4326)
            min_lon, min_lat, max_lon, max_lat = bbox
            left, bottom, right, top = transform_bounds(
                src_crs, dst_crs, min_lon, min_lat, max_lon, max_lat
            )
            window = src.window(left, bottom, right, top)
            results[band_name] = src.read(1, window=window).astype(np.float32)

    red, nir = results["red"], results["nir"]
    if red.shape != nir.shape:
        from scipy.ndimage import zoom
        scale = (red.shape[0] / nir.shape[0], red.shape[1] / nir.shape[1])
        nir   = zoom(nir, scale)

    return red, nir