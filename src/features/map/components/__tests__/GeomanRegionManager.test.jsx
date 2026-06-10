import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import GeomanRegionManager from '../GeomanRegionManager'

const mockMap = {
  hasLayer: vi.fn(),
  removeLayer: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  pm: {
    enableDraw: vi.fn(),
    disableDraw: vi.fn(),
    globalDrawModeEnabled: vi.fn().mockReturnValue(false)
  }
}

vi.mock('react-leaflet', () => ({
  useMap: () => mockMap,
  useMapEvents: (handlers) => {
    // we could simulate map events by calling handlers
    return mockMap
  }
}))

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
    geoJSON: vi.fn().mockReturnValue({
      eachLayer: vi.fn(),
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
})
