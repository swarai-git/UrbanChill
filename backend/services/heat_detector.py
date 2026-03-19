"""
Feature 1: High-Resolution Heat Trap Detection
Identifies UHI micro-zones from LST arrays and returns as GeoJSON.
A "heat trap" = contiguous region where LST > dynamic threshold.
"""
import numpy as np
import json
from typing import Optional
from scipy.ndimage import label, binary_dilation


def detect_heat_traps(
    lst: np.ndarray,
    profile: dict,
    percentile_threshold: float = 75.0,  # Flag pixels above 75th percentile
    min_area_pixels: int = 9             # Minimum 9 pixels (~0.8 ha at 30m)
) -> list[dict]:
    """
    Detect heat trap zones from an LST array.
    Returns a list of GeoJSON Feature dicts.

    Algorithm:
      1. Compute dynamic threshold = Nth percentile of LST
      2. Binary mask: pixels above threshold
      3. Label connected components (scipy)
      4. Filter small noise zones by minimum area
      5. Convert pixel blobs → GeoJSON polygons
    """
    valid_lst = lst[~np.isnan(lst)]
    if len(valid_lst) == 0:
        return []

    # Dynamic threshold: flags the hottest zones relative to scene
    threshold = float(np.percentile(valid_lst, percentile_threshold))
    hot_mask  = (lst > threshold) & (~np.isnan(lst))

    # Label connected hot regions
    structure = np.ones((3, 3))  # 8-connectivity
    labeled_array, num_features = label(hot_mask, structure=structure)

    geojson_features = []
    transform = profile["transform"]  # Affine transform: pixel → coordinates

    for zone_id in range(1, num_features + 1):
        zone_mask = labeled_array == zone_id
        area_pixels = int(np.sum(zone_mask))

        if area_pixels < min_area_pixels:
            continue  # Skip tiny noise zones

        # Zone statistics
        zone_lst = lst[zone_mask]
        zone_mean_lst  = float(np.nanmean(zone_lst))
        zone_max_lst   = float(np.nanmax(zone_lst))
        heat_intensity = _classify_intensity(zone_mean_lst)

        # Convert pixel blob to approximate bounding polygon
        rows, cols = np.where(zone_mask)
        polygon_coords = _pixels_to_polygon(rows, cols, transform)

        if polygon_coords is None:
            continue

        # Severity score (0–100) based on temperature
        severity = min(100, int((zone_mean_lst - threshold) / (valid_lst.max() - threshold) * 100))

        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [polygon_coords]
            },
            "properties": {
                "zone_id":        zone_id,
                "mean_lst":       round(zone_mean_lst, 2),
                "max_lst":        round(zone_max_lst, 2),
                "area_pixels":    area_pixels,
                "area_ha":        round(area_pixels * 0.09, 2),  # 30m × 30m = 900m²
                "heat_intensity": heat_intensity,
                "severity_score": severity,
                "threshold_used": round(threshold, 2)
            }
        }
        geojson_features.append(feature)

    # Sort by severity descending (worst zones first)
    geojson_features.sort(key=lambda f: f["properties"]["severity_score"], reverse=True)
    return geojson_features


def _classify_intensity(mean_lst: float) -> str:
    """Classify heat intensity label from mean LST."""
    if mean_lst >= 45:
        return "critical"
    elif mean_lst >= 40:
        return "high"
    elif mean_lst >= 35:
        return "moderate"
    else:
        return "low"


def _pixels_to_polygon(rows: np.ndarray, cols: np.ndarray, transform) -> Optional[list]:
    """
    Convert pixel row/col indices to geographic coordinate polygon.
    Uses convex hull of pixel centers for a clean polygon.
    Uses rasterio affine transform to go from pixel space → lon/lat.
    """
    if len(rows) == 0:
        return None

    # Compute bounding box of pixels (faster than full convex hull for prototype)
    r_min, r_max = int(rows.min()), int(rows.max())
    c_min, c_max = int(cols.min()), int(cols.max())

    # Convert pixel corners to geographic coordinates using affine transform
    # rasterio transform: (col, row) → (lon, lat)
    def px_to_coords(row, col):
        lon = transform.c + col * transform.a + row * transform.b
        lat = transform.f + col * transform.d + row * transform.e
        return [round(lon, 6), round(lat, 6)]

    # Create closed ring polygon (5 points, last = first)
    polygon = [
        px_to_coords(r_min, c_min),
        px_to_coords(r_min, c_max),
        px_to_coords(r_max, c_max),
        px_to_coords(r_max, c_min),
        px_to_coords(r_min, c_min),  # Close the ring
    ]
    return polygon


def lst_to_geojson_grid(
    lst: np.ndarray,
    profile: dict,
    downsample: int = 5  # Reduce resolution for web transfer (every Nth pixel)
) -> dict:
    """
    Convert the full LST raster to a lightweight GeoJSON point grid.
    Used for the background heatmap layer.
    Downsamples to reduce payload size.
    """
    transform = profile["transform"]
    rows, cols = lst.shape
    features = []

    for r in range(0, rows, downsample):
        for c in range(0, cols, downsample):
            val = lst[r, c]
            if np.isnan(val):
                continue
            lon = transform.c + c * transform.a + r * transform.b
            lat = transform.f + c * transform.d + r * transform.e
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [round(lon, 5), round(lat, 5)]},
                "properties": {"lst": round(float(val), 2)}
            })

    return {"type": "FeatureCollection", "features": features}