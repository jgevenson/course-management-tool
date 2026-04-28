// AI assisted development
import { useEffect } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import { styleForRegionPhase } from '../utils/regionTerrain'

/**
 * @param {object} props
 * @param {GeoJSON.Feature | null} props.feature
 * @param {(feature: GeoJSON.Feature) => void} props.onFeatureChange
 */
export default function RegionDraftPreview({ feature, onFeatureChange }) {
  const map = useMap()

  useEffect(() => {
    if (!feature?.geometry) return undefined

    const layers = []
    const layer = L.geoJSON(feature, {
      interactive: true,
      pmIgnore: false,
      style: () => styleForRegionPhase({ terrainType: 'fairway', phase: 'selected' }),
      onEachFeature(_feat, draftLayer) {
        const path = /** @type {L.Path} */ (draftLayer)
        path.options.pmIgnore = false
        layers.push(path)
      },
    }).addTo(map)

    layer.bringToFront()
    layers.forEach((draftLayer) => {
      const commitDraftGeometry = () => {
        const gj = draftLayer.toGeoJSON()
        if (gj.type === 'Feature') {
          onFeatureChange(/** @type {GeoJSON.Feature} */ (gj))
        }
      }

      if (draftLayer.pm && !draftLayer.pm.enabled()) {
        draftLayer.pm.enable({ snappable: true })
      }
      draftLayer.on('pm:edit', commitDraftGeometry)
      draftLayer.on('pm:update', commitDraftGeometry)
    })

    return () => {
      layers.forEach((draftLayer) => {
        if (draftLayer.pm?.enabled()) draftLayer.pm.disable()
        draftLayer.off('pm:edit')
        draftLayer.off('pm:update')
      })
      map.removeLayer(layer)
    }
  }, [feature, map, onFeatureChange])

  return null
}
