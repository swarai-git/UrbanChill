import { motion } from "framer-motion";
import { Layers, Thermometer, TreePine, Building2, MapPin } from "lucide-react";

const layers = [
  { key: "heat", label: "Heat Map", icon: Thermometer, color: "#FF8C00" },
  { key: "vegetation", label: "Vegetation", icon: TreePine, color: "#00FF88" },
  { key: "buildings", label: "Buildings", icon: Building2, color: "#9CA3AF" },
  { key: "roads", label: "Roads", icon: MapPin, color: "#FFD700" },
];

export function LayerToggle({ activeLayers, onToggle }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="absolute left-4 bottom-24 z-30"
    >
      <div
        className="flex flex-col gap-1 p-2 rounded-2xl"
        style={{
          background: "rgba(3, 8, 22, 0.82)",
          backdropFilter: "blur(28px) saturate(1.2)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center gap-2 px-2 py-1 mb-1">
          <Layers className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[9px] font-mono text-white/40 tracking-widest">LAYERS</span>
        </div>
        
        {layers.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200"
            style={{
              background: activeLayers[key] ? `${color}15` : "transparent",
              border: `1px solid ${activeLayers[key] ? color + "40" : "transparent"}`,
            }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
              style={{ 
                background: activeLayers[key] ? color : "rgba(255,255,255,0.05)",
              }}
            >
              <Icon 
                className="w-3.5 h-3.5" 
                style={{ color: activeLayers[key] ? "#000" : "rgba(255,255,255,0.3)" }} 
              />
            </div>
            <span 
              className="text-xs font-medium transition-colors"
              style={{ color: activeLayers[key] ? color : "rgba(255,255,255,0.4)" }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
