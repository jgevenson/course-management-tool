import { useState, useCallback, useEffect } from 'react'
import { fetchOSMFeaturesInBbox } from '../features/map/utils/osmImport'

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
  const [planningDrawShape, setPlanningDrawShape] = useState('Polygon')
  const [osmToolActive, setOsmToolActive] = useState(false)
  const [showLidar, setShowLidar] = useState(false)
  const [osmFeaturesData, setOsmFeaturesData] = useState(null)
  const [osmFilters, setOsmFilters] = useState({
    tees: true,
    greens: true,
    fairways: true,
    bunkers: true,
    water: true,
    rough: true,
  })
  const [osmLoading, setOsmLoading] = useState(false)
  const [osmMessage, setOsmMessage] = useState(null)
  const [regionDraft, setRegionDraft] = useState(null)
  const [regionDraftKey, setRegionDraftKey] = useState(0)

  // --- Workspace mode ---

  const setWorkspaceMode = useCallback((mode) => {
    setWorkspaceModeRaw(mode)
    if (mode === 'planning') {
      setActivePointToolRaw(null)
      setRegionDrawActive(false)
      setOsmToolActive(false)
      setRegionDraft(null)
    } else {
      setShowLidar(false)
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
      setOsmToolActive(false)
    }
    setActivePointToolRaw(tool)
  }, [])

  // --- Region draw ---

  const toggleRegionDraw = useCallback((active) => {
    if (active) {
      setActivePointToolRaw(null)
      setOsmToolActive(false)
    }
    setRegionDrawActive(active)
  }, [])

  // --- OSM tool ---

  const toggleOsmTool = useCallback((active) => {
    setOsmMessage(null)
    if (active) {
      setActivePointToolRaw(null)
      setRegionDrawActive(false)
    } else {
      setOsmFeaturesData(null)
    }
    setOsmToolActive(active)
  }, [])

  // Fetch OSM features when tool activates or filters change
  useEffect(() => {
    if (osmToolActive && mapInstance) {
      const bounds = mapInstance.getBounds()
      const minLat = bounds.getSouth()
      const minLon = bounds.getWest()
      const maxLat = bounds.getNorth()
      const maxLon = bounds.getEast()

      setOsmFeaturesData(null)
      setOsmLoading(true)
      setOsmMessage('Fetching OSM features...')

      // Add client-side fetch timeout of 15 seconds to prevent indefinite hangs
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      fetchOSMFeaturesInBbox(minLat, minLon, maxLat, maxLon, osmFilters, { signal: controller.signal })
        .then((data) => {
          clearTimeout(timeoutId)
          setOsmLoading(false)
          if (data && data.features.length > 0) {
            setOsmFeaturesData(data)
            setOsmMessage(null)
          } else {
            setOsmToolActive(false)
            setOsmMessage('No OSM features found in this map area.')
          }
        })
        .catch((err) => {
          clearTimeout(timeoutId)
          setOsmLoading(false)
          setOsmToolActive(false)
          if (err.name === 'AbortError') {
            setOsmMessage('OpenStreetMap API timed out after 15 seconds. Please try again.')
          } else {
            setOsmMessage('Failed to fetch OSM features: API error or timeout.')
          }
          console.error('Failed to fetch OSM features:', err)
        })
    }
  }, [osmToolActive, mapInstance, osmFilters])

  // --- Region draft ---

  const acceptRegionDraft = useCallback((feature) => {
    setRegionDrawActive(false)
    setRegionDraft(feature)
    setRegionDraftKey((k) => k + 1)
  }, [])

  const discardRegionDraft = useCallback(() => {
    setRegionDraft(null)
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
    setOsmToolActive(false)
  }, [])

  /**
   * Accept an OSM feature as a region draft (normal click).
   */
  const acceptOSMFeatureAsDraft = useCallback((feature) => {
    setOsmToolActive(false)
    setOsmFeaturesData(null)
    setRegionDrawActive(false)
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
    osmToolActive,
    toggleOsmTool,
    osmFeaturesData,
    osmFilters,
    setOsmFilters,
    osmLoading,
    setOsmLoading,
    osmMessage,
    setOsmMessage,
    regionDraft,
    regionDraftKey,
    acceptRegionDraft,
    discardRegionDraft,
    updateRegionDraftGeometry,
    cancelAllTools,
    acceptOSMFeatureAsDraft,
    clearRegionDraft,
    planningDrawShape,
    setPlanningDrawShape,
    showLidar,
    setShowLidar,
  }
}
