import React from "react";

export default function StatsPanel({ stats, sceneInfo }) {
  if (!stats) return null;

  const sceneDate = sceneInfo?.scene_date
    ? new Date(sceneInfo.scene_date).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
      })
    : "—";

  const isRecent   = sceneInfo?.is_recent;
  const daysAgo    = sceneInfo?.days_ago;
  const freshness  = sceneInfo?.freshness || "";

  return (
    <div className="result-card">

      {/* ── Freshness Banner ── */}
      <div className={`freshness-banner ${isRecent ? "fresh" : "stale"}`}>
        <span className="freshness-icon">{isRecent ? "🟢" : "🟡"}</span>
        <div>
          <p className="freshness-title">
            {isRecent ? "Near real-time data" : "Older scene used"}
          </p>
          <p className="freshness-sub">
            {daysAgo !== undefined
              ? `Most recent available Landsat pass — ${freshness}. Today is ${sceneInfo.today}.`
              : "Most recent available Landsat scene for this area."}
          </p>
        </div>
      </div>

      {/* ── Why not exactly today? ── */}
      <div className="info-note">
        <span>ℹ</span>
        <p>
          Landsat orbits every <strong>16 days</strong>. After capture, USGS publishes data in
          1–3 days. So the freshest possible data is always a few days old — this is true
          for all satellite platforms including Google Earth Engine.
        </p>
      </div>

      {/* ── Scene pills ── */}
      {sceneInfo && (
        <div className="scene-meta">
          <span>🛰 {sceneInfo.satellite}</span>
          <span>📅 {sceneDate}</span>
          <span>☁ {sceneInfo.cloud_cover}%</span>
          {daysAgo !== undefined && (
            <span className={daysAgo <= 20 ? "pill-fresh" : "pill-stale"}>
              {daysAgo}d ago
            </span>
          )}
        </div>
      )}

      {/* ── LST Stats ── */}
      <h3 style={{ marginBottom: "8px" }}>Land Surface Temperature</h3>
      <div className="stats-grid">
        <StatBox label="Min LST"     value={`${stats.min_celsius}°C`}  color="#3b82f6" tip="Coolest land pixel — parks, shaded streets"/>
        <StatBox label="Mean LST"    value={`${stats.mean_celsius}°C`} color="#fb923c" tip="Average land surface temperature"/>
        <StatBox label="Max LST"     value={`${stats.max_celsius}°C`}  color="#ef4444" tip="Hottest pixel — likely rooftop or asphalt"/>
        <StatBox label="Hot Zone %"  value={`${stats.hot_zone_pct}%`}  color="#7f1d1d" tip="% of land pixels above 38°C"/>
        <StatBox label="Mean NDVI"   value={stats.mean_ndvi}           color="#22c55e" tip="Vegetation: 0.4+ = dense green, 0–0.2 = bare urban"/>
        <StatBox label="Land Pixels" value={stats.pixel_count?.toLocaleString()} color="#94a3b8" tip="Valid land pixels analysed (water excluded)"/>
      </div>

      <div className="ndvi-guide">
        <span>🌿 NDVI:</span>
        <span className="ndvi-pill" style={{background:"#14532d", color:"#86efac"}}>0.4–1.0 vegetation</span>
        <span className="ndvi-pill" style={{background:"#713f12", color:"#fde047"}}>0.1–0.4 sparse</span>
        <span className="ndvi-pill" style={{background:"#1e293b", color:"#94a3b8"}}>&lt;0.1 bare/urban</span>
      </div>
    </div>
  );
}

function StatBox({ label, value, color, tip }) {
  return (
    <div className="stat-box" style={{ borderLeftColor: color }} title={tip}>
      <span className="stat-value" style={{ color }}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}