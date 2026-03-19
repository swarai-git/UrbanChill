import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, ZoomIn, ZoomOut, Layers, Eye } from 'lucide-react';

// Map styles — satellite first for Google Earth feel
const SATELLITE_STYLE = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; Esri, Maxar, Earthstar Geographics'
    }
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#020617' } },
    { id: 'satellite-tiles', type: 'raster', source: 'esri-satellite', minzoom: 0, maxzoom: 22 }
  ]
};

const CARTO_DARK_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const MAP_STYLES = {
  hybrid: {
    url: CARTO_DARK_STYLE_URL,
    label: 'Satellite + Labels'
  },
  satellite: {
    url: SATELLITE_STYLE,
    label: 'Satellite'
  },
  gray: {
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    label: 'Grayscale'
  },
  dark: {
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    label: 'Dark'
  }
};

const COUNTRY_GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
const ADMIN1_GEOJSON_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson';

const DetailedMapView = ({ center, heatZones, onClose }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const layerCatalog = useRef({ country: [], roads: [], cities: [], buildings: [] });
  const [currentStyle, setCurrentStyle] = useState('hybrid');
  const [zoom, setZoom] = useState(13);
  const [pitch, setPitch] = useState(30);
  const [countriesGeoJson, setCountriesGeoJson] = useState(null);
  const [adminGeoJson, setAdminGeoJson] = useState(null);
  const styleNames = Object.keys(MAP_STYLES);
  const currentIndex = styleNames.indexOf(currentStyle);

  // Fetch country outlines once for overlays
  useEffect(() => {
    fetch(COUNTRY_GEOJSON_URL)
      .then(res => res.json())
      .then(data => setCountriesGeoJson(data))
      .catch(() => {});
  }, []);

  // Fetch admin1 (states/provinces) once
  useEffect(() => {
    fetch(ADMIN1_GEOJSON_URL)
      .then(res => res.json())
      .then(data => setAdminGeoJson(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    if (map.current) {
      map.current.remove();
    }

    const mapStyle = MAP_STYLES[currentStyle];

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle.url,
      center: [center.lng, center.lat],
      zoom: zoom,
      pitch: pitch,
      bearing: 0,
      antialias: false, // lighter on GPU
      optimizeForTerrain: false // disable extra passes
    });

    map.current.setTransition({ duration: 180, delay: 0 }); // quicker, less blocking
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      if (currentStyle === 'hybrid') {
        applyHybridSatelliteBase();
      }
      applyFuturisticAtmosphere();
      addHeatZoneLayers();
      addCountryOverlay();
      addAdminOverlay();
      catalogBaseLayers();
      applyProgressiveLayers(map.current.getZoom());

      map.current.on('zoom', handleZoomChange);
      map.current.on('pitch', () => setPitch(map.current.getPitch()));

      // Re-catalog when style fully loaded (after style switch)
      map.current.on('styledata', () => {
        catalogBaseLayers();
        applyProgressiveLayers(map.current.getZoom());
        addCountryOverlay();
        addAdminOverlay();
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [center, currentStyle, countriesGeoJson]);

  const applyHybridSatelliteBase = () => {
    if (!map.current) return;

    // Add satellite raster beneath labels. We keep Carto's symbol layers intact,
    // but hide most vector fills so satellite imagery is visible.
    if (!map.current.getSource('esri-satellite')) {
      map.current.addSource('esri-satellite', SATELLITE_STYLE.sources['esri-satellite']);
    }

    const style = map.current.getStyle();
    const layers = style?.layers || [];
    const firstSymbol = layers.find(l => l.type === 'symbol')?.id;

    if (!map.current.getLayer('satellite-tiles')) {
      map.current.addLayer(
        {
          id: 'satellite-tiles',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 22,
          paint: { 'raster-opacity': 1 }
        },
        firstSymbol
      );
    }

    // Hide background + most fills so satellite shows through.
    layers.forEach((layer) => {
      const id = layer.id;
      if (!id || id === 'satellite-tiles') return;

      if (layer.type === 'background' && map.current.getLayer(id)) {
        map.current.setPaintProperty(id, 'background-opacity', 0);
      }

      if (layer.type === 'fill' && map.current.getLayer(id)) {
        map.current.setPaintProperty(id, 'fill-opacity', 0);
      }

      if (layer.type === 'raster' && map.current.getLayer(id) && id !== 'satellite-tiles') {
        map.current.setPaintProperty(id, 'raster-opacity', 0);
      }
    });
  };

  const applyFuturisticAtmosphere = () => {
    if (!map.current) return;

    if (map.current.setFog) {
      map.current.setFog({
        color: 'rgba(4,12,24,0.8)',
        "horizon-blend": 0.2,
        range: [-1, 2],
        "high-color": 'rgba(255,255,255,0.10)',
        "space-color": '#020617'
      });
    }

    // Soft light
    if (map.current.setLights) {
      map.current.setLights([
        {
          id: 'ambient-light',
          type: 'ambient',
          color: '#7dd3fc',
          intensity: 0.35
        },
        {
          id: 'directional-light',
          type: 'directional',
          color: '#e5e7eb',
          intensity: 0.6,
          direction: [1, 0.8, 0.5]
        }
      ]);
    }
  };

  const catalogBaseLayers = () => {
    if (!map.current?.getStyle()?.layers) return;
    const layers = map.current.getStyle().layers;
    const groups = { country: [], roads: [], cities: [], buildings: [] };

    layers.forEach(layer => {
      const id = (layer.id || '').toLowerCase();
      if (id.includes('admin') || id.includes('boundary') || id.includes('country')) groups.country.push(layer.id);
      if (id.includes('road') || id.includes('bridge') || id.includes('highway') || id.includes('transport')) groups.roads.push(layer.id);
      if (id.includes('place') || id.includes('city') || id.includes('town') || id.includes('poi') || id.includes('settlement')) groups.cities.push(layer.id);
      if (id.includes('building')) groups.buildings.push(layer.id);
    });

    layerCatalog.current = groups;
  };

  const setVisibility = (ids, visible) => {
    if (!map.current) return;
    ids.forEach(id => {
      if (map.current.getLayer(id)) {
        map.current.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      }
    });
  };

  const applyProgressiveLayers = (z) => {
    if (!map.current) return;

    // Stage logic: country borders early; regions/states and cities as you zoom in
    const showCountries = z >= 0;
    const showRoads = z >= 7;
    const showCities = z >= 6.5;
    const showBuildings = z >= 14;

    setVisibility(layerCatalog.current.country, showCountries);
    setVisibility(layerCatalog.current.roads, showRoads);
    setVisibility(layerCatalog.current.cities, showCities);
    setVisibility(layerCatalog.current.buildings, showBuildings);
  };

  const addAdminOverlay = () => {
    if (!map.current || !adminGeoJson) return;

    if (!map.current.getSource('admin-overlay')) {
      map.current.addSource('admin-overlay', {
        type: 'geojson',
        data: adminGeoJson,
        tolerance: 1
      });
    }

    if (!map.current.getLayer('admin-outline')) {
      map.current.addLayer({
        id: 'admin-outline',
        type: 'line',
        source: 'admin-overlay',
        minzoom: 4,
        maxzoom: 12,
        paint: {
          'line-color': '#e5e7eb',
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.4, 10, 1.2],
          'line-opacity': 0.55
        }
      }, 'water');
    }

    if (!map.current.getLayer('admin-labels')) {
      map.current.addLayer({
        id: 'admin-labels',
        type: 'symbol',
        source: 'admin-overlay',
        minzoom: 5,
        maxzoom: 10.5,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 9, 13],
          'text-allow-overlap': false,
          'text-padding': 2,
          'symbol-placement': 'point'
        },
        paint: {
          'text-color': '#e0f7ff',
          'text-halo-color': '#0b1222',
          'text-halo-width': 1.6,
          'text-opacity': 0.92
        }
      });
    }
  };

  const addCountryOverlay = () => {
    if (!map.current || !countriesGeoJson) return;

    if (map.current.getSource('countries-overlay')) {
      return;
    }

    map.current.addSource('countries-overlay', {
      type: 'geojson',
      data: countriesGeoJson
    });

    map.current.addLayer({
      id: 'countries-outline',
      type: 'line',
      source: 'countries-overlay',
      paint: {
        'line-color': 'rgba(14,214,255,0.35)',
        'line-width': 0.8
      }
    }, 'water');

    map.current.addLayer({
      id: 'countries-labels',
      type: 'symbol',
      source: 'countries-overlay',
      minzoom: 2,
      maxzoom: 6,
      layout: {
        'text-field': ['get', 'ADMIN'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 6, 12],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.2,
        'text-allow-overlap': false,
        'text-padding': 2
      },
      paint: {
        'text-color': '#d9f5ff',
        'text-halo-color': '#0b1222',
        'text-halo-width': 1.6,
        'text-opacity': 0.92
      }
    });
  };

  const addHeatZoneLayers = () => {
    if (!map.current || !map.current.loaded()) return;

    const layersToRemove = ['heat-zones-heatmap', 'heat-zones-circle', 'heat-zones-labels'];
    layersToRemove.forEach(layerId => {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });
    if (map.current.getSource('heat-zones')) {
      map.current.removeSource('heat-zones');
    }

    const zoneFeatures = (heatZones || []).map(zone => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [zone.lng || zone.lon, zone.lat]
      },
      properties: {
        name: zone.name,
        severity: (zone.severity || 'low').toLowerCase(),
        temperature: zone.lst || zone.temperature || 25,
        ndvi: zone.ndvi || 0.5
      }
    }));

    const geojson = {
      type: 'FeatureCollection',
      features: zoneFeatures
    };

    map.current.addSource('heat-zones', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    map.current.addLayer({
      id: 'heat-zones-heatmap',
      type: 'heatmap',
      source: 'heat-zones',
      maxzoom: 15,
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'temperature'],
          20, 0,
          35, 1
        ],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 2.5],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 139, 0)',
          0.1, 'rgb(65, 105, 225)',
          0.3, 'rgb(0, 191, 255)',
          0.5, 'rgb(0, 255, 127)',
          0.7, 'rgb(255, 255, 0)',
          0.9, 'rgb(255, 69, 0)',
          1, 'rgb(139, 0, 0)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 10, 1, 12, 0.5]
      }
    }, 'water');

    map.current.addLayer({
      id: 'heat-zones-circle',
      type: 'circle',
      source: 'heat-zones',
      filter: ['!', ['feature-state', 'cluster']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 12],
        'circle-color': [
          'match',
          ['get', 'severity'],
          'critical', '#FF2020',
          'high', '#FF8C00',
          'medium', '#FFD700',
          '#00FF88'
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.9
      }
    });

    map.current.addLayer({
      id: 'heat-zones-labels',
      type: 'symbol',
      source: 'heat-zones',
      filter: ['!', ['feature-state', 'cluster']],
      layout: {
        'text-field': ['get', 'name'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 16, 14],
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-allow-overlap': false,
        'text-padding': 2
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1
      }
    });

    map.current.on('click', 'heat-zones-circle', (e) => {
      const coordinates = e.lngLat;
      const properties = e.features[0].properties;

      new maplibregl.Popup({ offset: 25 })
        .setLngLat(coordinates)
        .setHTML(`
          <div class="bg-slate-950 rounded p-3 text-white text-sm" style="border: 1px solid #06b6d4;">
            <h3 class="font-bold text-white/80 mb-2">${properties.name}</h3>
            <div class="space-y-1 text-xs">
              <p>
                <span class="font-semibold">Severity:</span>
                <span class="uppercase ml-1 px-2 py-0.5 rounded" style="background-color: ${
                  properties.severity === 'critical' ? '#FF2020' :
                  properties.severity === 'high' ? '#FF8C00' :
                  properties.severity === 'medium' ? '#FFD700' : '#00FF88'
                }; color: #000;">${properties.severity}</span>
              </p>
              <p>
                <span class="font-semibold">Temperature:</span>
                <span class="text-white/60">${properties.temperature}°C</span>
              </p>
              <p>
                <span class="font-semibold">NDVI:</span>
                <span class="text-white/60">${properties.ndvi.toFixed(2)}</span>
              </p>
            </div>
          </div>
        `)
        .addTo(map.current);
    });

    map.current.on('mouseenter', 'heat-zones-circle', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'heat-zones-circle', () => {
      map.current.getCanvas().style.cursor = '';
    });
  };

  const handleZoomClick = (direction) => {
    if (!map.current) return;
    const newZoom = direction === 'in' ? Math.min(zoom + 1, 20) : Math.max(zoom - 1, 0);
    map.current.zoomTo(newZoom, { duration: 300 });
  };

  const handlePitch = (direction) => {
    if (!map.current) return;
    const newPitch = direction === 'up'
      ? Math.min(pitch + 15, 60)
      : Math.max(pitch - 15, 0);
    map.current.setPitch(newPitch);
  };

  const handleZoomChange = () => {
    if (!map.current) return;
    const currentZoom = map.current.getZoom();
    setZoom(currentZoom);
    applyProgressiveLayers(currentZoom);
  };

  const cycleMapStyle = () => {
    const nextIndex = (currentIndex + 1) % styleNames.length;
    setCurrentStyle(styleNames[nextIndex]);
  };

  return (
    <motion.div
      key="detailed-view"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-20 overflow-hidden"
    >
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.06), rgba(2,6,23,0.92))' }}
      />

      {/* Close Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClose}
        className="absolute top-6 left-6 z-30 bg-red-600/80 hover:bg-red-700 text-white p-2 rounded-lg backdrop-blur-sm transition-colors border border-red-500/50"
        title="Close detailed view (Zoom out on globe)"
      >
        <X size={20} />
      </motion.button>

      {/* Location Name */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="absolute top-6 left-1/2 transform -translate-x-1/2 z-30 bg-black/65 backdrop-blur-md border border-white/15 rounded-lg px-6 py-3 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-white/80 tracking-wide">{center.name}</h2>
        <p className="text-[11px] text-white/50">Progressive Earth detail view</p>
      </motion.div>

      {/* Minimal Control Panel */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="absolute top-6 right-6 z-30 flex flex-col gap-2 bg-black/55 backdrop-blur-md border border-white/15 rounded-lg p-3 shadow-lg"
      >
        <div className="flex gap-2">
          <button
            onClick={() => handleZoomClick('in')}
            className="bg-white/10 hover:bg-white/15 text-white p-2 rounded border border-white/15"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => handleZoomClick('out')}
            className="bg-white/10 hover:bg-white/15 text-white p-2 rounded border border-white/15"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={() => handlePitch('up')}
            className="bg-purple-600/80 hover:bg-purple-700 text-white p-2 rounded border border-purple-500/50"
            title="Tilt up"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handlePitch('down')}
            className="bg-purple-600/80 hover:bg-purple-700 text-white p-2 rounded border border-purple-500/50"
            title="Tilt down"
          >
            <Eye size={16} className="transform rotate-180" />
          </button>
          <button
            onClick={cycleMapStyle}
            className="bg-slate-800/80 hover:bg-slate-700 text-white/80 p-2 rounded border border-slate-600/70"
            title="Cycle map style"
          >
            <Layers size={16} />
          </button>
        </div>
        <div className="text-[11px] text-white/60 font-mono">
          z {zoom.toFixed(1)} • pitch {pitch.toFixed(0)}° • {MAP_STYLES[currentStyle].label}
        </div>
      </motion.div>

      {/* Progress Hint */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-6 left-6 z-30 bg-black/60 backdrop-blur-md border border-white/15 rounded-lg px-4 py-3 text-xs text-white/70 shadow-lg"
      >
        <div className="font-semibold text-white/80">Progressive detail</div>
        <div className="text-white/60">Zoom out: boundaries only • Zoom in: names, cities, roads • Max zoom: buildings & detail</div>
      </motion.div>

      {/* Return Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-6 right-6 z-30 bg-slate-900/70 backdrop-blur-md border border-white/15 rounded-lg px-4 py-2 text-[11px] text-white/70"
      >
        Close or zoom out to go back to the globe
      </motion.div>
    </motion.div>
  );
};

export default DetailedMapView;