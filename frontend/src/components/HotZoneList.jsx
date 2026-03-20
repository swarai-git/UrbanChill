import React, { useState, useEffect } from "react";

const INTENSITY_COLOR = {
  critical: "#ef4444",
  high:     "#fb923c",
  moderate: "#fde047",
  low:      "#86efac"
};

// Reverse geocode with longer timeout and better fallback
async function getAreaName(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const a = data.address || {};
    return (
      a.neighbourhood || a.suburb || a.quarter ||
      a.city_district  || a.district || a.county ||
      a.city || "Area " + lat.toFixed(3) + "°N"
    );
  } catch {
    return "Area " + lat.toFixed(3) + "°N";
  }
}

function ZoneItem({ zone, index }) {
  const p     = zone.properties;
  const color = INTENSITY_COLOR[p.heat_intensity] || "#fb923c";

  const coords = zone.geometry?.coordinates?.[0] || [];
  const avgLat  = coords.length ? coords.reduce((s, c) => s + c[1], 0) / coords.length : null;
  const avgLon  = coords.length ? coords.reduce((s, c) => s + c[0], 0) / coords.length : null;

  const [areaName, setAreaName] = useState(
    avgLat ? `${avgLat.toFixed(4)}°N, ${avgLon.toFixed(4)}°E` : "Loading…"
  );

  useEffect(() => {
    if (!avgLat || !avgLon) return;
    // Stagger: 600ms per zone so Nominatim isn't rate-limited
    const timer = setTimeout(() => {
      getAreaName(avgLat, avgLon).then(name => setAreaName(name));
    }, index * 600);
    return () => clearTimeout(timer);
  }, [avgLat, avgLon, index]);

  return (
    <div className="zone-item" style={{ borderLeftColor: color }}>
      <div className="zone-header">
        <span className="zone-intensity" style={{ color }}>
          {p.heat_intensity.toUpperCase()}
        </span>
        <span className="zone-score">Score: {p.severity_score}/100</span>
      </div>
      {/* Area name always shown */}
      <div style={{
        fontSize: 12, fontWeight: 600, color: "#e2e8f0",
        marginBottom: 4, display: "flex", alignItems: "center", gap: 4
      }}>
        <span>📍</span> {areaName}
      </div>
      <div className="zone-details">
        <span>Avg {p.mean_lst}°C</span>
        <span>·</span>
        <span>Peak {p.max_lst}°C</span>
        <span>·</span>
        <span>{p.area_ha} ha</span>
      </div>
    </div>
  );
}

export default function HotZoneList({ zones }) {
  if (!zones || zones.length === 0) return null;

  return (
    <div className="result-card">
      <h3>Heat Traps Detected <span className="badge">{zones.length}</span></h3>
      <div className="zone-list">
        {zones.slice(0, 8).map((zone, i) => (
          <ZoneItem key={i} zone={zone} index={i} />
        ))}
        {zones.length > 8 && (
          <p className="zone-more">+{zones.length - 8} more zones</p>
        )}
      </div>
      <div className="recommendation-placeholder">
        <span className="rec-icon">🤖</span>
        <div>
          <p className="rec-title">AI Policy Recommendations</p>
          <p className="rec-sub">Coming soon — LLM agent will suggest targeted cooling interventions for each zone</p>
        </div>
      </div>
    </div>
  );
}