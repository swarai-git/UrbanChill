import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMapEvents, useMap, Rectangle } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import StatsPanel from "./components/StatsPanel";
import HotZoneList from "./components/HotZoneList";
import LSTLegend from "./components/LSTLegend";
import "leaflet/dist/leaflet.css";
import "./App.css";

const API_BASE = "http://localhost:8000/api";

function lstToColor(lst) {
  if (lst < 25) return "#3b82f6";
  if (lst < 30) return "#22d3ee";
  if (lst < 35) return "#86efac";
  if (lst < 38) return "#fde047";
  if (lst < 42) return "#fb923c";
  if (lst < 46) return "#ef4444";
  return "#7f1d1d";
}

function intensityToColor(i) {
  return { critical: "#ef4444", high: "#fb923c", moderate: "#fde047", low: "#86efac" }[i] || "#fb923c";
}

// ── Reverse geocode: lat/lon → area name using OpenStreetMap Nominatim ──
async function getAreaName(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const a = data.address;
    // Return most specific name available
    return (
      a.neighbourhood || a.suburb || a.quarter ||
      a.city_district  || a.district || a.county ||
      a.city || "Unknown area"
    );
  } catch {
    return "Unknown area";
  }
}

// ── LST heatmap dots with reverse geocoding on click ──
function LSTGridLayer({ data, bbox }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features?.length) return;

    const zoom   = map.getZoom();
    const radius = zoom >= 14 ? 7 : zoom >= 12 ? 5 : 4;

    const group = L.layerGroup();

    data.features.forEach(f => {
      const [lon, lat] = f.geometry.coordinates;
      const lst = f.properties.lst;

      const marker = L.circleMarker([lat, lon], {
        radius,
        fillColor:   lstToColor(lst),
        color:       "rgba(0,0,0,0.2)",
        weight:      0.5,
        fillOpacity: 0.88,
      });

      // On click: reverse geocode and show area name + temp
      marker.on("click", async () => {
        const areaName = await getAreaName(lat, lon);
        marker.bindPopup(`
          <div style="font-family:sans-serif;min-width:180px;padding:4px">
            <div style="font-weight:700;font-size:13px;margin-bottom:6px">📍 ${areaName}</div>
            <table style="width:100%;font-size:12px">
              <tr>
                <td style="color:#666">Surface Temp</td>
                <td style="font-weight:700;color:${lstToColor(lst)}">${lst.toFixed(1)}°C</td>
              </tr>
              <tr>
                <td style="color:#666">Coordinates</td>
                <td style="font-size:10px">${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</td>
              </tr>
              <tr>
                <td style="color:#666">Heat level</td>
                <td style="color:${lstToColor(lst)};font-weight:600">
                  ${lst >= 46 ? "🔴 Critical" : lst >= 42 ? "🟠 Very hot" : lst >= 38 ? "🟡 Hot" : lst >= 35 ? "🟡 Warm" : "🔵 Cool"}
                </td>
              </tr>
            </table>
          </div>
        `).openPopup();
      });

      // Hover tooltip shows temp instantly
      marker.bindTooltip(`${lst.toFixed(1)}°C`, { direction: "top", offset: [0, -4] });
      group.addLayer(marker);
    });

    group.addTo(map);

    // Zoom to bbox, NOT to dot bounds (fixes world-map zoom bug)
    if (bbox) {
      map.fitBounds(
        [[bbox.min_lat, bbox.min_lon], [bbox.max_lat, bbox.max_lon]],
        { padding: [60, 60], maxZoom: 14 }
      );
    }

    return () => map.removeLayer(group);
  }, [data, map, bbox]);

  return null;
}

// ── Hot zone polygons with reverse geocoded area name ──
function makeHotZonePopup(feature, layer) {
  const p     = feature.properties;
  const color = intensityToColor(p.heat_intensity);

  // Compute polygon centroid for geocoding
  const coords = feature.geometry.coordinates[0];
  const avgLat  = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const avgLon  = coords.reduce((s, c) => s + c[0], 0) / coords.length;

  layer.on("click", async () => {
    const areaName = await getAreaName(avgLat, avgLon);
    layer.bindPopup(`
      <div style="font-family:sans-serif;min-width:220px;padding:4px">
        <div style="color:${color};font-weight:700;font-size:14px;margin-bottom:4px">
          ${p.heat_intensity.toUpperCase()} HEAT ZONE
        </div>
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">📍 ${areaName}</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <tr><td style="color:#888;padding:2px 0">Average temp</td><td style="font-weight:700;color:${color}">${p.mean_lst}°C</td></tr>
          <tr><td style="color:#888;padding:2px 0">Peak temp</td>   <td style="font-weight:700;color:${color}">${p.max_lst}°C</td></tr>
          <tr><td style="color:#888;padding:2px 0">Zone area</td>   <td>${p.area_ha} hectares</td></tr>
          <tr><td style="color:#888;padding:2px 0">Severity</td>    <td>${p.severity_score}/100</td></tr>
        </table>
        <div style="margin-top:8px;padding:6px;background:#1a1a2e;border-radius:4px;font-size:11px;color:#94a3b8">
          Zone ID: ${p.zone_id} · Threshold used: ${p.threshold_used}°C
        </div>
      </div>
    `).openPopup();
  });
}

function hotZoneStyle(feature) {
  const intensity = feature.properties.heat_intensity;
  return {
    color:       intensityToColor(intensity),
    weight:      intensity === "critical" ? 3 : 2,
    fillColor:   intensityToColor(intensity),
    fillOpacity: intensity === "critical" ? 0.45 : 0.25,
    dashArray:   intensity === "critical" ? null : "5 4"
  };
}

// ── BBox drawer with live preview rectangle ──
function BBoxDrawer({ drawing, startPoint, setStartPoint, setDrawing, setBbox, onAnalyse, setPreviewBbox }) {
  useMapEvents({
    click(e) {
      if (!drawing) return;
      if (!startPoint) {
        setStartPoint(e.latlng);
        setPreviewBbox(null);
      } else {
        const newBbox = {
          min_lon: Math.min(startPoint.lng, e.latlng.lng),
          min_lat: Math.min(startPoint.lat, e.latlng.lat),
          max_lon: Math.max(startPoint.lng, e.latlng.lng),
          max_lat: Math.max(startPoint.lat, e.latlng.lat),
        };
        setBbox(newBbox);
        setPreviewBbox(newBbox);
        setStartPoint(null);
        setDrawing(false);
        onAnalyse(newBbox);
      }
    },
    mousemove(e) {
      if (!drawing || !startPoint) return;
      setPreviewBbox({
        min_lon: Math.min(startPoint.lng, e.latlng.lng),
        min_lat: Math.min(startPoint.lat, e.latlng.lat),
        max_lon: Math.max(startPoint.lng, e.latlng.lng),
        max_lat: Math.max(startPoint.lat, e.latlng.lat),
      });
    }
  });
  return null;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="live-clock">
      <span className="clock-dot" />
      <span>{time.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
      <span className="clock-sep">·</span>
      <span>{time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      <span className="clock-sep">·</span>
      <span style={{ color: "#64748b" }}>IST</span>
    </div>
  );
}

export default function App() {
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState(null);
  const [result,      setResult]      = useState(null);
  const [bbox,        setBbox]        = useState(null);
  const [drawing,     setDrawing]     = useState(false);
  const [startPoint,  setStartPoint]  = useState(null);
  const [previewBbox, setPreviewBbox] = useState(null);

  async function runAnalysis(bboxToUse) {
    const target = bboxToUse || bbox;
    if (!target) return;

    const lonSpan = target.max_lon - target.min_lon;
    const latSpan = target.max_lat - target.min_lat;
    if (lonSpan > 0.3 || latSpan > 0.3) {
      setError(
        `Area too large (${lonSpan.toFixed(2)}° × ${latSpan.toFixed(2)}°). ` +
        "Zoom into one neighbourhood and draw a smaller box."
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await axios.post(`${API_BASE}/heatmap/detect`, {
        ...target,
        date_range: "auto",
        max_cloud:  30,
        percentile: 75
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const bboxBounds = previewBbox
    ? [[previewBbox.min_lat, previewBbox.min_lon], [previewBbox.max_lat, previewBbox.max_lon]]
    : null;

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🌡</span>
            <div><h1>UrbanChill AI</h1><p>Urban Heat Resilience</p></div>
          </div>
          <LiveClock />
        </div>

        <div className="sidebar-body">
          <div className="control-card">
            <h3>Analyse Area</h3>
            <div className="size-guide">
              <span className="size-guide-icon">💡</span>
              <p>Zoom into <strong>one area</strong> (Dharavi, BKC, Andheri) then draw a small box. Click any dot or zone to see the <strong>area name</strong>.</p>
            </div>
            <p className="hint">
              {drawing
                ? startPoint ? "✦ Click second corner" : "✦ Click first corner on map"
                : "Draw a box on the map to start analysis"}
            </p>
            <button
              className={`btn-primary ${drawing ? "btn-active" : ""}`}
              onClick={() => { setDrawing(true); setStartPoint(null); setPreviewBbox(null); }}
              disabled={isLoading}
            >
              {drawing ? "Drawing… click map" : "▣  Draw Region"}
            </button>
            {bbox && !drawing && (
              <button className="btn-secondary" onClick={() => runAnalysis()} disabled={isLoading}>
                ↺  Re-run Analysis
              </button>
            )}
          </div>

          {isLoading && (
            <div className="loading-card">
              <div className="spinner" />
              <div>
                <p className="loading-title">Fetching satellite data…</p>
                <p className="loading-sub">Landsat-9 · Planetary Computer · LST calibration</p>
              </div>
            </div>
          )}

          {error && <div className="error-card"><span>⚠</span><p>{error}</p></div>}

          {!result && !isLoading && (
            <div className="legend-guide-card">
              <h3>How to read the map</h3>
              <div className="guide-row"><span style={{background:"#3b82f6"}} className="guide-swatch"/>Cool (below 25°C)</div>
              <div className="guide-row"><span style={{background:"#86efac"}} className="guide-swatch"/>Mild (30–35°C)</div>
              <div className="guide-row"><span style={{background:"#fde047"}} className="guide-swatch"/>Warm (35–38°C)</div>
              <div className="guide-row"><span style={{background:"#fb923c"}} className="guide-swatch"/>Hot (38–42°C)</div>
              <div className="guide-row"><span style={{background:"#ef4444"}} className="guide-swatch"/>Very hot (42–46°C)</div>
              <div className="guide-row"><span style={{background:"#7f1d1d"}} className="guide-swatch"/>Critical (above 46°C)</div>
              <p className="guide-note">Each dot = 30m × 30m pixel · Click dot/zone for area name</p>
            </div>
          )}

          {result && (
            <>
              <StatsPanel stats={result.stats} sceneInfo={result.scene_info} />
              <HotZoneList zones={result.hot_zones?.features || []} />
            </>
          )}
        </div>
      </aside>

      <main className="map-area">
        {drawing && (
          <div className="map-overlay-hint">
            {startPoint ? "📍 Click second corner" : "📍 Zoom in first, then click first corner"}
          </div>
        )}

        <MapContainer center={[19.07, 72.88]} zoom={13} style={{ width: "100%", height: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />

          <BBoxDrawer
            drawing={drawing}
            startPoint={startPoint}
            setStartPoint={setStartPoint}
            setDrawing={setDrawing}
            setBbox={setBbox}
            onAnalyse={runAnalysis}
            setPreviewBbox={setPreviewBbox}
          />

          {bboxBounds && (
            <Rectangle
              bounds={bboxBounds}
              pathOptions={{ color: "#3b82f6", weight: 2, fillOpacity: 0.05, dashArray: "6 4" }}
            />
          )}

          {/* Pass bbox so zoom goes to drawn area, not world */}
          {result?.lst_grid && (
            <LSTGridLayer data={result.lst_grid} bbox={bbox} />
          )}

          {result?.hot_zones && (
            <GeoJSON
              key={result.scene_info?.scene_id}
              data={result.hot_zones}
              style={hotZoneStyle}
              onEachFeature={makeHotZonePopup}
            />
          )}
        </MapContainer>

        <LSTLegend />
      </main>
    </div>
  );
}