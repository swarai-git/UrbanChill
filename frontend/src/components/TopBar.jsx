import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ThermometerSun, MapPin, Settings, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function TopBar({ onLocationSelect, onGPSClick }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    
    setTimeout(() => {
      const cityLower = searchQuery.toLowerCase().replace(/\s+/g, "_");
      onLocationSelect(28.6139, 77.2090, searchQuery);
      navigate(`/dashboard/${cityLower}`);
      toast.success(`Located: ${searchQuery}`);
      setSearchQuery("");
      setIsSearching(false);
    }, 800);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="absolute top-0 left-0 right-0 z-50 px-4 py-3 pointer-events-none"
    >
      <div className="flex items-center justify-between gap-3 max-w-screen-2xl mx-auto pointer-events-auto">
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shrink-0 cursor-pointer"
          onClick={() => navigate("/")}
          style={{
            background: "rgba(3, 8, 22, 0.78)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            boxShadow: "0 0 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="relative">
            <ThermometerSun className="w-6 h-6 text-orange-600" />
            <div className="absolute inset-0 blur-md bg-orange-500/40 rounded-full" />
          </div>
          <div>
            <div className="text-white leading-none" style={{ fontFamily: "'Grand Hotel', cursive", fontSize: '24px', textShadow: "0 0 12px rgba(255,120,0,0.4)" }}>
              Urban<span className="text-orange-600">Chill</span>
              <span className="text-white/70 ml-1 text-lg">AI</span>
            </div>
            <div className="text-[9px] text-white/50 tracking-[0.22em] font-mono mt-0.5">GLOBAL HEAT INTEL</div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all duration-300"
            style={{
              background: "rgba(3, 8, 22, 0.78)",
              backdropFilter: "blur(20px)",
              border: isFocused
                ? "1px solid rgba(255, 120, 0, 0.55)"
                : "1px solid rgba(255, 255, 255, 0.10)",
              boxShadow: isFocused
                ? "0 0 24px rgba(255,100,0,0.18), 0 0 32px rgba(0,0,0,0.4)"
                : "0 0 32px rgba(0,0,0,0.4)",
            }}
          >
            <Search className="w-4 h-4 text-white/30 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search any city or location…"
              className="bg-transparent border-none outline-none flex-1 text-white placeholder:text-white/25 text-sm font-sans"
            />
            {isSearching && <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin shrink-0" />}
          </div>
        </form>

        <div
          className="flex items-center gap-1 px-2 py-2 rounded-2xl shrink-0"
          style={{
            background: "rgba(3, 8, 22, 0.78)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            boxShadow: "0 0 32px rgba(0,0,0,0.4)",
          }}
        >
          {[
            { icon: MapPin, label: "GPS", onClick: onGPSClick, cyan: true },
            { icon: Settings, label: "Settings", onClick: undefined, cyan: false },
            { icon: User, label: "Profile", onClick: undefined, cyan: false },
          ].map(({ icon: Icon, label, onClick, cyan }) => (
            <motion.button
              key={label}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.92 }}
              onClick={onClick}
              title={label}
              className="group relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
              style={{ background: cyan ? "rgba(255,255,255,0.06)" : "transparent" }}
            >
              <Icon
                className="w-4 h-4 transition-colors duration-200"
                style={{ color: cyan ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)" }}
              />
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: cyan ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)" }}
              />
            </motion.button>
          ))}
        </div>

      </div>
    </motion.header>
  );
}
