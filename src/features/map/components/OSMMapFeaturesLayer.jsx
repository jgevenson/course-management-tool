import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { GeoJSON } from 'react-leaflet'

// Helper to determine style based on OSM tags
const getFeatureStyle = (feature) => {
  const p = feature.properties || {}
  const golf = p.golf
  const natural = p.natural

  if (natural === 'water' || golf === 'water_hazard' || golf === 'lateral_water_hazard') {
    return { color: '#0ea5e9', weight: 2, fillColor: '#38bdf8', fillOpacity: 0.4 } // sky-500/400
  }
  if (natural === 'sand' || golf === 'bunker') {
    return { color: '#eab308', weight: 2, fillColor: '#facc15', fillOpacity: 0.4 } // yellow-500/400
  }
  if (golf === 'green') {
    return { color: '#22c55e', weight: 2, fillColor: '#4ade80', fillOpacity: 0.5 } // green-500/400
  }
  if (golf === 'fairway') {
    return { color: '#84cc16', weight: 2, fillColor: '#a3e635', fillOpacity: 0.3 } // lime-500/400
  }
  if (golf === 'rough') {
    return { color: '#65a30d', weight: 2, fillColor: '#84cc16', fillOpacity: 0.3 } // lime-600/500
  }
  if (golf === 'tee') {
    return { color: '#14b8a6', weight: 2, fillColor: '#2dd4bf', fillOpacity: 0.5 } // teal-500/400
  }

  // Default fallback for other golf features
  return { color: '#ec4899', weight: 2, fillColor: '#f472b6', fillOpacity: 0.3 } // pink-500/400
}


/**
 * ## OSM Map Features Layer Component
 * 
 * A specialized map layer component for rendering OpenStreetMap (OSM) features as interactive
 * overlays within a Leaflet map. This component is designed to display golf-related features
 * such as water hazards, bunkers, greens, and fairways, enabling users to visualize and potentially
 * import these features into the course data.
 *
 * ### Component Responsibilities
 * - **Feature Rendering**: Renders GeoJSON features using Leaflet's `GeoJSON` component. Each feature is
 *   styled dynamically based on its type and properties, following a consistent color palette.
 * - **Styling**: Applies distinct styles to different types of golf features to enhance visual
 *   differentiation. For example, water hazards are rendered in blue, bunkers in yellow, and greens in green.
 * - **Interactivity**: Attaches interactive event handlers to each feature, including tooltips on
 *   mouse hover and click events for feature selection.
 * - **State Management**: Manages the visibility of the entire layer through the `isActive` prop and handles
 *   data updates efficiently using React `useRef` to maintain a stable reference to the GeoJSON layer.
 *
 * ### Data Flow & Dependencies
 * The component receives its data via the `geojsonData` prop, which is expected to be a GeoJSON object.
 * Interaction with the map is facilitated through the `onFeatureSelect` callback, which is invoked when a
 * feature is clicked, passing the feature data and a boolean indicating if the Shift key was pressed.
 *
 * ### Usage Example
 * This component is intended to be used as a child of `MapArea`, conditionally rendered based on the
 * `osmToolActive` state. It requires the Leaflet library to be initialized and available in the
 * component tree.
 * 
 * @param {Object} props - The properties for the OSMMapFeaturesLayer component.
 * @param {Object|null} props.geojsonData - The GeoJSON data containing the features to render.
 * @param {function} props.onFeatureSelect - Callback function invoked when a feature is selected.
 * @param {boolean} props.isActive - Flag to determine the visibility and interactivity of the layer.
 * @returns {JSX.Element|null}
 */
export default function OSMMapFeaturesLayer({ geojsonData, onFeatureSelect, isActive }) {
  const geoJsonRef = useRef(null)

  useEffect(() => {
    if (geoJsonRef.current && geojsonData) {
      geoJsonRef.current.clearLayers()
      geoJsonRef.current.addData(geojsonData)
    }
  }, [geojsonData])

  if (!isActive || !geojsonData) return null

  return (
    <GeoJSON
      ref={geoJsonRef}
      data={geojsonData}
      style={(feature) => ({
        ...getFeatureStyle(feature),
        className: 'cursor-pointer hover:opacity-80 transition-opacity'
      })}
      onEachFeature={(feature, layer) => {
        // Build a popup/tooltip string
        const p = feature.properties || {}
        const type = p.golf || p.natural || 'feature'
        const labelText = p.name || p.ref || ''
        const title = `${type.replace('_', ' ')} ${labelText}`.trim()
        
        layer.bindTooltip(`Click to import: <b>${title}</b>`, {
          direction: 'top',
          className: 'bg-slate-900 text-slate-200 border-slate-700'
        })

        layer.on({
          click: (e) => {
            L.DomEvent.stopPropagation(e)
            onFeatureSelect(feature, e.originalEvent?.shiftKey || false)
          },
          mouseover: (e) => {
            const l = e.target
            l.setStyle({ weight: 4, fillOpacity: 0.7 })
          },
          mouseout: (e) => {
            const l = e.target
            l.setStyle(getFeatureStyle(feature))
          }
        })
      }}
    />
  )
}
