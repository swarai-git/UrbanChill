import React from "react";

const INTENSITY_COLOR = {
  critical: "#ef4444",
  high:     "#fb923c",
  moderate: "#fde047",
  low:      "#86efac"
};

export default function HotZoneList({ zones }) {
  if (!zones || zones.length === 0) return null;

  return (
    <div className="result-card">
      <h3>Heat Traps Detected <span className="badge">{zones.length}</span></h3>

      <div className="zone-list">
        {zones.slice(0, 8).map((zone, i) => {
          const p     = zone.properties;
          const color = INTENSITY_COLOR[p.heat_intensity] || "#fb923c";
          return (
            <div key={i} className="zone-item" style={{ borderLeftColor: color }}>
              <div className="zone-header">
                <span className="zone-intensity" style={{ color }}>
                  {p.heat_intensity.toUpperCase()}
                </span>
                <span className="zone-score">Score: {p.severity_score}/100</span>
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
        })}
        {zones.length > 8 && (
          <p className="zone-more">+{zones.length - 8} more zones</p>
        )}
      </div>

      {/* ── Recommendation placeholder — Feature 8 (LLM Agent) ── */}
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