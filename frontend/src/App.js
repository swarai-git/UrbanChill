import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, Polygon } from "react-leaflet";
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

// ── Reverse geocode: lat/lon → area name ──
async function getAreaName(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const a = data.address;
    return (
      a.neighbourhood || a.suburb || a.quarter ||
      a.city_district  || a.district || a.county ||
      a.city || "Unknown area"
    );
  } catch {
    return "Unknown area";
  }
}

// ── Forward geocode: search query → results list ──
async function searchLocation(query) {
  try {
    const params = new URLSearchParams({
      q:              query,
      format:         "json",
      limit:          "5",
      addressdetails: "1",
      countrycodes:   "in",
      viewbox:        "72.6,18.8,73.2,19.4",
      bounded:        "0",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "Accept-Language": "en" } }
    );
    return await res.json();
  } catch {
    return [];
  }
}

// ── LST stat dots ──
// Shows exactly 3 dots on the map matching the left panel stats:
// MIN LST (coolest spot), MEAN LST (average spot), MAX LST (hottest spot)
function LSTGridLayer({ data, bbox }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features?.length) return;

    const features = data.features;
    const vals = features.map(f => f.properties.lst);
    const minVal  = Math.min(...vals);
    const maxVal  = Math.max(...vals);
    const meanVal = vals.reduce((a, b) => a + b, 0) / vals.length;

    // Find feature closest to each stat value
    function closest(target) {
      return features.reduce((best, f) =>
        Math.abs(f.properties.lst - target) < Math.abs(best.properties.lst - target) ? f : best
      );
    }

    const STATS = [
      { key: "MIN LST",  feature: closest(minVal),  value: minVal  },
      { key: "MEAN LST", feature: closest(meanVal), value: meanVal },
      { key: "MAX LST",  feature: closest(maxVal),  value: maxVal  },
    ];

    const group = L.layerGroup();

    STATS.forEach(({ key, feature, value }) => {
      const [lon, lat] = feature.geometry.coordinates;
      const lst   = feature.properties.lst;
      const color = lstToColor(lst);

      // Dot
      const dot = L.circleMarker([lat, lon], {
        radius:      16,
        fillColor:   color,
        color:       "#fff",
        weight:      3,
        fillOpacity: 0.97,
      });

      // Label above dot
      const labelIcon = L.divIcon({
        className: "",
        html: `<div class="lst-dot-label" style="background:${color};color:${lst > 35 ? '#000' : '#000'}">
                 <span style="font-size:9px;opacity:0.8">${key}</span><br/>${lst.toFixed(1)}°C
               </div>`,
        iconAnchor: [40, 44],
        iconSize:   [80, 38],
      });
      const labelMarker = L.marker([lat, lon], {
        icon: labelIcon, interactive: false, zIndexOffset: 100,
      });

      dot.on("click", async () => {
        const areaName = await getAreaName(lat, lon);
        dot.bindPopup(`
          <div style="font-family:sans-serif;min-width:190px;padding:4px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                background:${color};margin-right:5px;vertical-align:middle"></span>
              ${key}
            </div>
            <div style="font-size:12px;color:#555;margin-bottom:6px">📍 ${areaName}</div>
            <table style="width:100%;font-size:12px">
              <tr>
                <td style="color:#666">Surface Temp</td>
                <td style="font-weight:700;color:${color}">${lst.toFixed(1)}°C</td>
              </tr>
              <tr>
                <td style="color:#666">Coordinates</td>
                <td style="font-size:10px">${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</td>
              </tr>
              <tr>
                <td style="color:#666">Heat level</td>
                <td style="color:${color};font-weight:600">
                  ${lst >= 46 ? "🔴 Critical" : lst >= 42 ? "🟠 Very hot" : lst >= 38 ? "🟡 Hot" : lst >= 35 ? "🟡 Warm" : "🔵 Cool"}
                </td>
              </tr>
            </table>
          </div>
        `).openPopup();
      });

      dot.bindTooltip(`${key}: ${lst.toFixed(1)}°C`, { direction: "top", offset: [0, -10] });

      group.addLayer(dot);
      group.addLayer(labelMarker);
    });

    group.addTo(map);

    if (bbox) {
      map.fitBounds(
        [[bbox.min_lat, bbox.min_lon], [bbox.max_lat, bbox.max_lon]],
        { padding: [60, 60], maxZoom: 15 }
      );
    }

    return () => map.removeLayer(group);
  }, [data, map, bbox]);

  return null;
}

// ── Hot zone polygons ──
function makeHotZonePopup(feature, layer) {
  const p      = feature.properties;
  const color  = intensityToColor(p.heat_intensity);
  const coords = feature.geometry.coordinates[0];
  const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const avgLon = coords.reduce((s, c) => s + c[0], 0) / coords.length;

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

// ── Freehand pencil draw ──
function FreehandDrawer({ drawing, onDrawComplete, onDrawCancel }) {
  const map          = useMap();
  const isDrawing    = useRef(false);
  const points       = useRef([]);
  const canvasRef    = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!drawing) return;

    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();

    const mapContainer = map.getContainer();
    const canvas = document.createElement("canvas");
    canvas.width  = mapContainer.offsetWidth;
    canvas.height = mapContainer.offsetHeight;
    canvas.style.cssText = `
      position:absolute;top:0;left:0;
      width:100%;height:100%;
      z-index:1000;cursor:crosshair;
    `;
    mapContainer.appendChild(canvas);
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pts = points.current;
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = "rgba(59,130,246,0.15)";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = "round";
      ctx.lineCap     = "round";
      ctx.setLineDash([]);
      ctx.stroke();
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const src  = e.touches ? e.touches[0] : e;
      return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    }

    function onStart(e) {
      e.preventDefault();
      isDrawing.current = true;
      points.current    = [getPos(e)];
    }

    function onMove(e) {
      if (!isDrawing.current) return;
      e.preventDefault();
      const pos  = getPos(e);
      const last = points.current[points.current.length - 1];
      const dx   = pos.x - last.x, dy = pos.y - last.y;
      if (dx * dx + dy * dy > 9) {
        points.current.push(pos);
        animFrameRef.current = requestAnimationFrame(render);
      }
    }

    function onEnd(e) {
      if (!isDrawing.current) return;
      e.preventDefault();
      isDrawing.current = false;
      if (points.current.length < 8) { onDrawCancel(); return; }
      const latlngs = points.current.map(p => map.containerPointToLatLng(L.point(p.x, p.y)));
      const lats = latlngs.map(ll => ll.lat);
      const lons = latlngs.map(ll => ll.lng);
      onDrawComplete({
        latlngs,
        bbox: {
          min_lat: Math.min(...lats), max_lat: Math.max(...lats),
          min_lon: Math.min(...lons), max_lon: Math.max(...lons),
        },
      });
    }

    canvas.addEventListener("mousedown",  onStart);
    canvas.addEventListener("mousemove",  onMove);
    canvas.addEventListener("mouseup",    onEnd);
    canvas.addEventListener("mouseleave", onEnd);
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove",  onMove,  { passive: false });
    canvas.addEventListener("touchend",   onEnd,   { passive: false });

    return () => {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      canvas.removeEventListener("mousedown",  onStart);
      canvas.removeEventListener("mousemove",  onMove);
      canvas.removeEventListener("mouseup",    onEnd);
      canvas.removeEventListener("mouseleave", onEnd);
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove",  onMove);
      canvas.removeEventListener("touchend",   onEnd);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvasRef.current = null;
      points.current    = [];
      isDrawing.current = false;
    };
  }, [drawing, map, onDrawComplete, onDrawCancel]);

  return null;
}

// ── Fly to location + show label pin ──
function MapFlyTo({ target }) {
  const map    = useMap();
  const pinRef = useRef(null);

  useEffect(() => {
    if (!target) return;
    if (pinRef.current) { pinRef.current.remove(); pinRef.current = null; }

    const name = target.label.split(",")[0];
    const icon = L.divIcon({
      className: "",
      html: `<div class="search-pin-wrap">
               <div class="search-pin-label">${name}</div>
               <div class="search-pin-dot"><div class="search-pin-pulse"></div></div>
             </div>`,
      iconSize:   [160, 60],
      iconAnchor: [80, 60],
    });

    const marker = L.marker([target.lat, target.lon], {
      icon, zIndexOffset: 9999, interactive: false,
    }).addTo(map);
    pinRef.current = marker;
    map.flyTo([target.lat, target.lon], target.zoom || 13, { duration: 1.4 });

    return () => {
      if (pinRef.current) { pinRef.current.remove(); pinRef.current = null; }
    };
  }, [target, map]);

  return null;
}

// ── Search Bar ──
function SearchBar({ onSelect }) {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop,  setShowDrop]  = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowDrop(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const data = await searchLocation(val);
      setResults(data);
      setShowDrop(true);
      setSearching(false);
    }, 400);
  }

  function handleSelect(item) {
    setQuery(item.display_name.split(",")[0]);
    setShowDrop(false);
    setResults([]);
    onSelect({
      lat:   parseFloat(item.lat),
      lon:   parseFloat(item.lon),
      zoom:  14,
      label: item.display_name.split(",").slice(0, 2).join(", "),
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter"  && results.length > 0) handleSelect(results[0]);
    if (e.key === "Escape") setShowDrop(false);
  }

  return (
    <div className="search-bar-wrapper" ref={wrapperRef}>
      <div className="search-bar-input-row">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          placeholder="Search area… Dharavi, BKC, Andheri"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDrop(true)}
          autoComplete="off"
        />
        {searching && <span className="search-spinner" />}
        {query && (
          <button className="search-clear"
            onClick={() => { setQuery(""); setResults([]); setShowDrop(false); }}>✕</button>
        )}
      </div>
      {showDrop && results.length > 0 && (
        <ul className="search-dropdown">
          {results.map((r, i) => (
            <li key={i} className="search-result-item" onClick={() => handleSelect(r)}>
              <span className="result-pin">📍</span>
              <div>
                <div className="result-name">{r.display_name.split(",")[0]}</div>
                <div className="result-sub">{r.display_name.split(",").slice(1,3).join(",").trim()}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Live Clock ──
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="live-clock">
      <span className="clock-dot" />
      <span>{time.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</span>
      <span className="clock-sep">·</span>
      <span>{time.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}</span>
      <span className="clock-sep">·</span>
      <span style={{ color:"#64748b" }}>IST</span>
    </div>
  );
}

// ── Main App ──
export default function App() {
  const [isLoading,     setIsLoading]     = useState(false);
  const [error,         setError]         = useState(null);
  const [result,        setResult]        = useState(null);
  const [bbox,          setBbox]          = useState(null);
  const [drawing,       setDrawing]       = useState(false);
  const [drawnPolygon,  setDrawnPolygon]  = useState(null);
  const [flyTarget,     setFlyTarget]     = useState(null);
  const [searchedLabel, setSearchedLabel] = useState(null);

  async function runAnalysis(bboxToUse) {
    const target = bboxToUse || bbox;
    if (!target) return;
    const lonSpan = target.max_lon - target.min_lon;
    const latSpan = target.max_lat - target.min_lat;
    if (lonSpan > 0.3 || latSpan > 0.3) {
      setError(`Area too large (${lonSpan.toFixed(2)}° × ${latSpan.toFixed(2)}°). Draw a smaller region.`);
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await axios.post(`${API_BASE}/heatmap/detect`, {
        ...target, date_range: "auto", max_cloud: 30, percentile: 75
      });
      const data = response.data;
      console.log("API response keys:", Object.keys(data));
      console.log("lst_grid features:", data.lst_grid?.features?.length ?? "MISSING");
      console.log("sample feature:", JSON.stringify(data.lst_grid?.features?.[0]));
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDrawComplete = useCallback(({ latlngs, bbox: newBbox }) => {
    setDrawing(false);
    setDrawnPolygon(latlngs);
    setBbox(newBbox);
    runAnalysis(newBbox);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrawCancel = useCallback(() => setDrawing(false), []);

  function handleSearchSelect(loc) {
    setFlyTarget({ ...loc, _t: Date.now() });
    setSearchedLabel(loc.label);
    setResult(null);
    setDrawnPolygon(null);
    setBbox(null);
    setError(null);
  }

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
              <span className="size-guide-icon">✏️</span>
              <p><strong>Hold & drag</strong> on the map to draw any shape — like a pencil. Release to analyse.</p>
            </div>
            <p className="hint">
              {drawing ? "✦ Hold & drag on map to draw your region" : "Hold & drag on the map like a pencil"}
            </p>
            <button
              className={`btn-primary ${drawing ? "btn-active" : ""}`}
              onClick={() => { setDrawing(true); setDrawnPolygon(null); setResult(null); setError(null); }}
              disabled={isLoading}
            >
              {drawing ? "✏️  Drawing… drag on map" : "✏️  Draw Region"}
            </button>
            {drawing && (
              <button className="btn-secondary" style={{ marginTop:6 }} onClick={() => setDrawing(false)}>
                ✕  Cancel
              </button>
            )}
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
              <p className="guide-note">One dot per temperature band · Click dot for area name + temp</p>
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
        <div className="map-search-bar">
          <SearchBar onSelect={handleSearchSelect} />
          {searchedLabel && <span className="map-search-label">📍 {searchedLabel}</span>}
        </div>

        {drawing && (
          <div className="map-overlay-hint">
            ✏️  Hold & drag to draw — release to analyse
          </div>
        )}

        <MapContainer center={[19.07, 72.88]} zoom={13} style={{ width:"100%", height:"100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />

          <MapFlyTo target={flyTarget} />

          <FreehandDrawer
            drawing={drawing}
            onDrawComplete={handleDrawComplete}
            onDrawCancel={handleDrawCancel}
          />

          {drawnPolygon && !drawing && (
            <Polygon
              positions={drawnPolygon}
              pathOptions={{ color:"#3b82f6", weight:2, fillColor:"#3b82f6", fillOpacity:0.08, dashArray:"6 4" }}
            />
          )}

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




