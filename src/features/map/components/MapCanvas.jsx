// AI assisted development
import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMapCourse } from '../../../hooks/useMapCourse'
import { useHoles } from '../../../hooks/useHoles'
import { useMapTools } from '../../../hooks/useMapTools'
import { useMapTerrainOverlays } from '../../../hooks/useMapTerrainOverlays'
import { useMapViewControl } from '../../../hooks/useMapViewControl'
import MapEditorHeader from './MapEditorHeader'
import MapArea from './MapArea'
import HoleWorkspace from './HoleWorkspace'

export default function MapCanvas() {
  const { id } = useParams()
  const [mapInstance, setMapInstance] = useState(null)

  // ── Data hooks ────────────────────────────────────────────
  const courseState = useMapCourse(id)
  const holesState = useHoles(courseState.course?.id)
  const terrainState = useMapTerrainOverlays(courseState.course?.id)
  const tools = useMapTools(mapInstance)
  useMapViewControl(mapInstance, holesState, courseState.course)

  // ── Derived values ────────────────────────────────────────
  const visibleTerrainOverlays = useMemo(() => {
    return terrainState.visibleOverlaysForHole(holesState.selectedHole?.id)
  }, [terrainState, holesState.selectedHole?.id])

  // ── Bridging callbacks ────────────────────────────────────
  // These thin handlers connect hooks that need to coordinate.

  const handleSelectHoleIndex = useCallback((idx) => {
    holesState.setAutoRotateHoleView(false)
    tools.toggleAutoDraw(false)
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
    const data = await holesState.placeMarker(tool, lat, lng)
    if (data) {
      tools.setActivePointTool(null)
      if (!holesState.autoRotateHoleView && mapInstance) {
        mapInstance.flyTo([lat, lng], Math.max(mapInstance.getZoom(), 17))
      }
    }
  }, [holesState, tools, mapInstance])

  const handlePolygonDrawn = useCallback((feature) => {
    tools.acceptRegionDraft(feature)
    terrainState.selectOverlay(null)
  }, [tools, terrainState])

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

  const handleAutoDrawActiveChange = useCallback((active) => {
    tools.toggleAutoDraw(active)
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
            regionDrawActive={tools.regionDrawActive && !isPlanning}
            suppressTerrainInteractions={
              isPlanning ||
              tools.autoDrawActive ||
              tools.osmToolActive ||
              Boolean(tools.regionDraft) ||
              Boolean(tools.activePointTool)
            }
            onPolygonDrawn={handlePolygonDrawn}
            onGeometryCommit={terrainState.commitGeometry}
            autoDrawActive={tools.autoDrawActive && !isPlanning}
            autoDrawDisabled={!holesState.selectedHole || Boolean(tools.regionDraft) || isPlanning}
            autoDrawTolerance={tools.autoDrawTolerance}
            autoDrawMaxRadiusYards={tools.autoDrawMaxRadiusYards}
            onAutoDrawFeatureCreated={handlePolygonDrawn}
            onAutoDrawStatusChange={tools.setAutoDrawMessage}
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
              tools.autoDrawActive ||
              tools.osmToolActive ||
              Boolean(tools.regionDraft) ||
              (isPlanning &&
                tools.activePointTool !== 'tee_shot_location' &&
                tools.activePointTool !== 'landing_area' &&
                tools.activePointTool !== 'pin_location')
            }
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
        autoDrawActive={tools.autoDrawActive}
        onAutoDrawActiveChange={handleAutoDrawActiveChange}
        autoDrawTolerance={tools.autoDrawTolerance}
        onAutoDrawToleranceChange={tools.setAutoDrawTolerance}
        autoDrawMaxRadiusYards={tools.autoDrawMaxRadiusYards}
        onAutoDrawMaxRadiusYardsChange={tools.setAutoDrawMaxRadiusYards}
        autoDrawMessage={tools.autoDrawMessage}
        osmToolActive={tools.osmToolActive}
        onOsmToolActiveChange={handleOsmToolActiveChange}
        regionDraft={tools.regionDraft}
        regionDraftKey={tools.regionDraftKey}
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
        onMarkerMove={holesState.movePlanningMarker}
        onMapMarkerMove={holesState.moveMapMarker}
      />
    </div>
  )
}
