import { motion } from "framer-motion";
import { Compass, Layers, BarChart3, Settings, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function LeftToolbar({ onGPSClick }) {
  const navigate = useNavigate();

  const tools = [
    { icon: Globe, label: "Globe", action: () => navigate("/"), cyan: true },
    { icon: Compass, label: "Analyze", action: () => {}, cyan: false },
    { icon: BarChart3, label: "Stats", action: () => {}, cyan: false },
    { icon: Layers, label: "Layers", action: () => {}, cyan: false },
    { icon: Settings, label: "Settings", action: () => {}, cyan: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="absolute left-4 top-1/2 -translate-y-1/2 -mt-16 z-30"
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
        {tools.map(({ icon: Icon, label, action, cyan }) => (
          <motion.button
            key={label}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={action}
            title={label}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{ 
              background: cyan ? "rgba(255,255,255,0.06)" : "transparent",
              border: cyan ? "1px solid rgba(255,255,255,0.16)" : "1px solid transparent"
            }}
          >
            <Icon 
              className="w-4.5 h-4.5 transition-colors duration-200"
              style={{ color: cyan ? "#e5e7eb" : "rgba(255,255,255,0.4)" }}
            />
            <div
              className="absolute left-full ml-2 px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50"
              style={{ 
                background: "rgba(3, 8, 22, 0.95)",
                color: cyan ? "#e5e7eb" : "rgba(255,255,255,0.7)",
                boxShadow: "0 0 20px rgba(0,0,0,0.5)"
              }}
            >
              {label}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
