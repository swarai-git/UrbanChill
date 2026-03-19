import React from "react";

const SCALE = [
  { label: "< 25°C", color: "#3b82f6" },
  { label: "25–30°C", color: "#22d3ee" },
  { label: "30–35°C", color: "#86efac" },
  { label: "35–38°C", color: "#fde047" },
  { label: "38–42°C", color: "#fb923c" },
  { label: "42–46°C", color: "#ef4444" },
  { label: "> 46°C",  color: "#7f1d1d" },
];

export default function LSTLegend() {
  return (
    <div className="map-legend">
      <p className="legend-title">Land Surface Temp</p>
      {SCALE.map(({ label, color }) => (
        <div key={label} className="legend-row">
          <span className="legend-swatch" style={{ background: color }} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}