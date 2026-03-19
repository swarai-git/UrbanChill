import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { TopBar } from "../components/TopBar";
import { MapView } from "../components/MapView";
import { TreePine, Building2, Droplets, Wind, Play, RotateCcw } from "lucide-react";

const API = "http://localhost:8000";

export default function SimulationPage() {
  const { city } = useParams();
  const [zones, setZones] = useState([]);
  const [stats, setStats] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const [treeCount, setTreeCount] = useState(0);
  const [coolRoofPercent, setCoolRoofPercent] = useState(0);
  const [greenCorridorPercent, setGreenCorridorPercent] = useState(0);
  const [waterFeatureArea, setWaterFeatureArea] = useState(0);
  
  const [results, setResults] = useState(null);

  useEffect(() => {
    axios.get(`${API}/api/zones?city=${city || "new_delhi"}`)
      .then(r => {
        setZones(r.data.zones);
        setStats(r.data.stats);
      })
      .catch(() => toast.error("Could not connect to backend"));
  }, [city]);

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const r = await axios.post(`${API}/api/simulate`, {
        city: city || "new_delhi",
        interventions: {
          trees: treeCount,
          cool_roofs: coolRoofPercent,
          green_corridors: greenCorridorPercent,
          water_features: waterFeatureArea
        }
      });
      setResults(r.data);
      toast.success("Simulation complete");
    } catch {
      const mockResults = {
        temperature_delta: -((treeCount * 0.03) + (coolRoofPercent * 0.15) + (greenCorridorPercent * 0.08) + (waterFeatureArea * 0.05)).toFixed(2),
        cost_estimate: (treeCount * 500) + (coolRoofPercent * 2000) + (greenCorridorPercent * 3000) + (waterFeatureArea * 8000),
        timeline_months: Math.max(3, Math.floor((treeCount + coolRoofPercent * 10 + greenCorridorPercent * 15 + waterFeatureArea * 5) / 20))
      };
      setResults(mockResults);
      toast.success("Simulation complete (demo mode)");
    }
    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setTreeCount(0);
    setCoolRoofPercent(0);
    setGreenCorridorPercent(0);
    setWaterFeatureArea(0);
    setResults(null);
  };

  const interventionItems = [
    { 
      key: "trees", 
      label: "Tree Planting", 
      value: treeCount, 
      setValue: setTreeCount, 
      max: 1000,
      icon: TreePine, 
      color: "#00FF88",
      unit: "trees",
      description: "Each mature tree reduces surrounding temp by ~0.5-2°C"
    },
    { 
      key: "cool_roofs", 
      label: "Cool Roofs", 
      value: coolRoofPercent, 
      setValue: setCoolRoofPercent, 
      max: 100,
      icon: Building2, 
      color: "#FF8C00",
      unit: "%",
      description: "Reflective materials reduce roof surface temp by 10-30°C"
    },
    { 
      key: "green_corridors", 
      label: "Green Corridors", 
      value: greenCorridorPercent, 
      setValue: setGreenCorridorPercent, 
      max: 100,
      icon: Wind, 
      color: "#9CA3AF",
      unit: "%",
      description: "Connected green paths create wind channels, reducing heat"
    },
    { 
      key: "water_features", 
      label: "Water Features", 
      value: waterFeatureArea, 
      setValue: setWaterFeatureArea, 
      max: 50,
      icon: Droplets, 
      color: "#9CA3AF",
      unit: "units",
      description: "Evaporative cooling effect based on water surface area"
    },
  ];

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white">
      <TopBar onLocationSelect={() => {}} onGPSClick={() => {}} />
      
      <div className="absolute inset-0 pt-16">
        <MapView
          zones={zones}
          selectedZone={null}
          onZoneClick={() => {}}
          activeLayers={{ heat: true, vegetation: false, buildings: false, roads: false }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute right-4 top-20 bottom-5 w-[380px] z-40 overflow-y-auto"
      >
        <div
          className="h-full rounded-3xl flex flex-col overflow-hidden"
          style={{
            background: "rgba(3, 8, 22, 0.88)",
            backdropFilter: "blur(28px) saturate(1.2)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 0 60px rgba(0,0,0,0.6)",
          }}
        >
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), rgba(255,120,0,0.35), transparent)" }} />
          
          <div className="px-6 pt-5 pb-4 border-b border-white/[0.04]">
          <div className="text-[10px] font-mono text-white/50 tracking-[0.2em] mb-1">SIMULATION ENGINE</div>
            <h2 className="font-display text-2xl font-bold text-white tracking-wider">
              What-If Testing
            </h2>
            <p className="text-white/40 text-sm mt-1">
              Model cooling interventions for {city || "New Delhi"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {interventionItems.map(({ key, label, value, setValue, max, icon: Icon, color, unit, description }) => (
              <div 
                key={key}
                className="p-4 rounded-2xl"
                style={{ 
                  background: "rgba(0,0,0,0.25)", 
                  border: `1px solid ${color}20` 
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <span className="text-sm font-medium text-white">{label}</span>
                  </div>
                  <span className="text-lg font-bold" style={{ color }}>
                    {value} <span className="text-xs font-normal text-white/40">{unit}</span>
                  </span>
                </div>
                
                <input
                  type="range"
                  min="0"
                  max={max}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ 
                    background: `linear-gradient(to right, ${color} 0%, ${color} ${(value/max)*100}%, rgba(255,255,255,0.1) ${(value/max)*100}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
                <p className="text-[10px] text-white/30 mt-2">{description}</p>
              </div>
            ))}

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={runSimulation}
                disabled={isSimulating}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm"
                style={{ 
                  background: "linear-gradient(135deg, #111111 0%, #000000 100%)",
                  color: "#ffffff",
                  boxShadow: "0 0 20px rgba(255,255,255,0.06)"
                }}
              >
                {isSimulating ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isSimulating ? "Running..." : "Run Simulation"}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetSimulation}
                className="px-4 py-3 rounded-xl font-medium text-sm"
                style={{ 
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)"
                }}
              >
                Reset
              </motion.button>
            </div>

            {results && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)" }} />
                
                <div className="text-[10px] font-mono text-white/50 tracking-[0.2em]">SIMULATION RESULTS</div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)" }}>
                    <div className="text-2xl font-bold text-emerald-400">
                      {results.temperature_delta}°C
                    </div>
                    <div className="text-[9px] text-white/40 mt-1">Temp Change</div>
                  </div>
                  
                  <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }}>
                    <div className="text-2xl font-bold text-white/80">
                      ${results.cost_estimate?.toLocaleString() || "—"}
                    </div>
                    <div className="text-[9px] text-white/40 mt-1">Est. Cost</div>
                  </div>
                  
                  <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,120,0,0.08)", border: "1px solid rgba(255,120,0,0.2)" }}>
                    <div className="text-2xl font-bold text-orange-400">
                      {results.timeline_months || "—"}
                    </div>
                    <div className="text-[9px] text-white/40 mt-1">Months</div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
