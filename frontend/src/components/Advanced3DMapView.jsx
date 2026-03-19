import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import DeckGL from '@deck.gl/react';
import {
  GeoJsonLayer,
  HeatmapLayer,
  ScatterplotLayer,
  BitmapLayer,
} from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { X, ZoomIn, ZoomOut, Layers, Bird } from 'lucide-react';
import maplibregl from 'maplibre-gl';

const Advanced3DMapView = ({ center, heatZones, onClose }) => {
  const [viewState, setViewState] = useState({
    longitude: center.lng,
    latitude: center.lat,
    zoom: 13,
    pitch: 45,
    bearing: 0,
  });
  const [showBuildings, setShowBuildings] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const mapRef = useRef(null);

  // Create heat zone features
  const heatZoneFeatures = (heatZones || []).map(zone => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [zone.lng || zone.lon, zone.lat]
    },
    properties: {
      name: zone.name,
      severity: zone.severity,
      temperature: zone.lst || zone.temperature,
      ndvi: zone.ndvi
    }
  }));

  const getSeverityColor = (severity) => {
    severity = severity?.toLowerCase();
    if (severity === 'critical') return [255, 32, 32, 200];
    if (severity === 'high') return [255, 140, 0, 200];
    if (severity === 'medium') return [255, 215, 0, 200];
    return [0, 255, 136, 200];
  };

  // Layers for Deck.gl
  const layers = [
    // Base map tile layer
    new TileLayer({
      data: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxRequests: 20,
      pickable: false,
      onViewStateChange: ({ viewState: vs }) => setViewState(vs)
    }),

    // Heat zones as scatter plot
    new ScatterplotLayer({
      id: 'heat-zones-scatter',
      data: heatZoneFeatures,
      pickable: true,
      opacity: 0.8,
      radiusScale: 6,
      radiusMinPixels: 5,
      radiusMaxPixels: 100,
      lineWidthMinPixels: 1,
      getPosition: d => d.geometry.coordinates,
      getRadius: d => 30,
      getFillColor: d => getSeverityColor(d.properties.severity),
      getLineColor: [255, 255, 255],
    }),

    // Heatmap layer
    ...(showHeatmap ? [
      new HeatmapLayer({
        id: 'heat-zones-heatmap',
        data: heatZoneFeatures,
        pickable: false,
        getPosition: d => d.geometry.coordinates,
        getWeight: d => {
          const temp = d.properties.temperature || 25;
          return Math.max(0, (temp - 20) / 15); // Normalize temperature
        },
        radiusPixels: 50,
        intensity: 1,
        colorRange: [
          [0, 0, 255],
          [0, 255, 255],
          [0, 255, 0],
          [255, 255, 0],
          [255, 165, 0],
          [255, 0, 0],
        ],
      })
    ] : []),

    // Building outlines (simplified - using a GeoJSON layer as placeholder)
    ...(showBuildings ? [
      new GeoJsonLayer({
        id: 'buildings',
        data: {
          type: 'FeatureCollection',
          features: [] // Would normally fetch from OSM data
        },
        pickable: true,
        stroked: true,
        filled: true,
        extruded: true,
        lineWidthScale: 20,
        lineWidthMinPixels: 2,
        getFillColor: [26, 34, 50, 160],
        getLineColor: [64, 224, 255, 100],
        getElevation: d => Math.random() * 30,
      })
    ] : []),
  ];

  const handleZoom = (direction) => {
    const newZoom = direction === 'in'
      ? Math.min(viewState.zoom + 1, 20)
      : Math.max(viewState.zoom - 1, 0);
    setViewState(vs => ({ ...vs, zoom: newZoom }));
  };

  const handleRotate = () => {
    setViewState(vs => ({
      ...vs,
      bearing: (vs.bearing + 45) % 360
    }));
  };

  return (
    <motion.div
      key="advanced-3d-view"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-20 overflow-hidden"
    >
      {/* Deck.gl 3D Map */}
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs)}
        controller={{
          doubleClickZoom: true,
          touchZoom: true,
          touchRotate: true,
          keyboard: true,
        }}
        layers={layers}
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        {/* MapGL overlay */}
        <maplibregl.Map
          ref={mapRef}
          reuseMaps
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        />
      </DeckGL>

      {/* Close Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClose}
        className="absolute top-6 left-6 z-30 bg-red-600/80 hover:bg-red-700 text-white p-2 rounded-lg backdrop-blur-sm transition-colors border border-red-500/50"
        title="Close detailed view"
      >
        <X size={20} />
      </motion.button>

      {/* Location Name */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-6 left-1/2 transform -translate-x-1/2 z-30 bg-black/60 backdrop-blur-md border border-white/15 rounded-lg px-6 py-3"
      >
        <h2 className="text-xl font-bold text-white/80">{center.name} - Advanced 3D View</h2>
      </motion.div>

      {/* Control Panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-6 right-6 z-30 flex flex-col gap-3 bg-black/60 backdrop-blur-md border border-white/15 rounded-lg p-3"
      >
        {/* Zoom Controls */}
        <button
          onClick={() => handleZoom('in')}
          className="bg-white/10 hover:bg-white/15 text-white p-2 rounded transition-colors border border-white/15"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="bg-white/10 hover:bg-white/15 text-white p-2 rounded transition-colors border border-white/15"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>

        {/* Rotate */}
        <button
          onClick={handleRotate}
          className="bg-purple-600/80 hover:bg-purple-700 text-white p-2 rounded transition-colors border border-purple-500/50"
          title="Rotate view"
        >
          <Bird size={18} />
        </button>

        {/* Layer Toggles */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`text-white p-2 rounded transition-colors border ${
            showHeatmap
              ? 'bg-orange-600/80 hover:bg-orange-700 border-orange-500/50'
              : 'bg-slate-700/80 hover:bg-slate-600 border-slate-600/50'
          }`}
          title="Toggle heatmap"
        >
          <span className="text-xs font-bold">HEAT</span>
        </button>

        <button
          onClick={() => setShowBuildings(!showBuildings)}
          className={`text-white p-2 rounded transition-colors border text-xs font-bold ${
            showBuildings
              ? 'bg-white/12 hover:bg-white/15 border-white/15'
              : 'bg-slate-700/80 hover:bg-slate-600 border-slate-600/50'
          }`}
          title="Toggle buildings"
        >
          BLDG
        </button>
      </motion.div>

      {/* Info Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute bottom-6 left-6 z-30 bg-black/60 backdrop-blur-md border border-white/15 rounded-lg p-4 max-w-sm"
      >
        <h3 className="text-white/80 font-semibold mb-2">Advanced 3D Visualization</h3>
        <p className="text-xs text-gray-300 mb-3">
          Interactive 3D map with heat zones visualization. Drag to pan, scroll to zoom, hold shift to rotate.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div>
            <span className="text-white/70 font-mono">Zoom:</span> {viewState.zoom.toFixed(1)}
          </div>
          <div>
            <span className="text-white/70 font-mono">Bearing:</span> {viewState.bearing.toFixed(0)}°
          </div>
          <div>
            <span className="text-white/70 font-mono">Pitch:</span> {viewState.pitch.toFixed(0)}°
          </div>
          <div>
            <span className="text-white/70 font-mono">Zones:</span> {heatZoneFeatures.length}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Advanced3DMapView;