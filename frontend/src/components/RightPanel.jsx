import { motion, AnimatePresence } from "framer-motion";
import { X, Thermometer, Droplets, AlertTriangle, ShieldCheck, Cpu, TreePine, DollarSign, Map } from "lucide-react";
import { getSeverityColorHex } from "../lib/utils";

function SeverityBadge({ severity }) {
  const color = getSeverityColorHex(severity);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest"
      style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      {severity}
    </span>
  );
}

export function RightPanel({ zone, stats, isLoading, recommendation, isRecLoading, onClose, onViewDetailed }) {
  const show = zone !== null || isLoading;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="right-panel"
          initial={{ x: "110%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "110%", opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 220, mass: 0.9 }}
          className="absolute top-20 bottom-5 right-4 z-40 w-[340px] xl:w-[370px] pointer-events-auto"
        >
          <div
            className="w-full h-full rounded-3xl flex flex-col overflow-hidden"
            style={{
              background: "rgba(3, 8, 22, 0.82)",
              backdropFilter: "blur(28px) saturate(1.2)",
              border: "1px solid rgba(255, 255, 255, 0.10)",
              boxShadow: "0 0 60px rgba(0,0,0,0.6), -8px 0 40px rgba(255,255,255,0.03), 0 0 0 0.5px rgba(255,255,255,0.04)",
            }}
          >
            <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), rgba(255,120,0,0.35), transparent)" }} />

            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/[0.04]">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-white/40 tracking-[0.2em] mb-1.5">ZONE ANALYSIS</div>
                <h2 className="font-display text-2xl font-bold text-white tracking-wider leading-none truncate">
                  {isLoading ? "SCANNING…" : (zone?.name || "—")}
                </h2>
                {zone && (
                  <p className="text-white/40 text-sm font-sans mt-1 tracking-wide">
                    {zone.lat.toFixed(4)}°N { (zone.lng || zone.lon).toFixed(4)}°E
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="ml-3 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all duration-200 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-4">
                  <div className="relative w-14 h-14">
                    <div className="absolute inset-0 border-2 border-white/15 rounded-full" />
                    <div className="absolute inset-0 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    <div className="absolute inset-2 border border-t-orange-400/50 border-transparent rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                  </div>
                    <p className="text-white/60 font-mono text-xs tracking-widest animate-pulse">ANALYZING SATELLITE DATA</p>
                </div>
              ) : zone ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-1 rounded-2xl p-4 relative overflow-hidden"
                         style={{ background: "rgba(255,120,0,0.07)", border: "1px solid rgba(255,120,0,0.2)" }}>
                      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full" style={{ background: "rgba(255,120,0,0.12)", filter: "blur(12px)" }} />
                      <div className="flex items-center gap-1.5 mb-2">
                        <Thermometer className="w-3 h-3 text-orange-400" />
                        <span className="text-[9px] font-mono text-white/40 tracking-widest">TEMPERATURE</span>
                      </div>
                      <div className="text-3xl font-display font-bold text-white leading-none">
                        {zone.lst || zone.temperature}<span className="text-orange-400 text-lg ml-0.5">°C</span>
                      </div>
                    </div>

                    <div className="col-span-1 rounded-2xl p-4 relative overflow-hidden"
                         style={{ background: `${getSeverityColorHex(zone.severity)}0d`, border: `1px solid ${getSeverityColorHex(zone.severity)}30` }}>
                      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full" style={{ background: `${getSeverityColorHex(zone.severity)}18`, filter: "blur(12px)" }} />
                      <div className="text-[9px] font-mono text-white/40 tracking-widest mb-2">SEVERITY</div>
                      <div className="text-xl font-display font-bold leading-none" style={{ color: getSeverityColorHex(zone.severity) }}>
                        {zone.severity?.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 flex items-center gap-2.5 p-3 rounded-xl"
                         style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <TreePine className="w-4 h-4 text-green-400 shrink-0" />
                      <div>
                        <p className="text-[9px] font-mono text-white/35 tracking-widest">NDVI</p>
                        <p className="text-base font-bold text-white">{zone.ndvi?.toFixed(2) || "--"}</p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-2.5 p-3 rounded-xl"
                         style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <Droplets className="w-4 h-4 text-white/60 shrink-0" />
                      <div>
                        <p className="text-[9px] font-mono text-white/35 tracking-widest">SVI</p>
                        <p className="text-base font-bold text-white">{zone.svi ? zone.svi.toFixed(2) : "--"}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[9px] font-mono tracking-widest text-emerald-400/80">COOLING STRATEGIES</span>
                    </div>
                    {isRecLoading ? (
                      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                        <div className="w-4 h-4 border-2 border-t-white border-transparent rounded-full animate-spin" />
                        <span className="text-xs text-white/50">Generating AI recommendations...</span>
                      </div>
                    ) : recommendation ? (
                      <div className="p-3 rounded-xl text-xs text-white/65 leading-relaxed whitespace-pre-line"
                           style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                        {recommendation}
                      </div>
                    ) : zone.recommendation ? (
                      <div className="p-3 rounded-xl text-xs text-white/65 leading-relaxed"
                           style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                        {zone.recommendation}
                      </div>
                    ) : (
                      <p className="text-xs text-white/30">No recommendations available</p>
                    )}
                  </div>

                  {zone.roi_annual && (
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <DollarSign className="w-3.5 h-3.5 text-white/60" />
                        <span className="text-[9px] font-mono tracking-widest text-white/60">ANNUAL ROI</span>
                      </div>
                      <div className="p-3 rounded-xl flex items-center gap-3"
                           style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)" }}>
                        <span className="text-2xl font-bold text-emerald-400">${zone.roi_annual.toLocaleString()}</span>
                        <span className="text-xs text-white/40">per year</span>
                      </div>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onViewDetailed}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm"
                    style={{ 
                      background: "linear-gradient(135deg, #111111 0%, #000000 100%)",
                      color: "#ffffff",
                      boxShadow: "0 0 20px rgba(255,255,255,0.06)"
                    }}
                  >
                    <Map className="w-4 h-4" />
                    View Detailed Map
                  </motion.button>

                </motion.div>
              ) : null}
            </div>

            <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)" }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
