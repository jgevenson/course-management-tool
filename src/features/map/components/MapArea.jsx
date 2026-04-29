import { useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import CourseTerrainOverlays from './CourseTerrainOverlays'
import AutoDrawRegionTool from './AutoDrawRegionTool'
import RegionDraftPreview from './RegionDraftPreview'
import HoleMapPoints from './HoleMapPoints'
import OSMMapFeaturesLayer from './OSMMapFeaturesLayer'

import 'leaflet/dist/leaflet.css'
import 'leaflet-rotate/dist/leaflet-rotate.js'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import '@geoman-io/leaflet-geoman-free'

const MAP_MAX_ZOOM = 22
const TILE_MAX_NATIVE_ZOOM = 19
const ESRI_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'

function MapInstanceBridge({ onMapReady }) {
  const map = useMap()
  useEffect(() => {
    onMapReady(map)
    return () => onMapReady(null)
  }, [map, onMapReady])
  return null
}

/**
 * Wraps the Leaflet MapContainer and all map-layer children.
 */
export default function MapArea({
  center,
  zoom,
  holesLoading,
  onMapReady,
  // Terrain overlays
  visibleTerrainOverlays,
  selectedTerrainOverlayId,
  onSelectTerrainOverlayId,
  regionDrawActive,
  suppressTerrainInteractions,
  onPolygonDrawn,
  onGeometryCommit,
  // Auto draw
  autoDrawActive,
  autoDrawDisabled,
  autoDrawTolerance,
  autoDrawMaxRadiusYards,
  onAutoDrawFeatureCreated,
  onAutoDrawStatusChange,
  // OSM
  osmToolActive,
  osmFeaturesData,
  onOSMFeatureSelect,
  // Region draft
  regionDraft,
  onRegionDraftGeometryChange,
  // Hole map points
  selectedHole,
  activePointTool,
  onMarkerPick,
  onMarkerMove,
  onMapMarkerMove,
  workspaceMode,
  suppressHoleMapPick,
}) {
  return (
    <div className="h-full w-full min-h-0 relative flex flex-col">
      {holesLoading && (
        <div className="absolute inset-0 z-600 flex items-center justify-center bg-slate-900/60 text-slate-400 text-sm">
          Loading holes…
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full z-0 flex-1 min-h-0"
        minZoom={2}
        maxZoom={MAP_MAX_ZOOM}
        scrollWheelZoom
        zoomControl
        rotate
      >
        <TileLayer
          url={ESRI_TILE_URL}
          attribution={ESRI_ATTRIBUTION}
          maxZoom={MAP_MAX_ZOOM}
          maxNativeZoom={TILE_MAX_NATIVE_ZOOM}
        />
        <MapInstanceBridge onMapReady={onMapReady} />
        <CourseTerrainOverlays
          overlays={visibleTerrainOverlays}
          selectedId={selectedTerrainOverlayId}
          onSelectId={onSelectTerrainOverlayId}
          regionDrawActive={regionDrawActive}
          suppressMapInteractions={suppressTerrainInteractions}
          onPolygonDrawn={onPolygonDrawn}
          onGeometryCommit={onGeometryCommit}
        />
        <AutoDrawRegionTool
          active={autoDrawActive}
          disabled={autoDrawDisabled}
          tolerance={autoDrawTolerance}
          maxRadiusYards={autoDrawMaxRadiusYards}
          tileUrlTemplate={ESRI_TILE_URL}
          maxNativeZoom={TILE_MAX_NATIVE_ZOOM}
          onFeatureCreated={onAutoDrawFeatureCreated}
          onStatusChange={onAutoDrawStatusChange}
        />
        <OSMMapFeaturesLayer
          isActive={osmToolActive}
          geojsonData={osmFeaturesData}
          onFeatureSelect={onOSMFeatureSelect}
        />
        <RegionDraftPreview
          feature={regionDraft}
          onFeatureChange={onRegionDraftGeometryChange}
        />
        <HoleMapPoints
          selectedHole={selectedHole}
          activePointTool={activePointTool}
          onPick={onMarkerPick}
          onMarkerMove={onMarkerMove}
          onMapMarkerMove={onMapMarkerMove}
          workspaceMode={workspaceMode}
          suppressHoleMapPick={suppressHoleMapPick}
        />
      </MapContainer>
    </div>
  )
}
