import { Toaster } from "sonner";
import GlobePage from "./pages/GlobePage";
import DashboardPage from "./pages/DashboardPage";
import SimulationPage from "./pages/SimulationPage";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

function App() {
  return (
    <>
      <BrowserRouter>
         <Routes>
            <Route path="/" element={<GlobePage />} />
            <Route path="/dashboard/:city" element={<DashboardPage />} />
            <Route path="/simulation/:city" element={<SimulationPage />} />
         </Routes>
      </BrowserRouter>
      <Toaster 
        theme="dark" 
        position="top-right"
        toastOptions={{
          className: "glass-panel font-sans border-border",
          style: {
            background: 'rgba(10, 15, 30, 0.8)',
            backdropFilter: 'blur(12px)',
            color: '#fff',
            border: '1px solid rgba(0, 240, 255, 0.2)'
          }
        }}
      />
    </>
  );
}

export default App;
