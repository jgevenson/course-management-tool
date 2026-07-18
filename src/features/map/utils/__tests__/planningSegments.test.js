import { describe, it, expect, vi } from 'vitest'
import { buildPlanningView } from '../planningSegments'

// Mock dependencies
vi.mock('../geoDistance', () => ({
  haversineDistanceYards: vi.fn((lat1, lng1, lat2, lng2) => {
    // Return a predictable distance for testing based on lat diff
    return Math.abs(lat2 - lat1) * 100
  })
}))

vi.mock('../holeMarkers', () => ({
  resolvePlanningMarkers: vi.fn((hole) => {
    return hole.planningMarkers || []
  })
}))

describe('planningSegments.buildPlanningView', () => {
  it('returns empty segments if no hole provided', () => {
    const result = buildPlanningView(null)
    expect(result.segments).toEqual([])
    expect(result.markers).toEqual([])
  })

  it('calculates yards and playsLike correctly with elevation', () => {
    const hole = {
      id: 'h1',
      planningMarkers: [
        { id: 'm1', marker_type: 'tee_shot_location', lat: 0, lng: 0, elevation: 100 },
        { id: 'm2', marker_type: 'pin_location', lat: 2, lng: 0, elevation: 110 }
      ]
    }

    const result = buildPlanningView(hole)
    
    expect(result.segments.length).toBe(1)
    const segment = result.segments[0]
    
    // Distance based on mocked haversine (2 - 0) * 100 = 200
    expect(segment.yards).toBe(200)
    
    // Elevation diff = 110 - 100 = 10 yards. 10 yards * 3 = 30 feet
    expect(segment.elevationDiffFeet).toBe(30)
    
    // Plays like = 200 + 10 = 210
    expect(segment.playsLike).toBe(210)
    
    // Label
    expect(segment.label).toBe('Tee shot → Pin')
  })

  it('calculates downhill playsLike correctly and does not drop below 1 yard', () => {
    const hole = {
      id: 'h1',
      planningMarkers: [
        { id: 'm1', marker_type: 'tee_shot_location', lat: 0, lng: 0, elevation: 200 },
        { id: 'm2', marker_type: 'pin_location', lat: 0.05, lng: 0, elevation: 100 }
      ]
    }

    const result = buildPlanningView(hole)
    const segment = result.segments[0]
    
    // Distance = 0.05 * 100 = 5 yards
    expect(segment.yards).toBe(5)
    
    // Elevation diff = 100 - 200 = -100 yards. -100 * 3 = -300 feet
    expect(segment.elevationDiffFeet).toBe(-300)
    
    // Plays like = 5 + (-100) = -95, but Math.max(1, ...) means it should be 1
    expect(segment.playsLike).toBe(1)
  })

  it('correctly labels intermediate landing areas', () => {
    const hole = {
      id: 'h1',
      planningMarkers: [
        { id: 'm1', marker_type: 'tee_shot_location', lat: 0, lng: 0 },
        { id: 'm2', marker_type: 'landing_area', lat: 1, lng: 0 },
        { id: 'm3', marker_type: 'landing_area', lat: 2, lng: 0 },
        { id: 'm4', marker_type: 'pin_location', lat: 3, lng: 0 }
      ]
    }

    const result = buildPlanningView(hole)
    expect(result.segments.length).toBe(3)
    
    expect(result.segments[0].label).toBe('Tee shot → L1')
    expect(result.segments[1].label).toBe('L1 → L2')
    expect(result.segments[2].label).toBe('L2 → Pin')
  })
})
