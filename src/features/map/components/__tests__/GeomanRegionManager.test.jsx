import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import GeomanRegionManager from '../GeomanRegionManager'

const mockMap = {
  hasLayer: vi.fn(),
  removeLayer: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  dragging: {
    disable: vi.fn(),
    enable: vi.fn(),
  },
  pm: {
    enableDraw: vi.fn(),
    disableDraw: vi.fn(),
    globalDrawModeEnabled: vi.fn().mockReturnValue(false)
  }
}

vi.mock('react-leaflet', () => ({
  useMap: () => mockMap,
  useMapEvents: (handlers) => {
    return mockMap
  }
}))

export const mockLayer = {
  on: vi.fn(),
  off: vi.fn(),
  toGeoJSON: vi.fn().mockReturnValue({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }
  }),
  options: {}
}

vi.mock('leaflet', () => {
  const L = {
    featureGroup: vi.fn().mockReturnValue({
      addTo: vi.fn(),
      clearLayers: vi.fn(),
      addLayer: vi.fn(),
      eachLayer: vi.fn(),
    }),
    divIcon: vi.fn().mockReturnValue({}),
    marker: vi.fn().mockReturnValue({
      addTo: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      setLatLng: vi.fn(),
    }),
    geoJSON: vi.fn((geojson, options) => {
      if (options?.onEachFeature) {
        options.onEachFeature(null, mockLayer)
      }
      return {
        eachLayer: vi.fn((cb) => cb(mockLayer)),
      }
    }),
    latLng: vi.fn((lat, lng) => ({ lat, lng })),
    DomEvent: {
      stopPropagation: vi.fn()
    },
    Path: class {}
  }
  return { default: L }
})

describe('GeomanRegionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing and initializes map drawing states', () => {
    const { unmount } = render(
      <GeomanRegionManager 
        regions={[]}
        selectedId={null}
        onSelectId={vi.fn()}
        getStyle={vi.fn()}
      />
    )
    
    expect(mockMap.pm.disableDraw).toHaveBeenCalled()
    unmount()
  })

  it('enables drawing when isDrawingEnabled is true', () => {
    render(
      <GeomanRegionManager 
        regions={[]}
        selectedId={null}
        onSelectId={vi.fn()}
        getStyle={vi.fn()}
        isDrawingEnabled={true}
        drawShape="Polygon"
      />
    )
    
    expect(mockMap.pm.enableDraw).toHaveBeenCalledWith('Polygon', expect.any(Object))
  })

  it('handles Delete key when a region is selected', () => {
    const onDeleteArea = vi.fn()
    render(
      <GeomanRegionManager 
        regions={[{ id: 'reg1', geojson_data: { type: 'Feature' } }]}
        selectedId="reg1"
        onSelectId={vi.fn()}
        getStyle={vi.fn()}
        onDeleteArea={onDeleteArea}
      />
    )
    
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(onDeleteArea).toHaveBeenCalledWith('reg1')
  })

  it('does not trigger delete if no region is selected', () => {
    const onDeleteArea = vi.fn()
    render(
      <GeomanRegionManager 
        regions={[{ id: 'reg1', geojson_data: { type: 'Feature' } }]}
        selectedId={null}
        onSelectId={vi.fn()}
        getStyle={vi.fn()}
        onDeleteArea={onDeleteArea}
      />
    )
    
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(onDeleteArea).not.toHaveBeenCalled()
  })

  it('disables map dragging when vertex or layer dragging starts, and re-enables it when dragging ends', () => {
    render(
      <GeomanRegionManager 
        regions={[{ id: 'reg1', geojson_data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] } } }]}
        selectedId="reg1"
        onSelectId={vi.fn()}
        getStyle={vi.fn()}
      />
    )
    
    const dragStartCalls = mockLayer.on.mock.calls.filter(call => call[0] === 'pm:dragstart')
    const dragEndCalls = mockLayer.on.mock.calls.filter(call => call[0] === 'pm:dragend')
    const markerDragStartCalls = mockLayer.on.mock.calls.filter(call => call[0] === 'pm:markerdragstart')
    const markerDragEndCalls = mockLayer.on.mock.calls.filter(call => call[0] === 'pm:markerdragend')
    
    expect(dragStartCalls.length).toBeGreaterThan(0)
    expect(dragEndCalls.length).toBeGreaterThan(0)
    expect(markerDragStartCalls.length).toBeGreaterThan(0)
    expect(markerDragEndCalls.length).toBeGreaterThan(0)
    
    dragStartCalls[0][1]()
    expect(mockMap.dragging.disable).toHaveBeenCalled()
    
    dragEndCalls[0][1]()
    expect(mockMap.dragging.enable).toHaveBeenCalled()
    
    markerDragStartCalls[0][1]()
    expect(mockMap.dragging.disable).toHaveBeenCalledTimes(2)
    
    markerDragEndCalls[0][1]()
    expect(mockMap.dragging.enable).toHaveBeenCalledTimes(2)
  })

  it('triggers onGeometryCommit when a pm:cut event is fired on the map', () => {
    const onGeometryCommit = vi.fn()
    render(
      <GeomanRegionManager 
        regions={[{ id: 'reg1', geojson_data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] } } }]}
        selectedId="reg1"
        onSelectId={vi.fn()}
        getStyle={vi.fn()}
        onGeometryCommit={onGeometryCommit}
      />
    )
    
    const cutEventCall = mockMap.on.mock.calls.find(call => call[0] === 'pm:cut')
    expect(cutEventCall).toBeDefined()
    
    const cutHandler = cutEventCall[1]
    
    const mockCutLayer = {
      toGeoJSON: () => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [[0, 0], [1, 0], [1, 1], [0, 0]],
            [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.2]]
          ]
        }
      })
    }
    
    const mockOriginalLayer = {
      __region: { id: 'reg1' }
    }
    
    cutHandler({ layer: mockCutLayer, originalLayer: mockOriginalLayer })
    
    expect(onGeometryCommit).toHaveBeenCalledWith('reg1', expect.objectContaining({
      type: 'Feature',
      geometry: expect.objectContaining({
        type: 'Polygon'
      })
    }))
  })

  it('does not re-enable drawing or disable drawing when drawOptions reference changes but state is unchanged', () => {
    const { rerender } = render(
      <GeomanRegionManager 
        regions={[]}
        selectedId={null}
        onSelectId={vi.fn()}
        getStyle={vi.fn()}
        isDrawingEnabled={true}
        drawShape="Polygon"
        drawOptions={{ color: 'blue' }}
      />
    )
    
    expect(mockMap.pm.enableDraw).toHaveBeenCalledTimes(1)
    const initialDisableCount = mockMap.pm.disableDraw.mock.calls.length
    
    rerender(
      <GeomanRegionManager 
        regions={[]}
        selectedId={null}
        onSelectId={vi.fn()}
        getStyle={vi.fn()}
        isDrawingEnabled={true}
        drawShape="Polygon"
        drawOptions={{ color: 'blue' }}
      />
    )
    
    expect(mockMap.pm.disableDraw.mock.calls.length).toBe(initialDisableCount)
    expect(mockMap.pm.enableDraw).toHaveBeenCalledTimes(1)
  })
})
