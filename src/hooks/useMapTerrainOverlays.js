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
  const [selectedTerrainOverlayIds, setSelectedTerrainOverlayIds] = useState([])
  const [regionSaving, setRegionSaving] = useState(false)
  const [regionMessage, setRegionMessage] = useState(null)
  const [regionUpdateSaving, setRegionUpdateSaving] = useState(false)
  const [regionUpdateMessage, setRegionUpdateMessage] = useState(null)

  // Derived: the full overlay object for the selected id
  const selectedRegionOverlay = useMemo(() => {
    if (!selectedTerrainOverlayId) return null
    return terrain.terrainOverlays.find((o) => o.id === selectedTerrainOverlayId) ?? null
  }, [terrain.terrainOverlays, selectedTerrainOverlayId])

  // Sync selectedTerrainOverlayIds when overlays are loaded or removed
  useEffect(() => {
    setSelectedTerrainOverlayIds((prev) => {
      const existing = prev.filter((id) => terrain.terrainOverlays.some((o) => o.id === id))
      if (existing.length !== prev.length) {
        return existing
      }
      return prev
    })
  }, [terrain.terrainOverlays])

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
    const ids = selectedTerrainOverlayIds.length > 0 ? selectedTerrainOverlayIds : (selectedTerrainOverlayId ? [selectedTerrainOverlayId] : [])
    if (ids.length === 0) return
    const message = ids.length === 1
      ? 'Hard delete this region? This cannot be undone.'
      : `Hard delete all ${ids.length} selected regions? This cannot be undone.`
    const confirmed = window.confirm(message)
    if (!confirmed) return

    setRegionUpdateSaving(true)
    setRegionUpdateMessage(null)

    try {
      const results = await Promise.all(ids.map((id) => terrain.removeOverlay(id)))
      const failed = results.find((r) => !r.success)
      if (failed) {
        setRegionUpdateMessage(failed.error)
      } else {
        setSelectedTerrainOverlayIds([])
        setSelectedTerrainOverlayId(null)
      }
    } catch (err) {
      setRegionUpdateMessage(err.message)
    } finally {
      setRegionUpdateSaving(false)
    }
  }, [selectedTerrainOverlayIds, selectedTerrainOverlayId, terrain])

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

  const selectOverlay = useCallback((id, isMultiSelect = false) => {
    if (id === null) {
      setSelectedTerrainOverlayIds([])
      setSelectedTerrainOverlayId(null)
      return
    }

    setSelectedTerrainOverlayIds((prev) => {
      if (isMultiSelect) {
        if (prev.includes(id)) {
          const next = prev.filter((x) => x !== id)
          setSelectedTerrainOverlayId(next[next.length - 1] || null)
          return next
        } else {
          const next = [...prev, id]
          setSelectedTerrainOverlayId(id)
          return next
        }
      } else {
        setSelectedTerrainOverlayId(id)
        return [id]
      }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTerrainOverlayIds([])
    setSelectedTerrainOverlayId(null)
    setRegionUpdateMessage(null)
  }, [])

  return {
    terrainOverlays: terrain.terrainOverlays,
    selectedTerrainOverlayId,
    selectedTerrainOverlayIds,
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
