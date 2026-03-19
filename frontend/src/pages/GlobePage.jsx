import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { RightPanel } from "../components/RightPanel";
import GlobeMap from "../components/GlobeMap";
import { LeftToolbar } from "../components/LeftToolbar";
import DetailedMapView from "../components/DetailedMapView";
import { toast } from "sonner";
import axios from "axios";

const API = "http://localhost:8000";

// Lightweight demo data so the globe never feels empty if the API is down
const FALLBACK_ZONES = [
  { name: "Mexico City", lat: 19.4326, lng: -99.1332, severity: "critical", lst: 39, ndvi: 0.24, svi: 0.32 },
  { name: "New Delhi", lat: 28.6139, lng: 77.2090, severity: "high", lst: 38, ndvi: 0.21, svi: 0.4 },
  { name: "Lagos", lat: 6.5244, lng: 3.3792, severity: "medium", lst: 34, ndvi: 0.28, svi: 0.37 },
  { name: "São Paulo", lat: -23.5505, lng: -46.6333, severity: "medium", lst: 33, ndvi: 0.35, svi: 0.31 },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437, severity: "low", lst: 32, ndvi: 0.42, svi: 0.22 }
];

const deriveStats = (zones = []) => {
  if (!zones.length) return null;
  const buckets = zones.reduce((acc, z) => {
    const key = (z.severity || "unknown").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return {
    total: zones.length,
    critical: buckets["critical"] || 0,
    high: buckets["high"] || 0,
    medium: buckets["medium"] || 0,
    low: buckets["low"] || 0
  };
};

export default function GlobePage() {
  const navigate = useNavigate();
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [globeView, setGlobeView] = useState({ zoom: 2, center: { lng: 0, lat: 20 } });
  const [showDetailedMap, setShowDetailedMap] = useState(false);
  
  const [zones, setZones] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [recommendation, setRecommendation] = useState("");
  
  const [isZonesLoading, setIsZonesLoading] = useState(true);
  const [isRecLoading, setIsRecLoading] = useState(false);

  useEffect(() => {
    setIsZonesLoading(true);
    axios.get(`${API}/api/zones`)
      .then(r => {
        setZones(r.data.zones || []);
        setStats(r.data.stats || deriveStats(r.data.zones || []));
      })
      .catch(() => {
        setZones(FALLBACK_ZONES);
        setStats(deriveStats(FALLBACK_ZONES));
      })
      .finally(() => setIsZonesLoading(false));
  }, []);

  const handleLocationSelect = (lat, lon, city) => {
    setSelectedCoords({ lat, lon, city });
  };

  const handleZoneClick = async (zone) => {
    handleLocationSelect(zone.lat, zone.lng || zone.lon, zone.name || zone.city);
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
    } finally {
      setIsRecLoading(false);
    }
  };

  const handleViewDetailed = () => {
    if (selectedZone || selectedCoords) {
      setShowDetailedMap(true);
    }
  };

  useEffect(() => {
    // Auto-open detailed map when user zooms in deeply anywhere on the globe.
    const OPEN_THRESHOLD = 7.5;
    const CLOSE_THRESHOLD = 6.5;

    if (globeView.zoom >= OPEN_THRESHOLD) {
      setShowDetailedMap(true);
    } else if (globeView.zoom < CLOSE_THRESHOLD) {
      setShowDetailedMap(false);
    }
  }, [globeView.zoom]);

  const handleGPSClick = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleLocationSelect(pos.coords.latitude, pos.coords.longitude);
          toast.success("GPS locked to your coordinates.");
        },
        () => toast.error("GPS signal lost. Please enable location access.")
      );
    } else {
      toast.error("GPS hardware not detected.");
    }
  };

  return (
    <main className="relative w-full h-screen overflow-hidden" style={{ background: '#0a0a1a' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <GlobeMap
          heatZones={zones}
          selectedLocation={selectedCoords}
          onZoneClick={handleZoneClick}
          onViewChange={setGlobeView}
        />
      </div>

      {showDetailedMap && (selectedZone || selectedCoords) && (
        <DetailedMapView
          center={{
            lat: selectedZone?.lat ?? selectedCoords?.lat ?? globeView.center.lat,
            lng: selectedZone?.lng ?? selectedZone?.lon ?? selectedCoords?.lon ?? globeView.center.lng,
            name: selectedZone?.name ?? selectedCoords?.city ?? "Selected Area",
          }}
          heatZones={zones}
          onClose={() => setShowDetailedMap(false)}
        />
      )}

      <TopBar onLocationSelect={handleLocationSelect} onGPSClick={handleGPSClick} />

      <LeftToolbar onGPSClick={handleGPSClick} />

      <RightPanel
        zone={selectedZone}
        stats={stats}
        isLoading={isZonesLoading && !!selectedCoords}
        recommendation={recommendation}
        isRecLoading={isRecLoading}
        onViewDetailed={handleViewDetailed}
        onClose={() => {
          setSelectedCoords(null);
          setSelectedZone(null);
        }}
      />
    </main>
  );
}
