// AI assisted development
import { useCallback, useMemo, useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMapCourse } from '../../../hooks/useMapCourse'
import { useHoles } from '../../../hooks/useHoles'
import { useMapTools } from '../../../hooks/useMapTools'
import { useMapTerrainOverlays } from '../../../hooks/useMapTerrainOverlays'
import { useMapViewControl } from '../../../hooks/useMapViewControl'
import { useProfile } from '../../../hooks/useProfile'
import { useClubs } from '../../../hooks/useClubs'
import usePlanningAreas from '../../../hooks/usePlanningAreas'
import MapEditorHeader from './MapEditorHeader'
import MapArea from './MapArea'
import HoleWorkspace from './HoleWorkspace'
import PlanningAreaDialog from './PlanningAreaDialog'

/**
 * ## Map Canvas Component
 * 
 * The root component for the interactive golf course mapping interface. It orchestrates the entire 
 * workflow by composing the `MapArea` (the main map view) and the `HoleWorkspace` (the side panel 
 * for tools and information), managed through the `useMapTools` hook.
 * 
 * ### Component Responsibilities
 * - **State Orchestration**: Aggregates data and state from multiple specialized hooks: `useMapCourse`, 
 *   `useHoles`, `useMapTerrainOverlays`, `useProfile`, `useClubs`, and `useMapTools`.
 * - **Data Fetching**: Initiates data loading for the map course and its associated holes.
 * - **Permission Control**: Enforces a **planning-only** mode for non-administrative users, 
 *   automatically reverting the workspace mode if a mapping admin is not detected.
 * - **UI Composition**: Renders the main `MapEditorHeader`, the interactive `MapArea`, and the `HoleWorkspace`.
 * - **Event Bridging**: Acts as a central hub for event callbacks, relaying complex interactions between 
 *   the map layers and the workspace tools.
 * 
 * ### Data Flow & Dependencies
 * The `MapCanvas` relies on **callback props** to communicate with its parent components. It receives 
 * its primary map instance from the `MapArea` via the `onMapReady` callback, which is then passed down 
 * to the `useMapTools` hook. The `MapArea` itself is populated with a comprehensive set of props 
 * related to terrain overlays, auto-draw tools, OSM features, and hole markers.
 * 
 * ### Usage Example
 * The component is typically rendered within a layout that manages routing (via `react-router-dom`) and 
 * theme context. It requires a valid `id` parameter from the route for data fetching.
 * 
 * @returns {JSX.Element} A React component representing the full map editing interface.
 */

export default function MapCanvas() {
  const { id } = useParams()
  const [mapInstance, setMapInstance] = useState(null)

  // ── Data hooks ────────────────────────────────────────────
  const { profile } = useProfile()
  const isMappingAdmin = profile?.is_mapping_admin ?? false
  const { clubs } = useClubs(profile?.id)
  const courseState = useMapCourse(id)
  const holesState = useHoles(courseState.course?.id)
  const terrainState = useMapTerrainOverlays(courseState.course?.id)
  const tools = useMapTools(mapInstance)
  const planningAreasState = usePlanningAreas(holesState.selectedHole?.id)
  useMapViewControl(mapInstance, holesState, courseState.course)

  // Dialog state for Planning Areas
  const [planningDialogOpen, setPlanningDialogOpen] = useState(false)
  const [planningDraftFeature, setPlanningDraftFeature] = useState(null)
  
  // Non-admins are locked to planning mode — enforce it if the mode ever
  // gets set to 'mapping' while the user doesn't have the admin flag.
  useEffect(() => {
    if (!isMappingAdmin && tools.workspaceMode !== 'planning') {
      tools.setWorkspaceMode('planning')
    }
  }, [isMappingAdmin, tools])

  // ── Derived values ────────────────────────────────────────
  const visibleTerrainOverlays = useMemo(() => {
    return terrainState.visibleOverlaysForHole(holesState.selectedHole?.id)
  }, [terrainState, holesState.selectedHole?.id])

  // ── Bridging callbacks ────────────────────────────────────
  // These thin handlers connect hooks that need to coordinate.

  const handleSelectHoleIndex = useCallback((idx) => {
    holesState.selectHoleIndex(idx)
    terrainState.selectOverlay(null)
  }, [holesState, tools, terrainState])

  const handleWorkspaceModeChange = useCallback((mode) => {
    tools.setWorkspaceMode(mode)
    terrainState.selectOverlay(null)
    terrainState.setRegionMessage(null)
  }, [tools, terrainState])

  const handleSaveLocation = useCallback(() => {
    courseState.saveCourseLocation(mapInstance)
  }, [courseState, mapInstance])

  const handleMarkerPick = useCallback(async (tool, lat, lng) => {
    const isClickPlacement = Boolean(tools.activePointTool)
    const data = await holesState.placeMarker(tool, lat, lng)
    if (data) {
      tools.setActivePointTool(null)
      if (isClickPlacement && !holesState.autoRotateHoleView && mapInstance) {
        mapInstance.flyTo([lat, lng], Math.max(mapInstance.getZoom(), 17))
      }
    }
  }, [holesState, tools, mapInstance])

  const handlePolygonDrawn = useCallback((feature) => {
    tools.acceptRegionDraft(feature)
    terrainState.selectOverlay(null)
  }, [tools, terrainState])

  const handlePlanningPolygonDrawn = useCallback((feature) => {
    tools.toggleRegionDraw(false)
    setPlanningDraftFeature(feature)
    setPlanningDialogOpen(true)
  }, [tools])

  const handleSavePlanningArea = useCallback(async (details) => {
    try {
      await planningAreasState.addOrUpdateArea({
        ...details,
        geojsonData: planningDraftFeature
      })
      setPlanningDialogOpen(false)
      setPlanningDraftFeature(null)
    } catch (err) {
      console.error('Failed to save planning area', err)
    }
  }, [planningAreasState, planningDraftFeature])

  const handleSaveRegionDraft = useCallback(async ({ terrainType, label, holeIds }) => {
    const result = await terrainState.saveRegionDraft(tools.regionDraft, { terrainType, label, holeIds })
    if (result?.success) {
      tools.clearRegionDraft()
    }
  }, [terrainState, tools])

  const handleDiscardRegionDraft = useCallback(() => {
    tools.discardRegionDraft()
    terrainState.setRegionMessage(null)
  }, [tools, terrainState])

  const handleOSMFeatureSelect = useCallback(async (feature, isShiftClick) => {
    if (isShiftClick) {
      const currentHole = holesState.selectedHole
      await terrainState.quickImportOSM(feature, currentHole?.id)
    } else {
      tools.acceptOSMFeatureAsDraft(feature)
      terrainState.selectOverlay(null)
      terrainState.setRegionMessage(null)
    }
  }, [holesState, terrainState, tools])

  const handleRegionDrawActiveChange = useCallback((active) => {
    tools.toggleRegionDraw(active)
    if (active) terrainState.selectOverlay(null)
  }, [tools, terrainState])

  const handleOsmToolActiveChange = useCallback((active) => {
    tools.toggleOsmTool(active)
    if (active) terrainState.selectOverlay(null)
  }, [tools, terrainState])

  // ── Early returns ─────────────────────────────────────────

  if (!id) {
    return (
      <div className="h-full w-full min-h-0 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-300 px-6 text-center">
        <p>Missing course id.</p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition-all duration-200">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (courseState.loading) {
    return (
      <div className="h-full w-full min-h-0 flex items-center justify-center bg-slate-900 text-slate-400">
        Loading course…
      </div>
    )
  }

  if (courseState.fetchError) {
    return (
      <div className="h-full w-full min-h-0 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-300 px-6 text-center">
        <p>Could not load this course: {courseState.fetchError}</p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition-all duration-200">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!courseState.course) {
    return (
      <div className="h-full w-full min-h-0 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-300 px-6 text-center">
        <p>Course not found or you do not have access.</p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition-all duration-200">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────

  const isPlanning = tools.workspaceMode === 'planning'

  return (
    <div className="h-full w-full min-h-0 flex flex-col bg-slate-900 border-t border-slate-800">
      <MapEditorHeader
        courseId={id}
        courseName={courseState.course.name}
        workspaceMode={tools.workspaceMode}
        onWorkspaceModeChange={handleWorkspaceModeChange}
        isMappingAdmin={isMappingAdmin}
        savingLocation={courseState.savingLocation}
        locationFeedback={courseState.locationFeedback}
        usingFallback={courseState.usingFallback}
        onSaveLocation={handleSaveLocation}
        mapReady={Boolean(mapInstance)}
        markerMessage={holesState.markerMessage}
        regionMessage={terrainState.regionMessage}
        regionDraft={tools.regionDraft}
      />

      <HoleWorkspace
        mapArea={
          <MapArea
            center={courseState.center}
            zoom={courseState.zoom}
            holesLoading={holesState.holesLoading}
            onMapReady={setMapInstance}
            visibleTerrainOverlays={visibleTerrainOverlays}
            selectedTerrainOverlayId={isPlanning ? null : terrainState.selectedTerrainOverlayId}
            onSelectTerrainOverlayId={terrainState.selectOverlay}
            regionDrawActive={tools.regionDrawActive}
            suppressTerrainInteractions={
              isPlanning ||
              tools.osmToolActive ||
              Boolean(tools.regionDraft) ||
              Boolean(tools.activePointTool)
            }
            onPolygonDrawn={handlePolygonDrawn}
            onGeometryCommit={terrainState.commitGeometry}
            osmToolActive={tools.osmToolActive && !isPlanning && !tools.regionDraft}
            osmFeaturesData={tools.osmFeaturesData}
            onOSMFeatureSelect={handleOSMFeatureSelect}
            regionDraft={isPlanning ? null : tools.regionDraft}
            onRegionDraftGeometryChange={tools.updateRegionDraftGeometry}
            selectedHole={holesState.selectedHole}
            activePointTool={tools.activePointTool}
            onMarkerPick={handleMarkerPick}
            onMarkerMove={holesState.movePlanningMarker}
            onMapMarkerMove={holesState.moveMapMarker}
            workspaceMode={tools.workspaceMode}
            suppressHoleMapPick={
              tools.regionDrawActive ||
              tools.osmToolActive ||
              Boolean(tools.regionDraft) ||
              (isPlanning &&
                tools.activePointTool !== 'tee_shot_location' &&
                tools.activePointTool !== 'landing_area' &&
                tools.activePointTool !== 'pin_location')
            }
            profile={profile}
            clubs={clubs}
            planningAreas={planningAreasState.areas}
            planningDrawShape={tools.planningDrawShape}
            onPlanningPolygonDrawn={handlePlanningPolygonDrawn}
            onPlanningGeometryCommit={(id, geojson) => {
              const existing = planningAreasState.areas.find(a => a.id === id)
              if (existing) {
                planningAreasState.addOrUpdateArea({
                  id,
                  label: existing.label,
                  description: existing.description,
                  style: existing.style,
                  geojsonData: geojson
                })
              }
            }}
            onPlanningAreaDelete={planningAreasState.removeArea}
            showLidar={tools.showLidar && tools.workspaceMode === 'planning'}
          />
        }
        holes={holesState.holes}
        selectedIndex={holesState.selectedHoleIndex}
        onSelectIndex={handleSelectHoleIndex}
        activePointTool={tools.activePointTool}
        onActivePointToolChange={tools.setActivePointTool}
        onSaveHoleStats={holesState.saveHoleStats}
        statsSaving={holesState.statsSaving}
        statsMessage={holesState.statsMessage}
        autoRotateHoleView={holesState.autoRotateHoleView}
        onAutoRotateHoleViewChange={holesState.setAutoRotateHoleView}
        regionDrawActive={tools.regionDrawActive}
        onRegionDrawActiveChange={handleRegionDrawActiveChange}
        planningDrawShape={tools.planningDrawShape}
        onPlanningDrawShapeChange={tools.setPlanningDrawShape}
        osmToolActive={tools.osmToolActive}
        onOsmToolActiveChange={handleOsmToolActiveChange}
        osmFilters={tools.osmFilters}
        onOsmFiltersChange={tools.setOsmFilters}
        osmLoading={tools.osmLoading}
        osmMessage={tools.osmMessage}
        regionDraft={tools.regionDraft}
        regionDraftKey={tools.regionDraftKey}
        showLidar={tools.showLidar}
        onShowLidarChange={tools.setShowLidar}
        onDiscardRegionDraft={handleDiscardRegionDraft}
        onSaveRegionDraft={handleSaveRegionDraft}
        regionSaving={terrainState.regionSaving}
        regionError={tools.regionDraft ? terrainState.regionMessage : null}
        selectedRegionOverlay={terrainState.selectedRegionOverlay}
        onClearRegionSelection={terrainState.clearSelection}
        onUpdateRegionProperties={terrainState.updateRegionProperties}
        onDeleteRegion={terrainState.deleteRegion}
        regionUpdateSaving={terrainState.regionUpdateSaving}
        regionUpdateMessage={terrainState.regionUpdateMessage}
        workspaceMode={tools.workspaceMode}
        onRemovePlanningMarker={holesState.removePlanningMarker}
        removePlanningSaving={holesState.removePlanningSaving}
        removePlanningMessage={holesState.removePlanningMessage}
        onInsertPlanningMarker={holesState.insertPlanningMarkerMidpoint}
        onMarkerMove={holesState.movePlanningMarker}
        onMapMarkerMove={holesState.moveMapMarker}
        clubs={clubs}
        profile={profile}
      />
      <PlanningAreaDialog
        open={planningDialogOpen}
        onClose={() => {
          setPlanningDialogOpen(false)
          setPlanningDraftFeature(null)
        }}
        onSave={handleSavePlanningArea}
      />
    </div>
  )
}
