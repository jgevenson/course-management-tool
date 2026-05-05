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
 * ## Map Area
 * 
 * The main container component for the interactive golf course map, rendering the Leaflet map
 * and all specialized map-layer children. It serves as the central hub for geospatial data visualization.
*
 * ### Responsibilities
 * - **Map Initialization**: Renders a `MapContainer` configured with ESRI World Imagery tiles, centered 
 *   on the provided `center` coordinates with an initial `zoom` level.
 * - **Layer Composition**: Composes and manages the visibility of several distinct map layers:
 *   1.  **`CourseTerrainOverlays`**: Visualizes terrain regions with user interaction support.
 *   2.  **`AutoDrawRegionTool`**: Enables automated region generation based on AI predictions.
 *   3.  **`OSMMapFeaturesLayer`**: Displays OpenStreetMap features (e.g., water hazards).
 *   4.  **`RegionDraftPreview`**: Shows a live preview of a region currently being edited.
 *   5.  **`HoleMapPoints`**: Renders markers and tee boxes for individual holes.
 * 
 * ### Interaction & Control Flow
 * The component acts as a high-level controller for various map-based tools:
 * - **Terrain Tools**: Manages `regionDrawActive` and `suppressTerrainInteractions` flags to control drawing and editing modes.
 * - **Auto Draw**: Exposes configuration options (`autoDrawTolerance`, `autoDrawMaxRadiusYards`) and lifecycle events (`onAutoDrawFeatureCreated`).
 * - **OSM Tool**: Activates the `osmToolActive` state and passes `osmFeaturesData` for rendering.
 * - **Hole Points**: Coordinates marker placement (`onMarkerPick`), movement (`onMarkerMove`), and tool activation (`activePointTool`).
 * 
 * ### State & Data Handling
 * - **Loading State**: Displays a "Loading holes…" indicator when `holesLoading` is true.
 * - **Map Readiness**: Uses `MapInstanceBridge` to acquire a reference to the Leaflet map instance and pass it to the `onMapReady` callback.
 * - **Props Management**: The component relies heavily on **callback props** to communicate events and data changes up to its parent component (`HoleWorkspace`). It does not manage significant local state, instead passing control down to specialized layer components.
 * 
 * @param {Object} props - The properties for the MapArea component.
 * @param {Array<number>} props.center - The initial center coordinates of the map [lat, lng].
 * @param {number} props.zoom - The initial zoom level of the map.
 * @param {boolean} props.holesLoading - Flag to indicate if hole data is currently loading.
 * @param {function} props.onMapReady - Callback function invoked when the Leaflet map instance is ready.
 * @param {Array<Object>} props.visibleTerrainOverlays - Array of terrain overlay objects to display.
 * @param {string|null} props.selectedTerrainOverlayId - The ID of the currently selected terrain overlay.
 * @param {function} props.onSelectTerrainOverlayId - Callback to handle terrain overlay selection.
 * @param {boolean} props.regionDrawActive - Flag to enable the region drawing tool.
 * @param {function} props.suppressTerrainInteractions - Function to suppress map interactions within terrain layers.
 * @param {function} props.onPolygonDrawn - Callback for when a polygon is drawn.
 * @param {function} props.onGeometryCommit - Callback for committing a geometry.
 * @param {boolean} props.autoDrawActive - Flag to enable the auto-draw tool.
 * @param {boolean} props.autoDrawDisabled - Flag to disable the auto-draw tool.
 * @param {number} props.autoDrawTolerance - Tolerance setting for auto-draw.
 * @param {number} props.autoDrawMaxRadiusYards - Maximum radius for auto-draw.
 * @param {function} props.onAutoDrawFeatureCreated - Callback for when an auto-drawn feature is created.
 * @param {function} props.onAutoDrawStatusChange - Callback for when auto-draw status changes.
 * @param {boolean} props.osmToolActive - Flag to enable the OSM tool.
 * @param {Object} props.osmFeaturesData - GeoJSON data for OSM features.
 * @param {function} props.onOSMFeatureSelect - Callback for when an OSM feature is selected.
 * @param {Object|null} props.regionDraft - The current region draft geometry.
 * @param {function} props.onRegionDraftGeometryChange - Callback for region draft geometry changes.
 * @param {Object|null} props.selectedHole - The currently selected hole object.
 * @param {string|null} props.activePointTool - The active point tool type.
 * @param {function} props.onMarkerPick - Callback for marker picking.
 * @param {function} props.onMarkerMove - Callback for marker movement.
 * @param {function} props.onMapMarkerMove - Callback for map marker movement.
 * @param {string} props.workspaceMode - The current workspace mode.
 * @param {boolean} props.suppressHoleMapPick - Flag to suppress hole map picking.
 * @param {Object} props.profile - User profile data.
 * @param {Array<Object>} props.clubs - Array of club data.
 * @returns {JSX.Element}
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
  profile,
  clubs,
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
          profile={profile}
          clubs={clubs}
        />
      </MapContainer>
    </div>
  )
}
