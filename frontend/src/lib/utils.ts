import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSeverityColorHex(severity: string) {
  switch (severity?.toLowerCase()) {
    case "critical": return "#FF2020";
    case "high": return "#FF8C00";
    case "medium": return "#FFD700";
    case "low": return "#00FF88";
    default: return "#00f0ff";
  }
}

export function getSeverityTailwindColor(severity: string) {
  switch (severity?.toLowerCase()) {
    case "critical": return "text-[#FF2020] border-[#FF2020]/30 bg-[#FF2020]/10";
    case "high": return "text-[#FF8C00] border-[#FF8C00]/30 bg-[#FF8C00]/10";
    case "medium": return "text-[#FFD700] border-[#FFD700]/30 bg-[#FFD700]/10";
    case "low": return "text-[#00FF88] border-[#00FF88]/30 bg-[#00FF88]/10";
    default: return "text-accent border-accent/30 bg-accent/10";
  }
}
