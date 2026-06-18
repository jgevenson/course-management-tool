// AI assisted development
import { describe, it, expect } from 'vitest'
import { getHoleBounds } from '../bbox'

describe('getHoleBounds', () => {
  it('returns null when there are no markers or overlays', () => {
    const bounds = getHoleBounds(null, null)
    expect(bounds).toBeNull()

    const bounds2 = getHoleBounds({}, [])
    expect(bounds2).toBeNull()
  })

  it('calculates bounds correctly for map markers', () => {
    const hole = {
      mapMarkers: [
        { marker_kind: 'green_center', lat: 39.8283, lng: -98.5795, is_active: true },
        { marker_kind: 'tee_back', lat: 39.8300, lng: -98.5800, is_active: true },
        { marker_kind: 'inactive_marker', lat: 39.8500, lng: -98.5900, is_active: false },
      ]
    }

    const bounds = getHoleBounds(hole, [])
    expect(bounds).toEqual([
      [-98.5800, 39.8283], // Southwest: minLng, minLat
      [-98.5795, 39.8300], // Northeast: maxLng, maxLat
    ])
  })

  it('calculates bounds correctly for planning markers', () => {
    const hole = {
      planningMarkers: [
        { marker_type: 'tee_shot_location', lat: 40.0, lng: -100.0, is_active: true },
        { marker_type: 'pin_location', lat: 41.0, lng: -99.0, is_active: true },
      ]
    }

    const bounds = getHoleBounds(hole, [])
    expect(bounds).toEqual([
      [-100.0, 40.0],
      [-99.0, 41.0],
    ])
  })

  it('calculates bounds correctly for terrain overlays', () => {
    const overlays = [
      {
        geojson_data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-105.0, 35.0],
                [-104.0, 35.0],
                [-104.0, 36.0],
                [-105.0, 36.0],
                [-105.0, 35.0],
              ]
            ]
          }
        }
      }
    ]

    const bounds = getHoleBounds(null, overlays)
    expect(bounds).toEqual([
      [-105.0, 35.0],
      [-104.0, 36.0],
    ])
  })

  it('combines markers and overlays to find the global bounding box', () => {
    const hole = {
      mapMarkers: [
        { marker_kind: 'green_center', lat: 34.0, lng: -106.0, is_active: true }
      ]
    }
    const overlays = [
      {
        geojson_data: {
          type: 'Polygon',
          coordinates: [
            [
              [-105.0, 35.0],
              [-104.0, 36.0],
              [-105.0, 35.0]
            ]
          ]
        }
      }
    ]

    const bounds = getHoleBounds(hole, overlays)
    // minLng: -106.0 (marker), maxLng: -104.0 (overlay)
    // minLat: 34.0 (marker), maxLat: 36.0 (overlay)
    expect(bounds).toEqual([
      [-106.0, 34.0],
      [-104.0, 36.0]
    ])
  })
})
