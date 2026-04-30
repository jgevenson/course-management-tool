import { computeDestination } from '../../map/utils/geoDistance'

/**
 * Returns the recommended club for a given distance.
 * Prioritizes meeting or exceeding the distance.
 */
export function getRecommendedClub(yards, clubs) {
  if (!clubs || clubs.length === 0) return null

  const eligibleClubs = clubs
    .filter((c) => !c.is_putter && c.club_type !== 'putter')
    .sort((a, b) => (a.total_distance ?? 0) - (b.total_distance ?? 0))

  if (eligibleClubs.length === 0) return null

  const maxClub = eligibleClubs[eligibleClubs.length - 1]

  if (yards > (maxClub.total_distance ?? 0)) {
    return maxClub
  }

  return eligibleClubs.find((c) => (c.total_distance ?? 0) >= yards) || maxClub
}

/**
 * Normalizes handedness string.
 */
export function normalizeHandedness(h) {
  return h?.includes('Left') ? 'Left' : 'Right'
}

/**
 * Physics modifiers from the dispersion engine.
 */
export function getPhysicsModifiers(shape, baseDistance, handedness) {
  const isRH = normalizeHandedness(handedness) === 'Right'
  const activeShape = shape || 'Straight'

  const curveMap = {
    'Big Draw': { dist: 1.06, curve: 0.12, angle: 45 },
    Draw: { dist: 1.04, curve: 0.08, angle: 30 },
    'Slight Draw': { dist: 1.02, curve: 0.04, angle: 15 },
    Straight: { dist: 1.0, curve: 0, angle: 0 },
    'Slight Fade': { dist: 0.98, curve: 0.04, angle: 15 },
    Fade: { dist: 0.96, curve: 0.08, angle: 30 },
    'Big Fade': { dist: 0.94, curve: 0.12, angle: 45 },
  }

  const profile = curveMap[activeShape] || curveMap['Straight']
  const curveIntensity = baseDistance * profile.curve

  let latShift = 0

  if (activeShape.includes('Draw')) {
    latShift = isRH ? -curveIntensity : curveIntensity
  } else if (activeShape.includes('Fade')) {
    latShift = isRH ? curveIntensity : -curveIntensity
  }

  return { distMod: profile.dist, latShift, tiltAngle: profile.angle }
}

/**
 * Generates an array of LatLngs representing the dispersion ellipse.
 */
export function getDispersionPolygon(target, shotBearing, club, handedness) {
  const { latShift, tiltAngle } = getPhysicsModifiers(
    club.stock_shot_shape,
    club.total_distance,
    handedness,
  )

  const isRH = normalizeHandedness(handedness) === 'Right'
  
  // Radii in yards
  // Note: the original mapping in DispersionPanel uses miss_left, etc.
  const left = club.miss_left || 0
  const right = club.miss_right || 0
  const short = club.miss_short || 0
  const long = club.miss_long || 0

  const rx = (left + right) / 2
  const ry = (short + long) / 2
  const mechanicalOffsetX = (right - left) / 2
  const mechanicalOffsetY = (long - short) / 2

  // Determine rotation relative to shot line
  const isWide = rx > ry
  let rotationAngle = 0
  if (tiltAngle !== 0) {
    if (isRH) {
      rotationAngle = isWide ? tiltAngle : -tiltAngle
    } else {
      rotationAngle = isWide ? -tiltAngle : tiltAngle
    }
  }

  // Points generation
  const numPoints = 32
  const points = []

  // The marker is the target finish position, so the dispersion is centered there.
  // We ignore physics shifts (latShift) and mechanical offsets for positioning per user request.
  const ellipseCenterX = 0
  const ellipseCenterY = 0

  for (let i = 0; i < numPoints; i++) {
    const phi = (i / numPoints) * 2 * Math.PI
    
    // Local ellipse coordinates
    let lx = rx * Math.cos(phi)
    let ly = ry * Math.sin(phi)

    // Apply internal tilt (clockwise)
    const cosT = Math.cos((rotationAngle * Math.PI) / 180)
    const sinT = Math.sin((rotationAngle * Math.PI) / 180)
    const tx = lx * cosT + ly * sinT
    const ty = -lx * sinT + ly * cosT

    // Add to ellipse center
    const finalX = ellipseCenterX + tx
    const finalY = ellipseCenterY + ty

    // Convert (finalX, finalY) to LatLng
    // finalY is along the shot line, finalX is perpendicular to it.
    
    // 1. Move along shot line
    const alongPoint = computeDestination(target.lat, target.lng, finalY, shotBearing)
    // 2. Move perpendicular (lateral)
    const finalPoint = computeDestination(alongPoint.lat, alongPoint.lng, finalX, shotBearing + 90)
    
    points.push([finalPoint.lat, finalPoint.lng])
  }

  return points
}
