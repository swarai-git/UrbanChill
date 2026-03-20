"""
Feature 1: High-Resolution Heat Trap Detection
Identifies UHI micro-zones from LST arrays and returns as GeoJSON.
A "heat trap" = contiguous region where LST > dynamic threshold.
"""
""""
import numpy as np
from typing import Optional
from scipy.ndimage import label
from rasterio.warp import transform as warp_transform
from rasterio.crs import CRS

WGS84 = CRS.from_epsg(4326)


def detect_heat_traps(
    lst: np.ndarray,
    profile: dict,
    percentile_threshold: float = 75.0,
    min_area_pixels: int = 9
) -> list[dict]:
    valid_lst = lst[~np.isnan(lst)]
    if len(valid_lst) == 0:
        return []

    threshold      = float(np.percentile(valid_lst, percentile_threshold))
    hot_mask       = (lst > threshold) & (~np.isnan(lst))
    structure      = np.ones((3, 3))
    labeled_array, num_features = label(hot_mask, structure=structure)

    geojson_features = []
    transform = profile["transform"]
    src_crs   = profile["crs"]

    for zone_id in range(1, num_features + 1):
        zone_mask   = labeled_array == zone_id
        area_pixels = int(np.sum(zone_mask))
        if area_pixels < min_area_pixels:
            continue

        zone_lst      = lst[zone_mask]
        zone_mean_lst = float(np.nanmean(zone_lst))
        zone_max_lst  = float(np.nanmax(zone_lst))
        heat_intensity = _classify_intensity(zone_mean_lst)

        rows, cols     = np.where(zone_mask)
        polygon_coords = _pixels_to_polygon(rows, cols, transform, src_crs)
        if polygon_coords is None:
            continue

        severity = min(100, int(
            (zone_mean_lst - threshold) / (valid_lst.max() - threshold) * 100
        ))

        geojson_features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [polygon_coords]},
            "properties": {
                "zone_id":        zone_id,
                "mean_lst":       round(zone_mean_lst, 2),
                "max_lst":        round(zone_max_lst, 2),
                "area_pixels":    area_pixels,
                "area_ha":        round(area_pixels * 0.09, 2),
                "heat_intensity": heat_intensity,
                "severity_score": severity,
                "threshold_used": round(threshold, 2)
            }
        })

    geojson_features.sort(
        key=lambda f: f["properties"]["severity_score"], reverse=True
    )
    return geojson_features


def _classify_intensity(mean_lst: float) -> str:
    if mean_lst >= 45: return "critical"
    if mean_lst >= 40: return "high"
    if mean_lst >= 35: return "moderate"
    return "low"


def _pixels_to_polygon(
    rows: np.ndarray,
    cols: np.ndarray,
    transform,
    src_crs
) -> Optional[list]:
    if len(rows) == 0:
        return None

    r_min, r_max = int(rows.min()), int(rows.max())
    c_min, c_max = int(cols.min()), int(cols.max())

    # Pixel corners → projected coords
    xs = [
        transform.c + c_min * transform.a + r_min * transform.b,
        transform.c + c_max * transform.a + r_min * transform.b,
        transform.c + c_max * transform.a + r_max * transform.b,
        transform.c + c_min * transform.a + r_max * transform.b,
    ]
    ys = [
        transform.f + c_min * transform.d + r_min * transform.e,
        transform.f + c_max * transform.d + r_min * transform.e,
        transform.f + c_max * transform.d + r_max * transform.e,
        transform.f + c_min * transform.d + r_max * transform.e,
    ]

    # Batch reproject → WGS84
    lons, lats = warp_transform(src_crs, WGS84, xs, ys)
    ring = [[round(float(lon), 6), round(float(lat), 6)] for lon, lat in zip(lons, lats)]
    ring.append(ring[0])  # close ring
    return ring


def lst_to_geojson_grid(
    lst: np.ndarray,
    profile: dict,
    downsample: int = 3
) -> dict:

    Convert LST raster → GeoJSON point grid.
    Uses rasterio.warp.transform to correctly reproject from the raster
    CRS (any UTM zone) → WGS84 lon/lat that Leaflet can plot.

    transform = profile["transform"]
    src_crs   = profile["crs"]
    rows, cols = lst.shape

    xs, ys, vals = [], [], []

    for r in range(0, rows, downsample):
        for c in range(0, cols, downsample):
            val = lst[r, c]
            if np.isnan(val):
                continue
            xs.append(transform.c + c * transform.a + r * transform.b)
            ys.append(transform.f + c * transform.d + r * transform.e)
            vals.append(round(float(val), 2))

    if not xs:
        return {"type": "FeatureCollection", "features": []}

    # Single batch reproject — reads CRS correctly from rasterio profile
    lons, lats = warp_transform(src_crs, WGS84, xs, ys)

    features = [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [round(float(lon), 6), round(float(lat), 6)]
            },
            "properties": {"lst": val}
        }
        for lon, lat, val in zip(lons, lats, vals)
    ]

    return {"type": "FeatureCollection", "features": features}

"""



import numpy as np
from typing import Optional
from scipy.ndimage import label
from rasterio.warp import transform as warp_transform
from rasterio.crs import CRS

WGS84 = CRS.from_epsg(4326)


def detect_heat_traps(
    lst: np.ndarray,
    profile: dict,
    percentile_threshold: float = 75.0,
    min_area_pixels: int = 9
) -> list[dict]:
    valid_lst = lst[~np.isnan(lst)]
    if len(valid_lst) == 0:
        return []

    threshold      = float(np.percentile(valid_lst, percentile_threshold))
    hot_mask       = (lst > threshold) & (~np.isnan(lst))
    structure      = np.ones((3, 3))
    labeled_array, num_features = label(hot_mask, structure=structure)

    geojson_features = []
    transform = profile["transform"]
    src_crs   = profile["crs"]

    for zone_id in range(1, num_features + 1):
        zone_mask   = labeled_array == zone_id
        area_pixels = int(np.sum(zone_mask))
        if area_pixels < min_area_pixels:
            continue

        zone_lst      = lst[zone_mask]
        zone_mean_lst = float(np.nanmean(zone_lst))
        zone_max_lst  = float(np.nanmax(zone_lst))
        heat_intensity = _classify_intensity(zone_mean_lst)

        rows, cols     = np.where(zone_mask)
        polygon_coords = _pixels_to_polygon(rows, cols, transform, src_crs)
        if polygon_coords is None:
            continue

        severity = min(100, int(
            (zone_mean_lst - threshold) / (valid_lst.max() - threshold) * 100
        ))

        geojson_features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [polygon_coords]},
            "properties": {
                "zone_id":        zone_id,
                "mean_lst":       round(zone_mean_lst, 2),
                "max_lst":        round(zone_max_lst, 2),
                "area_pixels":    area_pixels,
                "area_ha":        round(area_pixels * 0.09, 2),
                "heat_intensity": heat_intensity,
                "severity_score": severity,
                "threshold_used": round(threshold, 2)
            }
        })

    geojson_features.sort(
        key=lambda f: f["properties"]["severity_score"], reverse=True
    )
    return geojson_features


def _classify_intensity(mean_lst: float) -> str:
    if mean_lst >= 45: return "critical"
    if mean_lst >= 40: return "high"
    if mean_lst >= 35: return "moderate"
    return "low"


def _pixels_to_polygon(
    rows: np.ndarray,
    cols: np.ndarray,
    transform,
    src_crs
) -> Optional[list]:
    if len(rows) == 0:
        return None

    r_min, r_max = int(rows.min()), int(rows.max())
    c_min, c_max = int(cols.min()), int(cols.max())

    # Pixel corners → projected coords
    xs = [
        transform.c + c_min * transform.a + r_min * transform.b,
        transform.c + c_max * transform.a + r_min * transform.b,
        transform.c + c_max * transform.a + r_max * transform.b,
        transform.c + c_min * transform.a + r_max * transform.b,
    ]
    ys = [
        transform.f + c_min * transform.d + r_min * transform.e,
        transform.f + c_max * transform.d + r_min * transform.e,
        transform.f + c_max * transform.d + r_max * transform.e,
        transform.f + c_min * transform.d + r_max * transform.e,
    ]

    # Batch reproject → WGS84
    lons, lats = warp_transform(src_crs, WGS84, xs, ys)
    ring = [[round(float(lon), 6), round(float(lat), 6)] for lon, lat in zip(lons, lats)]
    ring.append(ring[0])  # close ring
    return ring


def lst_to_geojson_grid(
    lst: np.ndarray,
    profile: dict,
    downsample: int = 3
) -> dict:
    """
    Convert LST raster → GeoJSON point grid.
    Uses rasterio.warp.transform to correctly reproject from the raster
    CRS (any UTM zone) → WGS84 lon/lat that Leaflet can plot.
    """
    transform = profile["transform"]
    src_crs   = profile["crs"]
    rows, cols = lst.shape

    xs, ys, vals = [], [], []

    for r in range(0, rows, downsample):
        for c in range(0, cols, downsample):
            val = lst[r, c]
            if np.isnan(val):
                continue
            xs.append(transform.c + c * transform.a + r * transform.b)
            ys.append(transform.f + c * transform.d + r * transform.e)
            vals.append(round(float(val), 2))

    if not xs:
        return {"type": "FeatureCollection", "features": []}

    # Single batch reproject — reads CRS correctly from rasterio profile
    lons, lats = warp_transform(src_crs, WGS84, xs, ys)

    features = [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [round(float(lon), 6), round(float(lat), 6)]
            },
            "properties": {"lst": val}
        }
        for lon, lat, val in zip(lons, lats, vals)
    ]

    return {"type": "FeatureCollection", "features": features}

def compute_heat_vulnerability_index(
    hot_zones: list[dict],
    lst: np.ndarray,
    ndvi: np.ndarray,
) -> list[dict]:
    """
    Feature 4: Heat Equity Integration
    Computes a Heat Vulnerability Index (HVI) for each detected hot zone.

    India-adapted SVI proxy using existing satellite data:
      - High LST  → more heat exposure
      - Low NDVI  → less green cover → poorer, denser urban areas
      - Large area → more people affected

    Formula:
      HVI = (norm_lst × 0.5) + (norm_no_green × 0.35) + (norm_area × 0.15)
      Score 0–100. Higher = more urgent intervention needed.

    Vulnerability tiers:
      80–100 → CRITICAL PRIORITY  (immediate intervention)
      60–79  → HIGH PRIORITY      (urgent action)
      40–59  → MODERATE PRIORITY  (planned intervention)
      0–39   → LOW PRIORITY       (monitor)
    """
    if not hot_zones:
        return hot_zones

    valid_ndvi = ndvi[~np.isnan(ndvi)]
    valid_lst  = lst[~np.isnan(lst)]

    if len(valid_ndvi) == 0 or len(valid_lst) == 0:
        return hot_zones

    lst_min,  lst_max  = float(valid_lst.min()),  float(valid_lst.max())
    ndvi_min, ndvi_max = float(valid_ndvi.min()), float(valid_ndvi.max())
    areas = [z["properties"]["area_ha"] for z in hot_zones]
    area_min, area_max = min(areas), max(areas)

    def norm(val, lo, hi):
        if hi == lo: return 0.5
        return max(0.0, min(1.0, (val - lo) / (hi - lo)))

    for zone in hot_zones:
        p = zone["properties"]

        # Higher LST = more vulnerable
        lst_score  = norm(p["mean_lst"], lst_min, lst_max)

        # Lower NDVI = less green = more vulnerable (inverted)
        # Use zone mean_lst as proxy — zones with high LST tend to have low NDVI
        no_green   = 1.0 - norm(p["mean_lst"] * 0.3, lst_min * 0.3, lst_max * 0.3)

        # Larger area = more people affected
        area_score = norm(p["area_ha"], area_min, area_max)

        hvi_raw = (lst_score * 0.5) + (no_green * 0.35) + (area_score * 0.15)
        hvi     = round(hvi_raw * 100)

        if hvi >= 80:   priority = "critical"
        elif hvi >= 60: priority = "high"
        elif hvi >= 40: priority = "moderate"
        else:           priority = "low"

        # Intervention recommendations based on priority
        interventions = {
            "critical": [
                "Deploy emergency cooling centres immediately",
                "Install reflective roofing & cool pavements",
                "Plant 500+ trees — priority urban greening",
                "Health alert system for elderly & children",
            ],
            "high": [
                "Plant trees along major roads",
                "Install shaded bus stops & walkways",
                "Cool roof subsidy for residents",
                "Community heat awareness programme",
            ],
            "moderate": [
                "Green corridor development",
                "Permeable pavements to reduce runoff heat",
                "Seasonal heat preparedness plan",
            ],
            "low": [
                "Monitor heat levels each season",
                "Maintain existing green cover",
            ],
        }

        p["hvi_score"]      = hvi
        p["hvi_priority"]   = priority
        p["interventions"]  = interventions[priority]

    return hot_zones