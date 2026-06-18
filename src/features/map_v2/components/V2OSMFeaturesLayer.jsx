import { useEffect, useRef } from 'react'

export default function V2OSMFeaturesLayer({
  mapInstance,
  osmFeaturesData,
  onFeatureSelect,
}) {
  const layerIds = useRef([])
  const onFeatureSelectRef = useRef(onFeatureSelect)

  useEffect(() => {
    onFeatureSelectRef.current = onFeatureSelect
  }, [onFeatureSelect])

  useEffect(() => {
    if (!mapInstance) return

    const cleanup = () => {
      layerIds.current.forEach((id) => {
        if (mapInstance.getLayer(id)) mapInstance.removeLayer(id)
      })
      layerIds.current = []

      if (mapInstance.getSource('osm-features')) {
        mapInstance.removeSource('osm-features')
      }
    }

    if (!osmFeaturesData || !osmFeaturesData.features || osmFeaturesData.features.length === 0) {
      cleanup()
      return
    }

    cleanup()

    // Enrich data with an index so we can retrieve the original uncut geometry on click
    const enrichedData = {
      ...osmFeaturesData,
      features: osmFeaturesData.features.map((f, i) => ({
        ...f,
        properties: { ...f.properties, _osm_index: i },
      })),
    }

    mapInstance.addSource('osm-features', {
      type: 'geojson',
      data: enrichedData,
      generateId: true,
    })

    const colorExpression = [
      'case',
      [
        'any',
        ['==', ['get', 'natural'], 'water'],
        ['==', ['get', 'golf'], 'water_hazard'],
        ['==', ['get', 'golf'], 'lateral_water_hazard'],
      ],
      '#38bdf8', // blue
      ['any', ['==', ['get', 'natural'], 'sand'], ['==', ['get', 'golf'], 'bunker']],
      '#facc15', // yellow
      ['==', ['get', 'golf'], 'green'],
      '#4ade80', // bright green
      ['==', ['get', 'golf'], 'fairway'],
      '#a3e635', // lime
      ['==', ['get', 'golf'], 'rough'],
      '#84cc16', // dark lime
      ['==', ['get', 'golf'], 'tee'],
      '#2dd4bf', // teal
      '#f472b6', // pink (default)
    ]

    mapInstance.addLayer({
      id: 'osm-features-fill',
      type: 'fill',
      source: 'osm-features',
      paint: {
        'fill-color': colorExpression,
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.7, 0.4],
      },
    })

    mapInstance.addLayer({
      id: 'osm-features-line',
      type: 'line',
      source: 'osm-features',
      paint: {
        'line-color': colorExpression,
        'line-width': 2,
        'line-opacity': 0.8,
      },
    })

    layerIds.current = ['osm-features-fill', 'osm-features-line']

    let hoveredStateId = null

    const onMouseEnter = () => {
      mapInstance.getCanvas().style.cursor = 'pointer'
    }

    const onMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = ''
      if (hoveredStateId !== null) {
        mapInstance.setFeatureState({ source: 'osm-features', id: hoveredStateId }, { hover: false })
      }
      hoveredStateId = null
    }

    const onMouseMove = (e) => {
      if (e.features.length > 0) {
        if (hoveredStateId !== null) {
          mapInstance.setFeatureState({ source: 'osm-features', id: hoveredStateId }, { hover: false })
        }
        hoveredStateId = e.features[0].id
        mapInstance.setFeatureState({ source: 'osm-features', id: hoveredStateId }, { hover: true })
      }
    }

    const onClick = (e) => {
      if (e.features.length > 0) {
        const index = e.features[0].properties._osm_index
        const originalFeature = enrichedData.features[index]
        if (originalFeature) {
          onFeatureSelectRef.current(originalFeature, e.originalEvent.shiftKey)
        }
      }
    }

    mapInstance.on('mouseenter', 'osm-features-fill', onMouseEnter)
    mapInstance.on('mouseleave', 'osm-features-fill', onMouseLeave)
    mapInstance.on('mousemove', 'osm-features-fill', onMouseMove)
    mapInstance.on('click', 'osm-features-fill', onClick)

    return () => {
      mapInstance.off('mouseenter', 'osm-features-fill', onMouseEnter)
      mapInstance.off('mouseleave', 'osm-features-fill', onMouseLeave)
      mapInstance.off('mousemove', 'osm-features-fill', onMouseMove)
      mapInstance.off('click', 'osm-features-fill', onClick)
      cleanup()
    }
  }, [mapInstance, osmFeaturesData])

  return null
}
