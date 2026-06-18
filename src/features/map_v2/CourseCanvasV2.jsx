// AI assisted development — MapLibre GL JS v2 Parallel Workspace
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMapCourse } from '../../hooks/useMapCourse'
import { useHoles } from '../../hooks/useHoles'
import { useMapTerrainOverlays } from '../../hooks/useMapTerrainOverlays'
import { useProfile } from '../../hooks/useProfile'
import { useClubs } from '../../hooks/useClubs'

import V2Header from './components/V2Header'
import V2SidebarLeft from './components/V2SidebarLeft'
import V2SidebarRight from './components/V2SidebarRight'
import V2MapArea from './components/V2MapArea'
import RegionPropertiesForm from '../map/components/HoleWorkspace/RegionPropertiesForm'
import PlanningDistancesPanel from '../map/components/HoleWorkspace/PlanningDistancesPanel'
import RegionOverlayAssignForm from '../map/components/HoleWorkspace/RegionOverlayAssignForm'
import { MapPin, Crosshair, Plus, Pentagon, Layers, RefreshCw, DownloadCloud } from 'lucide-react'
import V2ElevationContourLayer from './components/V2ElevationContourLayer'
import V2GreenContourLayer from './components/V2GreenContourLayer'
import V2OSMFeaturePanel from './components/V2OSMFeaturePanel'
import { supabase } from '../../supabaseClient'
import { fetchGreenElevationMatrix } from '../../services/api/greenElevationApi'
import { fetchOSMFeaturesInBbox } from '../map/utils/osmImport'

import './CourseCanvasV2.css'

/**
 * ## CourseCanvasV2
 *
 * Parallel WebGL-based course mapping canvas built on MapLibre GL JS.
 * Manages hooks and orchestrates layouts for Phase 1.
 */
export default function CourseCanvasV2() {
  const { id } = useParams()

  // ── Data hooks ────────────────────────────────────────────
  const { profile } = useProfile()
  const isMappingAdmin = profile?.is_mapping_admin ?? false
  const { clubs } = useClubs(profile?.id)

  const courseState = useMapCourse(id)
  const holesState = useHoles(courseState.course?.id)
  const terrainState = useMapTerrainOverlays(courseState.course?.id)

  // ── Workspace State ───────────────────────────────────────
  const [workspaceMode, setWorkspaceMode] = useState('planning')
  const [showLidar, setShowLidar] = useState(false)
  const [recalibrating, setRecalibrating] = useState(false)

  // ── OSM Tool State ─────────────────────────────────────────
  const [osmToolActive, setOsmToolActive] = useState(false)
  const [osmFilters, setOsmFilters] = useState({
    tees: true,
    greens: true,
    fairways: false,
    bunkers: true,
    water: true,
    rough: false,
  })
  const [osmLoading, setOsmLoading] = useState(false)
  const [osmMessage, setOsmMessage] = useState(null)
  const [osmFeaturesData, setOsmFeaturesData] = useState(null)

  const handleRecalibrateHole = async () => {
    const holeId = selectedHole?.id
    if (!holeId) return
    setRecalibrating(true)
    console.log(`[Recalibrate] Starting recalibration for hole:`, holeId)
    console.time('[Recalibrate] Total Time')
    try {
      console.time(`[Recalibrate] Hole ${holeId} - Delete Cache`)
      await supabase.from('green_contours').delete().eq('hole_id', holeId)
      await supabase.from('hole_elevation_grids').delete().eq('hole_id', holeId)
      console.timeEnd(`[Recalibrate] Hole ${holeId} - Delete Cache`)

      console.time(`[Recalibrate] Hole ${holeId} - Generate General Grid`)
      await supabase.functions.invoke('generate-elevation-grid', {
        body: { hole_id: holeId, resolution: 3 }
      })
      console.timeEnd(`[Recalibrate] Hole ${holeId} - Generate General Grid`)

      console.time(`[Recalibrate] Hole ${holeId} - Generate Green Grid`)
      try {
        await fetchGreenElevationMatrix(holeId, true)
      } catch (err) {
        console.warn(`[Recalibrate] Green contour fetch failed:`, err.message)
      }
      console.timeEnd(`[Recalibrate] Hole ${holeId} - Generate Green Grid`)
      
      // Force UI refresh of contours if they are currently active
      if (showLidar) {
        setShowLidar(false)
        setTimeout(() => setShowLidar(true), 150)
      }
    } catch (err) {
      console.error('[Recalibrate] Error recalibrating contours:', err)
    } finally {
      console.timeEnd('[Recalibrate] Total Time')
      setRecalibrating(false)
    }
  }

  // Enforce planning mode for non-admin users
  useEffect(() => {
    if (!isMappingAdmin && workspaceMode !== 'planning') {
      setWorkspaceMode('planning')
    }
  }, [isMappingAdmin, workspaceMode])

  const selectedHole = holesState.holes[holesState.selectedHoleIndex] || null

  // ── Overlay Hole-Filtering ───────────────────────────────
  const filteredOverlays = useMemo(() => {
    if (!selectedHole) return terrainState.terrainOverlays // Course View
    return terrainState.terrainOverlays.filter(
      (o) => Array.isArray(o.holeIds) && o.holeIds.includes(selectedHole.id)
    )
  }, [terrainState.terrainOverlays, selectedHole])

  // ── Center and Zoom Computations ──────────────────────────
  const course = courseState.course
  const courseCenter = useMemo(() => {
    return course && course.course_lat && course.course_lat !== 0
      ? [course.course_lng, course.course_lat] // MapLibre: [lng, lat]
      : [-98.5795, 39.8283] // US center fallback
  }, [course])

  const courseZoom = useMemo(() => {
    return course && course.course_lat && course.course_lat !== 0 ? 16 : 4
  }, [course])

  // ── Workspace State Hooks (unconditional) ─────────────────
  const [mapInstance, setMapInstance] = useState(null)
  const [activePointTool, setActivePointTool] = useState(null)
  const [drawMode, setDrawMode] = useState(null)
  const [drawCoordinates, setDrawCoordinates] = useState([])
  const [regionDraft, setRegionDraft] = useState(null)

  const handleMarkerPick = useCallback(async (tool, lat, lng) => {
    const isClickPlacement = Boolean(activePointTool)
    const data = await holesState.placeMarker(tool, lat, lng)
    if (data) {
      setActivePointTool(null)
      if (isClickPlacement && !holesState.autoRotateHoleView && mapInstance) {
        mapInstance.flyTo({
          center: [lng, lat],
          zoom: Math.max(mapInstance.getZoom(), 17),
          duration: 800
        })
      }
    }
  }, [holesState, activePointTool, mapInstance])

  const handleSaveRegionDraft = useCallback(async ({ terrainType, label, holeIds }) => {
    if (!regionDraft) return
    const result = await terrainState.saveRegionDraft(regionDraft, { terrainType, label, holeIds })
    if (result?.success) {
      setRegionDraft(null)
    }
  }, [terrainState, regionDraft])

  const handleOSMSearch = async () => {
    if (!mapInstance) return
    const bounds = mapInstance.getBounds()
    const minLat = bounds.getSouth()
    const minLon = bounds.getWest()
    const maxLat = bounds.getNorth()
    const maxLon = bounds.getEast()

    setOsmFeaturesData(null)
    setOsmLoading(true)
    setOsmMessage('Fetching OSM features...')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const data = await fetchOSMFeaturesInBbox(minLat, minLon, maxLat, maxLon, osmFilters, { signal: controller.signal })
      clearTimeout(timeoutId)
      setOsmLoading(false)
      if (data && data.features.length > 0) {
        setOsmFeaturesData(data)
        setOsmMessage(null)
      } else {
        setOsmMessage('No OSM features found in this map area.')
      }
    } catch (err) {
      clearTimeout(timeoutId)
      setOsmLoading(false)
      if (err.name === 'AbortError') {
        setOsmMessage('OpenStreetMap API timed out after 15 seconds. Please try again.')
      } else {
        setOsmMessage('Failed to fetch OSM features: API error or timeout.')
      }
      console.error('Failed to fetch OSM features:', err)
    }
  }

  // ── Early returns ────────────────────────────────────────
  if (!id) {
    return (
      <div className="v2-state">
        <p>Missing course id.</p>
        <Link to="/" className="v2-state__link">Back to Dashboard</Link>
      </div>
    )
  }

  if (courseState.loading || holesState.holesLoading) {
    return (
      <div className="v2-state">
        <div className="v2-state__spinner" />
        <p>Loading course data…</p>
      </div>
    )
  }

  if (courseState.fetchError) {
    return (
      <div className="v2-state">
        <p>Could not load this course: {courseState.fetchError}</p>
        <Link to="/" className="v2-state__link">Back to Dashboard</Link>
      </div>
    )
  }

  if (!courseState.course) {
    return (
      <div className="v2-state">
        <p>Course not found or you do not have access.</p>
        <Link to="/" className="v2-state__link">Back to Dashboard</Link>
      </div>
    )
  }

  const selectedRegionOverlay = workspaceMode === 'mapping' ? terrainState.selectedRegionOverlay : null
  const showRegionPropertiesPanel = Boolean(selectedRegionOverlay)
  const regionPropsFormKey = selectedRegionOverlay
    ? `${selectedRegionOverlay.id}|${selectedRegionOverlay.terrain_type}|${selectedRegionOverlay.label ?? ''}|${[...selectedRegionOverlay.holeIds].sort().join(',')}`
    : 'none'

  const handleSelectHoleIndex = (idx) => {
    holesState.selectHoleIndex(idx)
    terrainState.selectOverlay(null)
    setActivePointTool(null)
    setDrawMode(null)
    setDrawCoordinates([])
    setRegionDraft(null)
    setOsmToolActive(false)
    setOsmFeaturesData(null)
  }

  return (
    <div className="v2-canvas">
      {/* Header component */}
      <V2Header
        courseId={id}
        courseName={courseState.course.name}
        workspaceMode={workspaceMode}
        onWorkspaceModeChange={(mode) => {
          setWorkspaceMode(mode)
          terrainState.selectOverlay(null)
          setActivePointTool(null)
          setDrawMode(null)
          setDrawCoordinates([])
          setRegionDraft(null)
          setOsmToolActive(false)
          setOsmFeaturesData(null)
        }}
        isMappingAdmin={isMappingAdmin}
        overlaysLoading={terrainState.loading}
        overlaysError={terrainState.error}
        overlaysCount={filteredOverlays.length}
        onSaveCourseLocation={() => courseState.saveCourseLocation(mapInstance)}
        savingLocation={courseState.savingLocation}
        locationFeedback={courseState.locationFeedback}
      />

      {/* Main Workspace Body */}
      {holesState.markerMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-900 text-white px-4 py-2 rounded-md shadow-lg border border-red-700 max-w-lg text-center font-mono text-sm">
          {holesState.markerMessage}
          <button 
            onClick={() => holesState.setMarkerMessage(null)}
            className="ml-4 text-red-200 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      <div className="v2-body">
        {/* Left Sidebar: Hole Selector + Workspace Tools */}
        <V2SidebarLeft
          holes={holesState.holes}
          selectedHoleIndex={holesState.selectedHoleIndex}
          onSelectHoleIndex={handleSelectHoleIndex}
        >
          {regionDraft ? (
            <RegionOverlayAssignForm
              holes={holesState.holes}
              selectedHole={selectedHole}
              onDiscardRegionDraft={() => setRegionDraft(null)}
              onSaveRegionDraft={handleSaveRegionDraft}
              regionSaving={terrainState.regionSaving}
              regionError={terrainState.regionMessage}
            />
          ) : (
            <div className="v2-tools-panel">
              <h3 className="v2-tools-panel__title">
                {workspaceMode === 'mapping' ? 'Mapping Tools' : 'Planning Tools'}
              </h3>
              
              <div className="v2-tools-panel__buttons">
                {workspaceMode === 'mapping' ? (
                  drawMode === 'polygon' ? (
                    <div className="v2-draw-panel flex flex-col gap-3 p-3 bg-slate-900/40 border border-slate-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Drawing Region</span>
                        <span className="v2-draw-badge text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 font-mono">
                          {drawCoordinates.length} vertices
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-normal">Click on the map to place polygon points. Click the first point or use the complete button below to close the loop.</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDrawMode(null)
                            setDrawCoordinates([])
                          }}
                          className="flex-1 rounded-lg border border-slate-700 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          disabled={drawCoordinates.length < 3}
                          onClick={() => {
                            if (drawCoordinates.length >= 3) {
                              const closedCoords = [...drawCoordinates, drawCoordinates[0]]
                              const feature = {
                                type: 'Feature',
                                geometry: {
                                  type: 'Polygon',
                                  coordinates: [closedCoords]
                                },
                                properties: {}
                              }
                              setRegionDraft(feature)
                              setDrawMode(null)
                              setDrawCoordinates([])
                            }
                          }}
                          className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40 transition-all duration-200"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePointTool(activePointTool === 'tee_back' ? null : 'tee_back')
                          setDrawMode(null)
                        }}
                        className={`v2-tool-btn ${activePointTool === 'tee_back' ? 'v2-tool-btn--active' : ''}`}
                        disabled={!selectedHole}
                      >
                        <MapPin className="w-4 h-4 text-amber-500" />
                        <span>Back Tee</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setActivePointTool(activePointTool === 'green_center' ? null : 'green_center')
                          setDrawMode(null)
                        }}
                        className={`v2-tool-btn ${activePointTool === 'green_center' ? 'v2-tool-btn--active' : ''}`}
                        disabled={!selectedHole}
                      >
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        <span>Green Center</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDrawMode('polygon')
                          setActivePointTool(null)
                          setOsmToolActive(false)
                          setDrawCoordinates([])
                        }}
                        className="v2-tool-btn"
                        disabled={!selectedHole}
                      >
                        <Pentagon className="w-4 h-4 text-emerald-400" />
                        <span>Draw Region</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextActive = !osmToolActive
                          setOsmToolActive(nextActive)
                          if (nextActive) {
                            setActivePointTool(null)
                            setDrawMode(null)
                          } else {
                            setOsmFeaturesData(null)
                            setOsmMessage(null)
                          }
                        }}
                        className={`v2-tool-btn ${osmToolActive ? 'v2-tool-btn--active' : ''}`}
                        disabled={!selectedHole}
                      >
                        <DownloadCloud className="w-4 h-4 text-sky-400" />
                        <span>Fetch OSM Features</span>
                      </button>

                      {osmToolActive && (
                        <div className="mt-2">
                          <V2OSMFeaturePanel
                            osmToolActive={osmToolActive}
                            osmFilters={osmFilters}
                            onOsmFiltersChange={setOsmFilters}
                            osmLoading={osmLoading}
                            osmMessage={osmMessage}
                            onSearch={handleOSMSearch}
                          />
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActivePointTool(activePointTool === 'tee_shot_location' ? null : 'tee_shot_location')}
                      className={`v2-tool-btn ${activePointTool === 'tee_shot_location' ? 'v2-tool-btn--active' : ''}`}
                      disabled={!selectedHole}
                    >
                      <Crosshair className="w-4 h-4 text-sky-400" />
                      <span>Tee Shot</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setActivePointTool(activePointTool === 'landing_area' ? null : 'landing_area')}
                      className={`v2-tool-btn ${activePointTool === 'landing_area' ? 'v2-tool-btn--active' : ''}`}
                      disabled={!selectedHole}
                    >
                      <Plus className="w-4 h-4 text-violet-400" />
                      <span>Landing Area</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setActivePointTool(activePointTool === 'pin_location' ? null : 'pin_location')}
                      className={`v2-tool-btn ${activePointTool === 'pin_location' ? 'v2-tool-btn--active' : ''}`}
                      disabled={!selectedHole}
                    >
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>Pin Location</span>
                    </button>
                    
                    <div className="w-full h-px bg-slate-800/50 my-1" />
                    
                    <button
                      type="button"
                      onClick={() => setShowLidar(!showLidar)}
                      className={`v2-tool-btn ${showLidar ? 'v2-tool-btn--active' : ''}`}
                      disabled={!selectedHole}
                    >
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>{showLidar ? 'Hide Contours' : 'Show Contours'}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleRecalibrateHole}
                      className="v2-tool-btn"
                      disabled={!selectedHole || recalibrating}
                    >
                      <RefreshCw className={`w-4 h-4 text-blue-300 ${recalibrating ? 'animate-spin' : ''}`} />
                      <span>{recalibrating ? 'Recalibrating...' : 'Recalibrate'}</span>
                    </button>
                  </>
                )}
              </div>
              
              {activePointTool && (
                <button
                  type="button"
                  onClick={() => setActivePointTool(null)}
                  className="v2-cancel-btn"
                >
                  Cancel Placement
                </button>
              )}
            </div>
          )}
        </V2SidebarLeft>

        {/* Center: MapLibre Map Area */}
        <V2MapArea
          course={courseState.course}
          selectedHole={selectedHole}
          filteredOverlays={filteredOverlays}
          courseCenter={courseCenter}
          courseZoom={courseZoom}
          workspaceMode={workspaceMode}
          clubs={clubs}
          profile={profile}
          selectedTerrainOverlayId={workspaceMode === 'mapping' ? terrainState.selectedTerrainOverlayId : null}
          onSelectTerrainOverlayId={terrainState.selectOverlay}
          activePointTool={activePointTool}
          onPick={handleMarkerPick}
          onMarkerMove={holesState.movePlanningMarker}
          onMapMarkerMove={holesState.moveMapMarker}
          onMapReady={setMapInstance}
          drawMode={drawMode}
          drawCoordinates={drawCoordinates}
          onDrawCoordinatesChange={setDrawCoordinates}
          regionDraft={regionDraft}
          onRegionDraftChange={setRegionDraft}
          onCommitGeometry={terrainState.commitGeometry}
          osmFeaturesData={osmFeaturesData}
          onOsmFeatureSelect={async (feature, isShiftClick) => {
            if (isShiftClick) {
              await terrainState.quickImportOSM(feature, selectedHole?.id)
            } else {
              setRegionDraft(feature)
              setOsmToolActive(false)
              setOsmFeaturesData(null)
            }
          }}
        />
        
        <V2ElevationContourLayer
          mapInstance={mapInstance}
          holeId={selectedHole?.id}
          visibleTerrainOverlays={filteredOverlays}
          showLidar={showLidar}
        />
        <V2GreenContourLayer
          mapInstance={mapInstance}
          holeId={selectedHole?.id}
          visibleTerrainOverlays={filteredOverlays}
          showLidar={showLidar}
        />

        {/* Right Sidebar: Inspector */}
        <V2SidebarRight isOpen={workspaceMode === 'planning' || showRegionPropertiesPanel}>
          {workspaceMode === 'planning' && selectedHole && (
            <PlanningDistancesPanel
              hole={selectedHole}
              onRemoveMarker={holesState.removePlanningMarker}
              onInsertPlanningMarker={holesState.insertPlanningMarkerMidpoint}
              removing={holesState.removePlanningSaving}
              message={holesState.removePlanningMessage}
              clubs={clubs}
            />
          )}
          {workspaceMode === 'mapping' && selectedRegionOverlay && (
            <RegionPropertiesForm
              key={regionPropsFormKey}
              overlay={selectedRegionOverlay}
              holes={holesState.holes}
              onSave={terrainState.updateRegionProperties}
              onDelete={terrainState.deleteRegion}
              onDone={terrainState.clearSelection}
              saving={terrainState.regionUpdateSaving}
              message={terrainState.regionUpdateMessage}
            />
          )}
        </V2SidebarRight>
      </div>
    </div>
  )
}
