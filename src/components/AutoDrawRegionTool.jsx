// AI assisted development
import { useCallback, useEffect, useRef } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import { createAutoDrawRegion } from '../utils/autoDrawRegion'

/**
 * @param {object} props
 * @param {boolean} props.active
 * @param {boolean} props.disabled
 * @param {number} props.tolerance
 * @param {number} props.maxRadiusYards
 * @param {string} props.tileUrlTemplate
 * @param {number} props.maxNativeZoom
 * @param {(feature: GeoJSON.Feature<GeoJSON.Polygon>) => void} props.onFeatureCreated
 * @param {(message: string | null) => void} props.onStatusChange
 */
export default function AutoDrawRegionTool({
  active,
  disabled,
  tolerance,
  maxRadiusYards,
  tileUrlTemplate,
  maxNativeZoom,
  onFeatureCreated,
  onStatusChange,
}) {
  const map = useMap()
  const workingRef = useRef(false)

  const handleSeedPick = useCallback(
    async (latlng) => {
      if (!active || disabled || workingRef.current) return

      workingRef.current = true
      onStatusChange('Sampling imagery and tracing boundary…')

      try {
        const feature = await createAutoDrawRegion({
          map,
          seedLatLng: latlng,
          tolerance,
          maxRadiusYards,
          tileUrlTemplate,
          maxNativeZoom,
        })
        onFeatureCreated(feature)
        onStatusChange('Auto draw created a draft region. Choose its type and save it.')
      } catch (error) {
        onStatusChange(error instanceof Error ? error.message : 'Auto draw could not create a region.')
      } finally {
        workingRef.current = false
      }
    },
    [
      active,
      disabled,
      map,
      maxNativeZoom,
      maxRadiusYards,
      onFeatureCreated,
      onStatusChange,
      tileUrlTemplate,
      tolerance,
    ],
  )

  useMapEvents({
    click(e) {
      if (!active || disabled) return
      void handleSeedPick(e.latlng)
    },
  })

  useEffect(() => {
    const el = map.getContainer()
    if (active && !disabled) {
      el.style.cursor = 'crosshair'
    } else {
      el.style.cursor = ''
    }
    return () => {
      el.style.cursor = ''
    }
  }, [active, disabled, map])

  return null
}
