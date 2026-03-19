"""
Feature 3: LST Processing Pipeline
Landsat C2L2 already provides Surface Temperature — we just need to:
1. Mask water pixels using NDVI
2. Compute NDVI
3. Generate statistics

The old DN→Radiance→BT→LST pipeline was wrong because it re-processed
already-calibrated data, causing 55°C saturation everywhere.
"""
import numpy as np


def compute_ndvi(red: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """
    NDVI = (NIR - Red) / (NIR + Red)
    Landsat C2L2 reflectance bands use scale 0.0000275, offset -0.2
    """
    red_r = np.clip(red * 0.0000275 - 0.2, 0.001, 1.0)
    nir_r = np.clip(nir * 0.0000275 - 0.2, 0.001, 1.0)
    return np.clip((nir_r - red_r) / (nir_r + red_r), -1.0, 1.0)


def mask_water_pixels(lst: np.ndarray, ndvi: np.ndarray) -> np.ndarray:
    """
    Mask ocean, rivers, lakes (NDVI < -0.1 = water).
    Critical for coastal cities — water pixels skew all statistics.
    """
    masked = lst.copy().astype(np.float32)
    masked[ndvi < -0.1] = np.nan
    return masked


def run_lst_pipeline(
    st_celsius: np.ndarray,   # Already calibrated ST from satellite.py
    red_band:   np.ndarray,
    nir_band:   np.ndarray
) -> dict:
    """
    Process pre-calibrated Surface Temperature from Landsat C2L2.
    Computes NDVI, masks water, returns stats.
    """
    # Align optical bands to ST grid if shapes differ slightly
    if red_band.shape != st_celsius.shape:
        from scipy.ndimage import zoom
        scale    = (st_celsius.shape[0] / red_band.shape[0],
                    st_celsius.shape[1] / red_band.shape[1])
        red_band = zoom(red_band, scale)
        nir_band = zoom(nir_band, scale)

    ndvi = compute_ndvi(red_band, nir_band)
    lst  = mask_water_pixels(st_celsius, ndvi)

    land_pixels = lst[~np.isnan(lst)]
    if len(land_pixels) == 0:
        land_pixels = st_celsius[~np.isnan(st_celsius)]

    stats = {
        "min_celsius":  round(float(np.nanmin(land_pixels)), 1),
        "max_celsius":  round(float(np.nanmax(land_pixels)), 1),
        "mean_celsius": round(float(np.nanmean(land_pixels)), 1),
        "std_celsius":  round(float(np.nanstd(land_pixels)), 1),
        "hot_zone_pct": round(float(np.sum(land_pixels > 38) / len(land_pixels) * 100), 1),
        "mean_ndvi":    round(float(np.nanmean(ndvi)), 3),
        "pixel_count":  int(len(land_pixels)),
        "water_pct":    round(float(np.sum(ndvi < -0.1) / ndvi.size * 100), 1),
    }

    return {"lst": lst, "ndvi": ndvi, "stats": stats}