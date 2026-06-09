import { useState, useCallback, useMemo, useEffect, startTransition } from 'react'
import { useTerrainOverlays } from './useTerrainOverlays'
import { mapApi } from '../services/api/mapApi'
import { terrainApi } from '../services/api/terrainApi'
import { isValidTerrainType, terrainTypeOptionLabel } from '../features/map/utils/regionTerrain'

/**
 * Map-editor wrapper around useTerrainOverlays that adds:
 * - region selection state
 * - region saving/updating UI state (saving flags, messages)
 * - OSM quick-import
 * - geojson property stamping before persistence
 */
export function useMapTerrainOverlays(courseId) {
  const terrain = useTerrainOverlays(courseId)

  const [selectedTerrainOverlayId, setSelectedTerrainOverlayId] = useState(null)
  const [regionSaving, setRegionSaving] = useState(false)
  const [regionMessage, setRegionMessage] = useState(null)
  const [regionUpdateSaving, setRegionUpdateSaving] = useState(false)
  const [regionUpdateMessage, setRegionUpdateMessage] = useState(null)

  // Derived: the full overlay object for the selected id
  const selectedRegionOverlay = useMemo(() => {
    if (!selectedTerrainOverlayId) return null
    return terrain.terrainOverlays.find((o) => o.id === selectedTerrainOverlayId) ?? null
  }, [terrain.terrainOverlays, selectedTerrainOverlayId])

  // Clear selection if the overlay disappears
  useEffect(() => {
    if (!selectedTerrainOverlayId) return
    if (!terrain.terrainOverlays.some((o) => o.id === selectedTerrainOverlayId)) {
      startTransition(() => {
        setSelectedTerrainOverlayId(null)
        setRegionUpdateMessage(null)
      })
    }
  }, [terrain.terrainOverlays, selectedTerrainOverlayId])

  // Filter overlays visible for a specific hole
  const visibleOverlaysForHole = useCallback(
    (holeId) => {
      if (!holeId) return []
      return terrain.terrainOverlays.filter(
        (o) => Array.isArray(o.holeIds) && o.holeIds.includes(holeId),
      )
    },
    [terrain.terrainOverlays],
  )

  /**
   * Save a drawn/imported region draft as a terrain overlay.
   */
  const saveRegionDraft = useCallback(
    async (draft, { terrainType, label, holeIds }) => {
      if (!draft || !courseId) return
      setRegionSaving(true)
      setRegionMessage(null)

      const featureToStore = {
        ...draft,
        properties: {
          ...(typeof draft.properties === 'object' && draft.properties !== null
            ? draft.properties
            : {}),
          terrain_type: terrainType,
          label: label || null,
        },
      }

      const result = await terrain.addOverlay({
        terrainType,
        label: label || null,
        holeIds,
        geojsonData: featureToStore,
      })

      if (!result.success) {
        setRegionMessage(result.error)
      }

      setSelectedTerrainOverlayId(null)
      setRegionSaving(false)
      return result
    },
    [courseId, terrain],
  )

  /**
   * Update properties (type, label, hole links) of a selected overlay.
   */
  const updateRegionProperties = useCallback(
    async ({ terrainType, label, holeIds }) => {
      const id = selectedTerrainOverlayId
      const overlay = terrain.terrainOverlays.find((o) => o.id === id)
      if (!id || !overlay) return
      if (!isValidTerrainType(terrainType) || holeIds.length === 0) {
        setRegionUpdateMessage('Choose a valid terrain type and at least one hole.')
        return
      }

      setRegionUpdateSaving(true)
      setRegionUpdateMessage(null)

      // Stamp properties into geojson
      const prevGj = overlay.geojson_data
      let nextGeojson = prevGj
      if (prevGj && typeof prevGj === 'object' && prevGj.type === 'Feature') {
        nextGeojson = {
          ...prevGj,
          properties: {
            ...(typeof prevGj.properties === 'object' && prevGj.properties !== null
              ? prevGj.properties
              : {}),
            terrain_type: terrainType,
            label: label || null,
          },
        }
      }

      const result = await terrain.updateOverlayProperties(id, {
        terrainType,
        label: label || null,
        geojsonData: nextGeojson,
        holeIds,
      })

      setRegionUpdateSaving(false)

      if (result.success) {
        setRegionUpdateMessage('Saved')
        window.setTimeout(() => setRegionUpdateMessage(null), 2500)
      } else {
        setRegionUpdateMessage(result.error)
      }
    },
    [selectedTerrainOverlayId, terrain],
  )

  /**
   * Hard delete the selected region.
   */
  const deleteRegion = useCallback(async () => {
    const id = selectedTerrainOverlayId
    if (!id) return
    const confirmed = window.confirm('Hard delete this region? This cannot be undone.')
    if (!confirmed) return

    setRegionUpdateSaving(true)
    setRegionUpdateMessage(null)

    const result = await terrain.removeOverlay(id)

    if (result.success) {
      setSelectedTerrainOverlayId(null)
    } else {
      setRegionUpdateMessage(result.error)
    }
    setRegionUpdateSaving(false)
  }, [selectedTerrainOverlayId, terrain])

  /**
   * Commit a geometry change (drag/reshape) for an overlay.
   */
  const commitGeometry = useCallback(
    async (overlayId, feature) => {
      setRegionMessage(null)
      const result = await terrain.updateOverlayGeometry(overlayId, feature)
      if (!result.success) {
        setRegionMessage(result.error)
      }
    },
    [terrain],
  )

  /**
   * Quick-import an OSM feature via shift-click.
   */
  const quickImportOSM = useCallback(
    async (feature, holeId) => {
      if (!courseId) return

      let terrainType = feature.properties?.golf || feature.properties?.natural || 'fairway'
      if (terrainType === 'water_hazard') terrainType = 'water'
      if (terrainType === 'sand') terrainType = 'bunker'
      if (!isValidTerrainType(terrainType)) terrainType = 'unknown'

      try {
        await mapApi.quickImportOSMFeature(courseId, holeId, feature, terrainType)
        await terrain.loadOverlays()
        setRegionMessage('Imported feature as ' + terrainTypeOptionLabel(terrainType))
      } catch (err) {
        console.error('Error auto-importing OSM feature:', err)
        setRegionMessage('Failed to import feature.')
      }
    },
    [courseId, terrain],
  )

  const selectOverlay = useCallback((id) => {
    setSelectedTerrainOverlayId(id)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTerrainOverlayId(null)
    setRegionUpdateMessage(null)
  }, [])

  return {
    terrainOverlays: terrain.terrainOverlays,
    selectedTerrainOverlayId,
    selectedRegionOverlay,
    regionSaving,
    regionMessage,
    setRegionMessage,
    regionUpdateSaving,
    regionUpdateMessage,
    visibleOverlaysForHole,
    saveRegionDraft,
    updateRegionProperties,
    deleteRegion,
    commitGeometry,
    quickImportOSM,
    selectOverlay,
    clearSelection,
    loadOverlays: terrain.loadOverlays,
  }
}
