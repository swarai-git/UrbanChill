import { useRef, useState, useEffect, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const getColor = (s) => {
  s = s?.toLowerCase();
  if (s === 'critical') return '#FF2020';
  if (s === 'high') return '#FF8C00';
  if (s === 'medium') return '#FFD700';
  return '#00FF88';
};

export default function GlobeMap({ heatZones = [], selectedLocation, onZoneClick, onViewChange }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [zoom, setZoom] = useState(2);
  const [error, setError] = useState(null);
  const [initAttempts, setInitAttempts] = useState(0);

  const FALLBACK_ZONES = [
    { name: "New Delhi", lng: 77.2090, lat: 28.6139, severity: "critical", lst: 38, ndvi: 0.21 },
    { name: "Mumbai", lng: 72.8777, lat: 19.0760, severity: "high", lst: 36, ndvi: 0.25 },
    { name: "Lagos", lng: 3.3792, lat: 6.5244, severity: "medium", lst: 34, ndvi: 0.28 },
    { name: "Mexico City", lng: -99.1332, lat: 19.4326, severity: "critical", lst: 39, ndvi: 0.18 },
    { name: "Cairo", lng: 31.2357, lat: 30.0444, severity: "high", lst: 37, ndvi: 0.22 }
  ];

  const displayZones = heatZones && heatZones.length > 0 ? heatZones : FALLBACK_ZONES;

  useEffect(() => {
    if (!mapContainer.current) {
      if (initAttempts < 5) {
        setTimeout(() => setInitAttempts(prev => prev + 1), 500);
      }
      return;
    }
    
    if (mapRef.current) {
      setMapLoaded(true);
      return;
    }

    try {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        center: [0, 20],
        zoom: 1.8,
        bearing: 0,
        pitch: 0,
        maxZoom: 18,
        minZoom: 1.5,
        antialias: true,
        style: {
          version: 8,
          projection: { type: 'globe' },
          sources: {
            'esri-satellite': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              maxzoom: 19
            },
            'carto-labels': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png',
                'https://c.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png'
              ],
              tileSize: 512,
              maxzoom: 20
            },
            'carto-basemap': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
              ],
              tileSize: 512,
              maxzoom: 20
            }
          },
          layers: [
            { id: 'background', type: 'background', paint: { 'background-color': '#000000' } },
            { id: 'satellite', type: 'raster', source: 'esri-satellite', paint: { 'raster-opacity': 1 } },
            { id: 'basemap', type: 'raster', source: 'carto-basemap', paint: { 'raster-opacity': 0.3 }, minzoom: 10, maxzoom: 18 },
            { id: 'labels', type: 'raster', source: 'carto-labels', paint: { 'raster-opacity': 1 }, minzoom: 0, maxzoom: 22 }
          ]
        }
      });

      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(new maplibregl.GlobeControl(), 'top-left');

      map.on('load', () => {
        setMapLoaded(true);
        setError(null);
        
        if (map.getFog) {
          map.setFog({
            color: 'rgb(0,0,0)',
            'high-color': 'rgb(20,20,35)',
            'horizon-blend': 0.15,
            'space-color': 'rgb(0,0,0)',
            'star-intensity': 0.5
          });
        }

        fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
          .then(res => res.json())
          .then(data => {
            if (map.getSource('country-borders')) return;
            map.addSource('country-borders', { type: 'geojson', data });
            map.addLayer({
              id: 'country-borders-line',
              type: 'line',
              source: 'country-borders',
              paint: {
                'line-color': 'rgba(255,255,255,0.25)',
                'line-width': ['interpolate', ['linear'], ['zoom'], 1, 1, 4, 2, 8, 3],
                'line-opacity': 1
              }
            });
          })
          .catch(() => {});

        fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson')
          .then(res => res.json())
          .then(data => {
            if (map.getSource('state-borders')) return;
            map.addSource('state-borders', { type: 'geojson', data });
            map.addLayer({
              id: 'state-borders-line',
              type: 'line',
              source: 'state-borders',
              paint: {
                'line-color': 'rgba(255,255,255,0.15)',
                'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0, 5, 1, 8, 2],
                'line-opacity': 1
              }
            });
          })
          .catch(() => {});

        fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_2.geojson')
          .then(res => {
            if (!res.ok) throw new Error('Failed to load');
            return res.json();
          })
          .then(data => {
            if (map.getSource('district-borders')) return;
            console.log('Loading district borders, features:', data.features?.length);
            map.addSource('district-borders', { type: 'geojson', data });
            map.addLayer({
              id: 'district-borders-line',
              type: 'line',
              source: 'district-borders',
              paint: {
                'line-color': 'rgba(255,255,255,0.12)',
                'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 0.5, 10, 1.5, 14, 2],
                'line-opacity': 1
              }
            });
          })
          .catch((e) => console.log('District borders error:', e));

        map.on('zoom', () => {
          const currentZoom = map.getZoom();
          const labelOpacity = Math.min(1, Math.max(0, (currentZoom - 1) / 3));
          const basemapOpacity = Math.min(0.5, Math.max(0, (currentZoom - 8) / 4));
          if (map.getLayer('labels')) {
            map.setPaintProperty('labels', 'raster-opacity', labelOpacity);
          }
          if (map.getLayer('basemap')) {
            map.setPaintProperty('basemap', 'raster-opacity', basemapOpacity);
          }
        });

        map.on('sourcedataloading', (e) => {
          if (e.sourceId && !map.getSource(e.sourceId)) {
            setError(null);
          }
        });

        const zones = displayZones.map(z => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [z.lng || z.lon, z.lat] },
          properties: { 
            name: z.name || z.city || 'Unknown', 
            severity: z.severity || 'low', 
            temperature: z.lst || z.temperature || 30, 
            color: getColor(z.severity) 
          }
        }));

        map.addSource('heat-zones', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: zones }
        });

        map.addLayer({
          id: 'heat-circles',
          type: 'circle',
          source: 'heat-zones',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 4, 8, 12, 14, 20],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.9,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });

        map.addLayer({
          id: 'heat-labels',
          type: 'symbol',
          source: 'heat-zones',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 10, 14],
            'text-offset': [0, 1.5],
            'text-anchor': 'top'
          },
          paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 2 },
          minzoom: 3
        });

        map.on('click', 'heat-circles', (e) => {
          const props = e.features[0].properties;
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<div style="color:white;background:#0f172a;padding:10px;border-radius:8px;border:1px solid ${props.color}"><b>${props.name}</b><br/><span style="color:${props.color}">${props.severity?.toUpperCase()} - ${props.temperature}°C</span></div>`)
            .addTo(map);
          
          if (onZoneClick) {
            const zone = displayZones.find(z => z.name === props.name);
            if (zone) onZoneClick(zone);
          }
        });

        map.on('mouseenter', 'heat-circles', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'heat-circles', () => map.getCanvas().style.cursor = '');
      });

      const emitView = () => {
        const z = map.getZoom();
        const c = map.getCenter();
        setZoom(z);
        if (typeof onViewChange === 'function') {
          onViewChange({ zoom: z, center: { lng: c.lng, lat: c.lat } });
        }
      };

      map.on('zoom', emitView);
      map.on('moveend', emitView);
      map.on('error', (e) => setError(e.error?.message || 'Map error'));

    } catch (err) {
      console.error('Map init error:', err);
      setError(err.message);
    }

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
    };
  }, [initAttempts]);

  useEffect(() => {
    if (selectedLocation && mapRef.current && mapLoaded) {
      mapRef.current.flyTo({
        center: [selectedLocation.lng || selectedLocation.lon || 0, selectedLocation.lat || 0],
        zoom: 10,
        pitch: 45,
        duration: 2000
      });
    }
  }, [selectedLocation, mapLoaded]);

  const getZoomLevel = (z) => {
    if (z < 3) return 'World View';
    if (z < 6) return 'Countries';
    if (z < 9) return 'Cities';
    if (z < 12) return 'Districts';
    return 'Streets';
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      position: 'relative', 
      overflow: 'hidden', 
      background: 'linear-gradient(to bottom, #0a0a1a 0%, #0f0f25 50%, #000000 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="stars" />
      <div className="stars2" />
      <div className="stars3" />
      <div ref={mapContainer} id="globe-container" style={{ 
        width: '100%', 
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1
      }} />
      
      {!mapLoaded && !error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: '16px',
          padding: '30px 50px',
          textAlign: 'center',
          zIndex: 100
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid rgba(255,255,255,0.16)',
            borderTopColor: '#9ca3af',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#e5e7eb', fontSize: '16px', fontWeight: '600' }}>Loading Globe...</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '8px' }}>Initializing map tiles</p>
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,0,0,0.9)', color: 'white', padding: '15px 30px', 
          borderRadius: '10px', zIndex: 100, textAlign: 'center', maxWidth: '400px'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Map Error</p>
          <p style={{ fontSize: '12px' }}>{error}</p>
        </div>
      )}

      {mapLoaded && (
        <>
          <div style={{
            position: 'absolute', bottom: 20, left: 20,
            background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
            padding: '12px 16px', zIndex: 10
          }}>
            <div style={{ color: '#e5e7eb', fontWeight: '600', marginBottom: '6px' }}>Heat Zones</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: '1.6' }}>
              {displayZones.length} zones loaded<br/>
              <span style={{ color: '#FF2020' }}>●</span> Critical &nbsp;
              <span style={{ color: '#FF8C00' }}>●</span> High &nbsp;
              <span style={{ color: '#FFD700' }}>●</span> Medium &nbsp;
              <span style={{ color: '#00FF88' }}>●</span> Low
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes drift {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-100px); }
        }
        #globe-container canvas {
          width: 100% !important;
          height: 100% !important;
        }
        .maplibregl-ctrl-top-left {
          top: 85px !important;
          left: 20px !important;
        }
        .maplibregl-ctrl-top-right {
          top: 70px !important;
          right: 20px !important;
        }
        .stars, .stars2, .stars3 {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
          z-index: 0;
        }
        .stars {
          background: 
            radial-gradient(1px 1px at 10% 20%, white 100%, transparent),
            radial-gradient(1px 1px at 25% 35%, white 100%, transparent),
            radial-gradient(1px 1px at 40% 15%, rgba(255,255,255,0.8) 100%, transparent),
            radial-gradient(1.5px 1.5px at 55% 45%, white 100%, transparent),
            radial-gradient(1px 1px at 70% 25%, rgba(200,220,255,0.9) 100%, transparent),
            radial-gradient(1px 1px at 85% 55%, white 100%, transparent),
            radial-gradient(1.5px 1.5px at 15% 60%, rgba(255,255,255,0.7) 100%, transparent),
            radial-gradient(1px 1px at 30% 75%, white 100%, transparent),
            radial-gradient(1px 1px at 50% 85%, rgba(200,230,255,0.8) 100%, transparent),
            radial-gradient(1px 1px at 65% 70%, white 100%, transparent),
            radial-gradient(1px 1px at 80% 80%, rgba(255,255,255,0.6) 100%, transparent),
            radial-gradient(1.5px 1.5px at 95% 40%, white 100%, transparent),
            radial-gradient(1px 1px at 5% 90%, rgba(220,240,255,0.9) 100%, transparent),
            radial-gradient(1px 1px at 45% 5%, white 100%, transparent),
            radial-gradient(1px 1px at 75% 10%, rgba(200,220,255,0.7) 100%, transparent),
            radial-gradient(2px 2px at 88% 65%, rgba(255,255,255,0.9) 100%, transparent),
            radial-gradient(1px 1px at 20% 40%, white 100%, transparent),
            radial-gradient(1px 1px at 60% 30%, rgba(255,255,255,0.8) 100%, transparent),
            radial-gradient(1px 1px at 35% 55%, white 100%, transparent),
            radial-gradient(1.5px 1.5px at 92% 15%, rgba(200,220,255,0.9) 100%, transparent);
          background-size: 100% 100%;
          animation: twinkle 4s ease-in-out infinite;
        }
        .stars2 {
          background: 
            radial-gradient(1px 1px at 12% 28%, rgba(255,255,255,0.7) 100%, transparent),
            radial-gradient(1.5px 1.5px at 33% 12%, white 100%, transparent),
            radial-gradient(1px 1px at 58% 38%, rgba(200,230,255,0.8) 100%, transparent),
            radial-gradient(1px 1px at 78% 48%, white 100%, transparent),
            radial-gradient(1px 1px at 8% 72%, rgba(255,255,255,0.6) 100%, transparent),
            radial-gradient(1.5px 1.5px at 48% 62%, white 100%, transparent),
            radial-gradient(1px 1px at 68% 82%, rgba(220,240,255,0.9) 100%, transparent),
            radial-gradient(1px 1px at 23% 92%, white 100%, transparent),
            radial-gradient(1px 1px at 83% 78%, rgba(255,255,255,0.8) 100%, transparent),
            radial-gradient(1px 1px at 38% 88%, white 100%, transparent),
            radial-gradient(1.5px 1.5px at 3% 48%, rgba(200,220,255,0.7) 100%, transparent),
            radial-gradient(1px 1px at 53% 8%, white 100%, transparent),
            radial-gradient(1px 1px at 73% 33%, rgba(255,255,255,0.9) 100%, transparent),
            radial-gradient(1px 1px at 18% 18%, white 100%, transparent),
            radial-gradient(1px 1px at 90% 92%, rgba(200,240,255,0.8) 100%, transparent);
          background-size: 200% 200%;
          animation: twinkle 6s ease-in-out infinite reverse;
        }
        .stars3 {
          background: 
            radial-gradient(2px 2px at 7% 42%, rgba(255,255,255,0.9) 100%, transparent),
            radial-gradient(1px 1px at 22% 8%, white 100%, transparent),
            radial-gradient(1.5px 1.5px at 42% 52%, rgba(200,220,255,0.8) 100%, transparent),
            radial-gradient(1px 1px at 62% 22%, white 100%, transparent),
            radial-gradient(1px 1px at 82% 62%, rgba(255,255,255,0.7) 100%, transparent),
            radial-gradient(1px 1px at 17% 82%, white 100%, transparent),
            radial-gradient(1.5px 1.5px at 37% 32%, rgba(220,240,255,0.9) 100%, transparent),
            radial-gradient(1px 1px at 57% 72%, white 100%, transparent),
            radial-gradient(1px 1px at 77% 2%, rgba(200,230,255,0.8) 100%, transparent),
            radial-gradient(1px 1px at 97% 52%, white 100%, transparent),
            radial-gradient(2px 2px at 2% 12%, rgba(255,255,255,0.6) 100%, transparent),
            radial-gradient(1px 1px at 47% 42%, white 100%, transparent),
            radial-gradient(1px 1px at 67% 92%, rgba(220,240,255,0.7) 100%, transparent),
            radial-gradient(1.5px 1.5px at 87% 22%, white 100%, transparent);
          background-size: 300% 300%;
          animation: twinkle 8s ease-in-out infinite, drift 60s linear infinite;
        }
      `}</style>
    </div>
  );
}
