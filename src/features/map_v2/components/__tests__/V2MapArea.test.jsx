// AI assisted development
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import maplibregl from 'maplibre-gl'
import V2MapArea from '../V2MapArea'

// Mock getSource to return a unique mock source object per key only after it has been added
const addedSources = new Set()
const mockSources = {}
const mockMapInstance = {
  addControl: vi.fn(),
  remove: vi.fn(),
  loaded: vi.fn().mockReturnValue(true),
  on: vi.fn(),
  off: vi.fn(),
  addSource: vi.fn().mockImplementation((key) => {
    addedSources.add(key)
  }),
  getSource: vi.fn().mockImplementation((key) => {
    if (!addedSources.has(key)) return null
    if (!mockSources[key]) {
      mockSources[key] = {
        setData: vi.fn(),
      }
    }
    return mockSources[key]
  }),
  addLayer: vi.fn(),
  getLayer: vi.fn().mockReturnValue(true),
  setFilter: vi.fn(),
  getCanvas: vi.fn().mockReturnValue({ style: {} }),
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
}

const mockMarkerInstance = {
  setLngLat: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn(),
  on: vi.fn().mockReturnThis(),
  getLngLat: vi.fn().mockReturnValue({ lat: 41.5, lng: -91.5 }),
  getElement: vi.fn().mockReturnValue(document.createElement('div')),
}

let mockMarkerConstructor = (options) => mockMarkerInstance

vi.mock('maplibre-gl', () => {
  return {
    default: {
      Map: vi.fn().mockImplementation(function() {
        return mockMapInstance
      }),
      Marker: vi.fn().mockImplementation(function(...args) {
        return mockMarkerConstructor(...args)
      }),
      NavigationControl: vi.fn(),
      ScaleControl: vi.fn(),
    },
  }
})

describe('V2MapArea', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addedSources.clear()
    for (const key in mockSources) {
      mockSources[key].setData.mockClear()
    }
    mockMarkerConstructor = (options) => mockMarkerInstance
  })

  it('renders container and instantiates maplibre map', () => {
    const course = { id: 'c1', name: 'Blue Top Ridge', course_lat: 41.5, course_lng: -91.5 }
    const { container } = render(
      <V2MapArea
        course={course}
        courseCenter={[course.course_lng, course.course_lat]}
        courseZoom={16}
      />
    )

    expect(container.querySelector('.v2-map-container')).toBeInTheDocument()
    expect(maplibregl.Map).toHaveBeenCalled()
  })

  it('renders correct legend items from active terrain types', () => {
    const course = { id: 'c1', name: 'Blue Top Ridge', course_lat: 41.5, course_lng: -91.5 }
    const overlays = [
      { id: 'o1', terrain_type: 'green', geojson_data: { type: 'Polygon', coordinates: [] } },
      { id: 'o2', terrain_type: 'bunker', geojson_data: { type: 'Polygon', coordinates: [] } },
    ]

    const { queryByText } = render(
      <V2MapArea
        course={course}
        filteredOverlays={overlays}
        courseCenter={[course.course_lng, course.course_lat]}
        courseZoom={16}
      />
    )

    expect(queryByText('Green')).toBeInTheDocument()
    expect(queryByText('Bunker')).toBeInTheDocument()
  })

  it('updates planning lines and dispersions sources when selectedHole changes in planning mode', () => {
    const course = { id: 'c1', name: 'Blue Top Ridge', course_lat: 41.5, course_lng: -91.5 }
    const selectedHole = {
      id: 'h1',
      hole_number: 1,
      mapMarkers: [
        { marker_kind: 'green_center', lat: 41.501, lng: -91.501, is_active: true },
        { marker_kind: 'tee_back', lat: 41.5, lng: -91.5, is_active: true }
      ],
      planningMarkers: [
        { marker_type: 'tee_shot_location', lat: 41.5, lng: -91.5, is_active: true },
        { marker_type: 'pin_location', lat: 41.501, lng: -91.501, is_active: true }
      ]
    }
    const clubs = [
      { id: 'club1', club_type: 'driver', total_distance: 250, color: '#ff0000', stock_shot_shape: 'Straight' }
    ]
    const profile = { handedness: 'Right' }

    // Pre-add the planning sources to addedSources so getSource works in the marker effect
    addedSources.add('planning-lines')
    addedSources.add('planning-dispersions')

    render(
      <V2MapArea
        course={course}
        selectedHole={selectedHole}
        workspaceMode="planning"
        clubs={clubs}
        profile={profile}
      />
    )

    // Verify mockMapInstance.getSource was called for lines and dispersions
    expect(mockMapInstance.getSource).toHaveBeenCalledWith('planning-lines')
    expect(mockMapInstance.getSource).toHaveBeenCalledWith('planning-dispersions')

    // Verify setData was called with features
    const lineSource = mockMapInstance.getSource('planning-lines')
    expect(lineSource.setData).toHaveBeenCalled()
    
    const dispersionSource = mockMapInstance.getSource('planning-dispersions')
    expect(dispersionSource.setData).toHaveBeenCalled()

    const lastCallArg = dispersionSource.setData.mock.calls[0][0]
    expect(lastCallArg.type).toBe('FeatureCollection')
    expect(lastCallArg.features.length).toBeGreaterThan(0)
    
    // First coordinate of first feature should be [lng, lat]
    const coords = lastCallArg.features[0].geometry.coordinates[0]
    // Expect coords[0] (lng) to be around -91.5, and coords[1] (lat) to be around 41.5
    expect(coords[0][0]).toBeLessThan(0) // -91.5 is less than 0
    expect(coords[0][1]).toBeGreaterThan(0) // 41.5 is greater than 0
    expect(coords[0][0]).not.toBeUndefined()
    expect(coords[0][1]).not.toBeUndefined()
  })

  it('registers click and mousemove event listeners on MapLibre', () => {
    const course = { id: 'c1', name: 'Blue Top Ridge', course_lat: 41.5, course_lng: -91.5 }
    render(
      <V2MapArea
        course={course}
        courseCenter={[course.course_lng, course.course_lat]}
        courseZoom={16}
        workspaceMode="mapping"
      />
    )

    // Check that map.on was called with 'click'
    expect(mockMapInstance.on).toHaveBeenCalledWith('click', expect.any(Function))

    // Check that map.on was called with 'mousemove' on 'terrain-fills'
    expect(mockMapInstance.on).toHaveBeenCalledWith('mousemove', 'terrain-fills', expect.any(Function))
  })

  it('calls onPick when activePointTool is active and map click occurs', () => {
    const course = { id: 'c1', name: 'Blue Top Ridge', course_lat: 41.5, course_lng: -91.5 }
    const onPick = vi.fn()
    render(
      <V2MapArea
        course={course}
        courseCenter={[course.course_lng, course.course_lat]}
        courseZoom={16}
        activePointTool="tee_back"
        onPick={onPick}
      />
    )

    // Retrieve the registered click handler from mockMapInstance.on
    const clickCall = mockMapInstance.on.mock.calls.find((c) => c[0] === 'click')
    expect(clickCall).toBeDefined()
    const clickHandler = clickCall[1]

    // Trigger the click event
    clickHandler({
      lngLat: { lat: 41.505, lng: -91.505 }
    })

    expect(onPick).toHaveBeenCalledWith('tee_back', 41.505, -91.505)
  })

  it('instantiates markers with draggable property set correctly', () => {
    const course = { id: 'c1', name: 'Blue Top Ridge', course_lat: 41.5, course_lng: -91.5 }
    const selectedHole = {
      id: 'h1',
      hole_number: 1,
      mapMarkers: [
        { marker_kind: 'tee_back', lat: 41.5, lng: -91.5, is_active: true }
      ]
    }

    render(
      <V2MapArea
        course={course}
        selectedHole={selectedHole}
        workspaceMode="mapping"
        activePointTool={null}
      />
    )

    // MapLibre Marker constructor is called
    expect(maplibregl.Marker).toHaveBeenCalledWith(
      expect.objectContaining({ draggable: true })
    )
  })

  it('registers draft-draw source and styling layers on load', () => {
    const course = { id: 'c1', name: 'Blue Top Ridge', course_lat: 41.5, course_lng: -91.5 }
    render(
      <V2MapArea
        course={course}
        courseCenter={[course.course_lng, course.course_lat]}
        courseZoom={16}
      />
    )

    expect(mockMapInstance.addSource).toHaveBeenCalledWith('draft-draw', expect.any(Object))
    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft-draw-fill' }))
    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft-draw-line' }))
    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft-draw-circle' }))
  })

  it('appends coordinates when map is clicked in polygon drawMode', () => {
    const course = { id: 'c1', name: 'Blue Top Ridge', course_lat: 41.5, course_lng: -91.5 }
    const onDrawCoordinatesChange = vi.fn()
    
    render(
      <V2MapArea
        course={course}
        courseCenter={[course.course_lng, course.course_lat]}
        courseZoom={16}
        drawMode="polygon"
        drawCoordinates={[[ -91.5, 41.5 ]]}
        onDrawCoordinatesChange={onDrawCoordinatesChange}
      />
    )

    // Find the click event handler registered
    const clickCall = mockMapInstance.on.mock.calls.find((c) => c[0] === 'click')
    expect(clickCall).toBeDefined()
    const clickHandler = clickCall[1]

    // Trigger click at a new coordinate
    clickHandler({
      lngLat: { lng: -91.501, lat: 41.501 }
    })

    expect(onDrawCoordinatesChange).toHaveBeenCalledWith([[ -91.5, 41.5 ], [ -91.501, 41.501 ]])
  })

  it('closes the polygon when click is close to the first point', () => {
    const course = { id: 'c1', name: 'Blue Top Ridge', course_lat: 41.5, course_lng: -91.5 }
    const onRegionDraftChange = vi.fn()
    const onDrawCoordinatesChange = vi.fn()
    
    render(
      <V2MapArea
        course={course}
        courseCenter={[course.course_lng, course.course_lat]}
        courseZoom={16}
        drawMode="polygon"
        drawCoordinates={[
          [ -91.5, 41.5 ],
          [ -91.501, 41.5 ],
          [ -91.501, 41.501 ]
        ]}
        onRegionDraftChange={onRegionDraftChange}
        onDrawCoordinatesChange={onDrawCoordinatesChange}
      />
    )

    // Find the click event handler registered
    const clickCall = mockMapInstance.on.mock.calls.find((c) => c[0] === 'click')
    const clickHandler = clickCall[1]

    // Trigger click extremely close to the first point [-91.5, 41.5]
    clickHandler({
      lngLat: { lng: -91.5, lat: 41.5 }
    })

    expect(onRegionDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [ -91.5, 41.5 ],
            [ -91.501, 41.5 ],
            [ -91.501, 41.501 ],
            [ -91.5, 41.5 ]
          ]]
        }
      })
    )
    expect(onDrawCoordinatesChange).toHaveBeenCalledWith([])
  })

  it('renders corner and midpoint handles for selected terrain overlay and supports dragging', async () => {
    const course = { id: 'c1', name: 'Blue Top Ridge', course_lat: 41.5, course_lng: -91.5 }
    const selectedTerrainOverlayId = 'o1'
    const filteredOverlays = [
      {
        id: 'o1',
        terrain_type: 'bunker',
        geojson_data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-91.5, 41.5],
              [-91.501, 41.5],
              [-91.501, 41.501],
              [-91.5, 41.5]
            ]]
          }
        }
      }
    ]
    const onCommitGeometry = vi.fn()

    const markers = []
    mockMarkerConstructor = (options) => {
      const m = {
        options,
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        on: vi.fn().mockImplementation((event, handler) => {
          m.handlers = m.handlers || {}
          m.handlers[event] = handler
          return m
        }),
        getLngLat: vi.fn().mockReturnValue({ lng: -91.502, lat: 41.502 }),
        getElement: vi.fn().mockReturnValue(options?.element || document.createElement('div')),
      }
      markers.push(m)
      return m
    }

    addedSources.add('course-terrain')

    render(
      <V2MapArea
        course={course}
        filteredOverlays={filteredOverlays}
        selectedTerrainOverlayId={selectedTerrainOverlayId}
        workspaceMode="mapping"
        onCommitGeometry={onCommitGeometry}
      />
    )

    // Wait for the async mapLoaded state update to propagate and run the effect
    await waitFor(() => {
      expect(markers.length).toBe(6)
    })

    // Corner marker elements have class 'v2-edit-handle' but NOT 'v2-edit-handle--midpoint'
    const corners = markers.filter(m => m.options.element.className === 'v2-edit-handle')
    const midpoints = markers.filter(m => m.options.element.className.includes('v2-edit-handle--midpoint'))

    expect(corners.length).toBe(3)
    expect(midpoints.length).toBe(3)

    // Drag first corner marker
    const firstCorner = corners[0]
    expect(firstCorner.handlers.drag).toBeDefined()
    expect(firstCorner.handlers.dragend).toBeDefined()

    // Trigger drag
    firstCorner.handlers.drag()
    // Verify source data updated
    const terrainSource = mockMapInstance.getSource('course-terrain')
    expect(terrainSource.setData).toHaveBeenCalled()

    // Trigger dragend
    await firstCorner.handlers.dragend()
    expect(onCommitGeometry).toHaveBeenCalledWith('o1', expect.objectContaining({
      geometry: expect.objectContaining({
        type: 'Polygon',
        coordinates: expect.any(Array)
      })
    }))
  })

  it('allows vertex deletion on right click (contextmenu) if > 3 vertices', async () => {
    const course = { id: 'c1', name: 'Blue Top Ridge', course_lat: 41.5, course_lng: -91.5 }
    const selectedTerrainOverlayId = 'o1'
    const filteredOverlays = [
      {
        id: 'o1',
        terrain_type: 'bunker',
        geojson_data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-91.5, 41.5],
              [-91.501, 41.5],
              [-91.501, 41.501],
              [-91.502, 41.502], // 4 vertices initially (excluding duplicate close)
              [-91.5, 41.5]
            ]]
          }
        }
      }
    ]
    const onCommitGeometry = vi.fn()

    const markers = []
    mockMarkerConstructor = (options) => {
      const m = {
        options,
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        on: vi.fn().mockReturnThis(),
        getLngLat: vi.fn().mockReturnValue({ lng: -91.5, lat: 41.5 }),
        getElement: vi.fn().mockReturnValue(options?.element || document.createElement('div')),
      }
      markers.push(m)
      return m
    }

    addedSources.add('course-terrain')

    render(
      <V2MapArea
        course={course}
        filteredOverlays={filteredOverlays}
        selectedTerrainOverlayId={selectedTerrainOverlayId}
        workspaceMode="mapping"
        onCommitGeometry={onCommitGeometry}
      />
    )

    // Wait for the async mapLoaded state update to propagate and run the effect
    await waitFor(() => {
      expect(markers.length).toBe(8)
    })

    // Grab first corner marker's element and dispatch contextmenu event
    const corners = markers.filter(m => m.options.element.className === 'v2-edit-handle')
    const firstCornerEl = corners[0].options.element

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    })
    firstCornerEl.dispatchEvent(event)

    // Should call onCommitGeometry with 3 vertices remaining
    expect(onCommitGeometry).toHaveBeenCalled()
    const lastCall = onCommitGeometry.mock.calls[0]
    const nextCoords = lastCall[1].geometry.coordinates[0]
    // Poly is closed, so nextCoords length should be 4 (3 unique + 1 closed)
    expect(nextCoords.length).toBe(4)
  })
})

