import { useState, useCallback, useEffect } from 'react'
import { fetchOSMFeaturesInBbox } from '../features/map/utils/osmImport'

const AUTO_DRAW_DEFAULT_TOLERANCE = 42
const AUTO_DRAW_MIN_RADIUS_YARDS = 5
const AUTO_DRAW_MAX_RADIUS_YARDS = 60
const AUTO_DRAW_DEFAULT_RADIUS_YARDS = 25

/**
 * Manages tool state and mutual exclusion for the map editor.
 * Ensures only one drawing tool is active at a time.
 */
export function useMapTools(mapInstance) {
  const [workspaceMode, setWorkspaceModeRaw] = useState(
    /** @returns {'mapping' | 'planning'} */ () => 'mapping',
  )
  const [activePointTool, setActivePointToolRaw] = useState(null)
  const [regionDrawActive, setRegionDrawActive] = useState(false)
  const [autoDrawActive, setAutoDrawActive] = useState(false)
  const [autoDrawTolerance, setAutoDrawToleranceRaw] = useState(AUTO_DRAW_DEFAULT_TOLERANCE)
  const [autoDrawMaxRadiusYards, setAutoDrawMaxRadiusYardsRaw] = useState(AUTO_DRAW_DEFAULT_RADIUS_YARDS)
  const [autoDrawMessage, setAutoDrawMessage] = useState(null)
  const [osmToolActive, setOsmToolActive] = useState(false)
  const [osmFeaturesData, setOsmFeaturesData] = useState(null)
  const [regionDraft, setRegionDraft] = useState(null)
  const [regionDraftKey, setRegionDraftKey] = useState(0)

  // --- Workspace mode ---

  const setWorkspaceMode = useCallback((mode) => {
    setWorkspaceModeRaw(mode)
    if (mode === 'planning') {
      setActivePointToolRaw(null)
      setRegionDrawActive(false)
      setAutoDrawActive(false)
      setAutoDrawMessage(null)
      setOsmToolActive(false)
      setRegionDraft(null)
    } else {
      setActivePointToolRaw((prev) =>
        prev === 'tee_shot_location' ||
        prev === 'landing_area' ||
        prev === 'pin_location'
          ? null
          : prev,
      )
    }
  }, [])

  // --- Point tool ---

  const setActivePointTool = useCallback((tool) => {
    if (tool) {
      setRegionDrawActive(false)
      setAutoDrawActive(false)
      setAutoDrawMessage(null)
      setOsmToolActive(false)
    }
    setActivePointToolRaw(tool)
  }, [])

  // --- Region draw ---

  const toggleRegionDraw = useCallback((active) => {
    if (active) {
      setActivePointToolRaw(null)
      setAutoDrawActive(false)
      setAutoDrawMessage(null)
      setOsmToolActive(false)
    }
    setRegionDrawActive(active)
  }, [])

  // --- Auto draw ---

  const toggleAutoDraw = useCallback((active) => {
    if (active) {
      setActivePointToolRaw(null)
      setRegionDrawActive(false)
      setAutoDrawMessage('Click a clean seed point inside the area to trace.')
      setOsmToolActive(false)
    } else {
      setAutoDrawMessage(null)
    }
    setAutoDrawActive(active)
  }, [])

  const setAutoDrawTolerance = useCallback((value) => {
    setAutoDrawToleranceRaw(
      Number.isFinite(value) ? Math.min(140, Math.max(8, value)) : AUTO_DRAW_DEFAULT_TOLERANCE,
    )
  }, [])

  const setAutoDrawMaxRadiusYards = useCallback((value) => {
    setAutoDrawMaxRadiusYardsRaw(
      Number.isFinite(value)
        ? Math.min(AUTO_DRAW_MAX_RADIUS_YARDS, Math.max(AUTO_DRAW_MIN_RADIUS_YARDS, value))
        : AUTO_DRAW_DEFAULT_RADIUS_YARDS,
    )
  }, [])

  // --- OSM tool ---

  const toggleOsmTool = useCallback((active) => {
    if (active) {
      setActivePointToolRaw(null)
      setRegionDrawActive(false)
      setAutoDrawActive(false)
      setAutoDrawMessage(null)
    } else {
      setOsmFeaturesData(null)
    }
    setOsmToolActive(active)
  }, [])

  // Fetch OSM features when tool activates
  useEffect(() => {
    if (osmToolActive && mapInstance) {
      const bounds = mapInstance.getBounds()
      const minLat = bounds.getSouth()
      const minLon = bounds.getWest()
      const maxLat = bounds.getNorth()
      const maxLon = bounds.getEast()

      setOsmFeaturesData(null)
      fetchOSMFeaturesInBbox(minLat, minLon, maxLat, maxLon)
        .then((data) => {
          if (data && data.features.length > 0) {
            setOsmFeaturesData(data)
          } else {
            console.log('No OSM features found in this area.')
          }
        })
        .catch((err) => {
          console.error('Failed to fetch OSM features:', err)
        })
    }
  }, [osmToolActive, mapInstance])

  // --- Region draft ---

  const acceptRegionDraft = useCallback((feature) => {
    setRegionDrawActive(false)
    setAutoDrawActive(false)
    setRegionDraft(feature)
    setRegionDraftKey((k) => k + 1)
  }, [])

  const discardRegionDraft = useCallback(() => {
    setRegionDraft(null)
    setAutoDrawMessage(null)
  }, [])

  const updateRegionDraftGeometry = useCallback((feature) => {
    setRegionDraft(feature)
  }, [])

  /**
   * Cancel all active tools at once.
   */
  const cancelAllTools = useCallback(() => {
    setActivePointToolRaw(null)
    setRegionDrawActive(false)
    setAutoDrawActive(false)
    setOsmToolActive(false)
  }, [])

  /**
   * Accept an OSM feature as a region draft (normal click).
   */
  const acceptOSMFeatureAsDraft = useCallback((feature) => {
    setOsmToolActive(false)
    setOsmFeaturesData(null)
    setRegionDrawActive(false)
    setAutoDrawActive(false)
    setRegionDraft(feature)
    setRegionDraftKey((k) => k + 1)
  }, [])

  /**
   * Clear the region draft after it has been saved.
   */
  const clearRegionDraft = useCallback(() => {
    setRegionDraft(null)
  }, [])

  return {
    workspaceMode,
    setWorkspaceMode,
    activePointTool,
    setActivePointTool,
    regionDrawActive,
    toggleRegionDraw,
    autoDrawActive,
    toggleAutoDraw,
    autoDrawTolerance,
    setAutoDrawTolerance,
    autoDrawMaxRadiusYards,
    setAutoDrawMaxRadiusYards,
    autoDrawMessage,
    setAutoDrawMessage,
    osmToolActive,
    toggleOsmTool,
    osmFeaturesData,
    regionDraft,
    regionDraftKey,
    acceptRegionDraft,
    discardRegionDraft,
    updateRegionDraftGeometry,
    cancelAllTools,
    acceptOSMFeatureAsDraft,
    clearRegionDraft,
  }
}
