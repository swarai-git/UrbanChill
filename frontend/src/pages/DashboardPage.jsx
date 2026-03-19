import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { TopBar } from "../components/TopBar";
import { LeftToolbar } from "../components/LeftToolbar";
import { RightPanel } from "../components/RightPanel";
import { MapView } from "../components/MapView";
import { StatsPanel } from "../components/StatsPanel";
import { LayerToggle } from "../components/LayerToggle";

const API = "http://localhost:8000";

const SEVERITY_ITEMS = [
  { label: "CRITICAL", color: "#FF2020" },
  { label: "HIGH", color: "#FF8C00" },
  { label: "MEDIUM", color: "#FFD700" },
  { label: "LOW", color: "#00FF88" },
];

export default function DashboardPage() {
  const { city } = useParams();
  const [zones, setZones] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [recommendation, setRecommendation] = useState("");
  const [isZonesLoading, setIsZonesLoading] = useState(true);
  const [isRecLoading, setIsRecLoading] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    heat: true,
    vegetation: false,
    buildings: false,
    roads: false,
  });

  useEffect(() => {
    setIsZonesLoading(true);
    const cityParam = city || "new_delhi";
    axios.get(`${API}/api/zones?city=${cityParam}`)
      .then(r => {
        setZones(r.data.zones);
        setStats(r.data.stats);
      })
      .catch(() => toast.error("Could not connect to backend"))
      .finally(() => setIsZonesLoading(false));
  }, [city]);

  const handleZoneClick = async (zone) => {
    setSelectedZone(zone);
    setRecommendation("");
    setIsRecLoading(true);
    
    try {
      const r = await axios.post(`${API}/api/recommend`, {
        name: zone.name,
        temp: zone.lst || zone.temperature,
        ndvi: zone.ndvi || 0.1,
        poverty: zone.svi ? Math.round(zone.svi * 100) : 50
      });
      setRecommendation(r.data.recommendation);
    } catch {
      // Ignore error silently
    } finally {
      setIsRecLoading(false);
    }
  };

  const toggleLayer = (layer) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white">
      <TopBar onLocationSelect={() => {}} onGPSClick={() => {}} />
      
      <div className="absolute inset-0 pt-16">
        <MapView
          zones={zones}
          selectedZone={selectedZone}
          onZoneClick={handleZoneClick}
          activeLayers={activeLayers}
        />
      </div>

      <LeftToolbar />
      
      <StatsPanel stats={stats} isLoading={isZonesLoading} />
      
      <LayerToggle activeLayers={activeLayers} onToggle={toggleLayer} />
      
      <RightPanel
        zone={selectedZone}
        stats={stats}
        isLoading={isZonesLoading}
        recommendation={recommendation}
        isRecLoading={isRecLoading}
        onClose={() => setSelectedZone(null)}
      />

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5 px-5 py-2.5 rounded-2xl"
          style={{
            background: "rgba(3, 8, 22, 0.72)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
          }}
        >
          {SEVERITY_ITEMS.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 7px ${color}` }}
              />
              <span className="text-[10px] font-mono tracking-widest" style={{ color: `${color}aa` }}>
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
