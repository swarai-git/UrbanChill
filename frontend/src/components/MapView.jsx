import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { getSeverityColorHex } from "../lib/utils";

const severityIcon = new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`)}`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: "",
});

function MapUpdater({ zones }) {
  const map = useMap();
  if (zones && zones.length > 0) {
    const bounds = zones.map(z => [z.lat, z.lng || z.lon]);
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }
  return null;
}

export function MapView({ zones, selectedZone, onZoneClick, activeLayers }) {
  const center = zones && zones.length > 0 
    ? [zones[0].lat, zones[0].lng || zones[0].lon] 
    : [28.6139, 77.2090];

  return (
    <MapContainer 
      center={center} 
      zoom={12} 
      className="w-full h-full"
      style={{ background: "#000" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapUpdater zones={zones} />
      
      {zones?.map((zone) => (
        <Marker
          key={zone.id}
          position={[zone.lat, zone.lng || zone.lon]}
          icon={new Icon({
            iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${getSeverityColorHex(zone.severity)}"><circle cx="12" cy="12" r="10" fill="${getSeverityColorHex(zone.severity)}" opacity="0.8"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg>`)}`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })}
          eventHandlers={{
            click: () => onZoneClick(zone),
          }}
        >
          <Popup>
            <div className="p-2 min-w-[150px]">
              <h3 className="font-bold text-sm">{zone.name}</h3>
              <p className="text-xs text-gray-500">LST: {zone.lst}°C</p>
              <p className="text-xs text-gray-500">NDVI: {zone.ndvi}</p>
              <span 
                className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full"
                style={{ 
                  backgroundColor: `${getSeverityColorHex(zone.severity)}20`,
                  color: getSeverityColorHex(zone.severity),
                  border: `1px solid ${getSeverityColorHex(zone.severity)}40`
                }}
              >
                {zone.severity.toUpperCase()}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
