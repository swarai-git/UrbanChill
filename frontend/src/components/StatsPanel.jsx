import { motion } from "framer-motion";
import { Thermometer, TreePine, Building2, AlertTriangle } from "lucide-react";
import { getSeverityColorHex } from "../lib/utils";

export function StatsPanel({ stats, isLoading }) {
  if (!stats && !isLoading) return null;

  const statItems = [
    { 
      label: "PEAK LST", 
      value: stats?.peak_lst ? `${stats.peak_lst}°C` : "--", 
      icon: Thermometer,
      color: "#FF8C00"
    },
    { 
      label: "MEAN NDVI", 
      value: stats?.mean_ndvi ? stats.mean_ndvi.toFixed(2) : "--", 
      icon: TreePine,
      color: "#00FF88"
    },
    { 
      label: "BUILT COVER", 
      value: stats?.built_cover ? `${stats.built_cover}%` : "--", 
      icon: Building2,
      color: "#9CA3AF"
    },
    { 
      label: "CRITICAL ZONES", 
      value: stats?.critical_zones ?? "--", 
      icon: AlertTriangle,
      color: "#FF2020"
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute left-4 top-20 z-30"
    >
      <div
        className="flex flex-col gap-2 p-3 rounded-2xl"
        style={{
          background: "rgba(3, 8, 22, 0.82)",
          backdropFilter: "blur(28px) saturate(1.2)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {statItems.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 p-2 rounded-xl"
            style={{
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${color}15` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-[9px] font-mono text-white/40 tracking-widest">{label}</p>
              <p className="text-lg font-bold text-white leading-none">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
