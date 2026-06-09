// AI assisted development
import { useEffect } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import { styleForRegionPhase } from '../utils/regionTerrain'
import { stripGeomanMarkerTabIndex } from '../utils/mapInteractions'

/**
 * ## Region Draft Preview Component
 * 
 * A specialized map layer component that displays a draft version of a terrain region, 
 * enabling users to visualize and edit it before committing. This component leverages 
 * the `leaflet-geoman-free` library to provide interactive editing capabilities.
 *
 * ### Component Responsibilities
 * - **Draft Visualization**: Renders a GeoJSON feature representing the region draft, 
 *   applying a distinct style to differentiate it from other map layers.
 * - **Interactive Editing**: Activates the `leaflet-geoman` plugin on the draft layer, 
 *   allowing users to move, rotate, and resize the region using standard `geoman` handles.
 * - **State Synchronization**: Continuously monitors changes to the draft geometry during 
 *   editing. Upon completion of an edit operation (or update), it triggers the `onFeatureChange` 
 *   callback to synchronize the changes with the parent component.
 * - **Cleanup**: Properly manages the lifecycle of the draft layer, ensuring that the `geoman` 
 *   plugin is disabled and the layer is removed from the map when the component unmounts 
 *   or the `feature` prop changes.
 *
 * ### Data Flow & Dependencies
 * The component operates as a controlled component, receiving the `feature` data from its 
 * parent. It uses the `useMap` hook to access the underlying Leaflet map instance. The 
 * `onFeatureChange` callback is essential for communicating the edited geometry back to the 
 * parent, allowing the parent to persist the changes.
 *
 * ### Usage Example
 * This component is typically rendered within a map editor view, often as a temporary layer 
 * that appears while a user is creating or modifying a region. It relies on the parent 
 * component to manage the overall editing state and control when this component is active.
 * 
 * @param {Object} props - The properties for the RegionDraftPreview component.
 * @param {Object|null} props.feature - The GeoJSON feature to display and edit.
 * @param {function} props.onFeatureChange - Callback function invoked when the feature is modified.
 * @returns {JSX.Element|null}
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
        stripGeomanMarkerTabIndex(draftLayer)
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
