// AI assisted development
import L from 'leaflet'

const TILE_SIZE = 256
const EARTH_CIRCUMFERENCE_METERS = 40075016.686
const YARDS_TO_METERS = 0.9144
const MAX_RADIUS_PIXELS = 940
const MIN_REGION_PIXELS = 750
const MAX_POLYGON_POINTS = 260
const MIN_NATURAL_VERTEX_ANGLE_DEGREES = 90
const MAX_NATURAL_VERTEX_ANGLE_DEGREES = 210

/**
 * @typedef {object} AutoDrawOptions
 * @property {import('leaflet').Map} map
 * @property {import('leaflet').LatLng} seedLatLng
 * @property {number} tolerance
 * @property {number} maxRadiusYards
 * @property {string} tileUrlTemplate
 * @property {number} maxNativeZoom
 */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function metersPerPixelAt(lat, zoom) {
  return (EARTH_CIRCUMFERENCE_METERS * Math.cos((lat * Math.PI) / 180)) / (TILE_SIZE * 2 ** zoom)
}

function tileUrl(template, x, y, z) {
  return template.replace('{x}', x).replace('{y}', y).replace('{z}', z)
}

function loadTileImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load imagery tile for auto draw.'))
    img.src = url
  })
}

function colorDistanceSquared(data, idx, target) {
  const dr = data[idx] - target.r
  const dg = data[idx + 1] - target.g
  const db = data[idx + 2] - target.b
  return dr * dr + dg * dg + db * db
}

function floodFillByColor(imageData, seedX, seedY, radiusPixels, tolerance) {
  const { data, width, height } = imageData
  const seedIdx = (seedY * width + seedX) * 4
  const target = { r: data[seedIdx], g: data[seedIdx + 1], b: data[seedIdx + 2] }
  const toleranceSquared = tolerance * tolerance
  const radiusSquared = radiusPixels * radiusPixels
  const accepted = new Uint8Array(width * height)
  const stack = new Int32Array(width * height)
  let stackLen = 0
  let count = 0

  const tryAccept = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return
    const dx = x - seedX
    const dy = y - seedY
    if (dx * dx + dy * dy > radiusSquared) return

    const offset = y * width + x
    if (accepted[offset]) return

    const idx = offset * 4
    if (data[idx + 3] === 0) return
    if (colorDistanceSquared(data, idx, target) > toleranceSquared) return

    accepted[offset] = 1
    stack[stackLen] = offset
    stackLen += 1
    count += 1
  }

  tryAccept(seedX, seedY)

  while (stackLen > 0) {
    stackLen -= 1
    const offset = stack[stackLen]
    const x = offset % width
    const y = Math.floor(offset / width)
    tryAccept(x + 1, y)
    tryAccept(x - 1, y)
    tryAccept(x, y + 1)
    tryAccept(x, y - 1)
  }

  return { accepted, count, target }
}

function traceMaskBounds(mask, width, height) {
  const edges = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = y * width + x
      if (!mask[offset]) continue

      if (y === 0 || !mask[offset - width]) edges.push([[x, y], [x + 1, y]])
      if (x === width - 1 || !mask[offset + 1]) edges.push([[x + 1, y], [x + 1, y + 1]])
      if (y === height - 1 || !mask[offset + width]) edges.push([[x + 1, y + 1], [x, y + 1]])
      if (x === 0 || !mask[offset - 1]) edges.push([[x, y + 1], [x, y]])
    }
  }

  if (edges.length === 0) return []

  const nextByStart = new Map()
  for (const [start, end] of edges) {
    const key = `${start[0]},${start[1]}`
    if (!nextByStart.has(key)) nextByStart.set(key, [])
    nextByStart.get(key).push(end)
  }

  let bestRing = []
  for (const [startKey, starts] of nextByStart) {
    while (starts.length > 0) {
      const [sx, sy] = startKey.split(',').map(Number)
      const ring = [[sx, sy]]
      let current = starts.pop()

      while (current) {
        ring.push(current)
        if (current[0] === sx && current[1] === sy) break

        const key = `${current[0]},${current[1]}`
        const nextList = nextByStart.get(key)
        current = nextList?.pop()
      }

      if (ring.length > bestRing.length && ring.at(-1)?.[0] === sx && ring.at(-1)?.[1] === sy) {
        bestRing = ring
      }
    }
  }

  return bestRing
}

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1])
  }
  return Math.abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / Math.hypot(dx, dy)
}

function simplifyOpenRing(points, tolerance) {
  if (points.length <= 2) return points

  let maxDistance = 0
  let index = 0
  const end = points.length - 1

  for (let i = 1; i < end; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[end])
    if (distance > maxDistance) {
      maxDistance = distance
      index = i
    }
  }

  if (maxDistance <= tolerance) {
    return [points[0], points[end]]
  }

  const left = simplifyOpenRing(points.slice(0, index + 1), tolerance)
  const right = simplifyOpenRing(points.slice(index), tolerance)
  return left.slice(0, -1).concat(right)
}

function signedRingArea(points) {
  let area = 0
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    area += current[0] * next[1] - next[0] * current[1]
  }
  return area / 2
}

function vertexInteriorAngleDegrees(prev, current, next, orientation) {
  const ax = prev[0] - current[0]
  const ay = prev[1] - current[1]
  const bx = next[0] - current[0]
  const by = next[1] - current[1]
  const aLength = Math.hypot(ax, ay)
  const bLength = Math.hypot(bx, by)

  if (aLength === 0 || bLength === 0) return 180

  const dot = ax * bx + ay * by
  const ratio = clamp(dot / (aLength * bLength), -1, 1)
  const smallerAngle = (Math.acos(ratio) * 180) / Math.PI
  const cross = ax * by - ay * bx
  const isConvex = Math.sign(cross) === -orientation

  return isConvex ? smallerAngle : 360 - smallerAngle
}

function naturalAngleDeviation(angle) {
  if (angle < MIN_NATURAL_VERTEX_ANGLE_DEGREES) return MIN_NATURAL_VERTEX_ANGLE_DEGREES - angle
  if (angle > MAX_NATURAL_VERTEX_ANGLE_DEGREES) return angle - MAX_NATURAL_VERTEX_ANGLE_DEGREES
  return 0
}

function smoothNaturalAngles(points) {
  const smoothed = [...points]

  while (smoothed.length > 4) {
    const orientation = Math.sign(signedRingArea(smoothed)) || 1
    let worstIndex = -1
    let worstDeviation = 0

    for (let i = 0; i < smoothed.length; i += 1) {
      const prev = smoothed[(i - 1 + smoothed.length) % smoothed.length]
      const current = smoothed[i]
      const next = smoothed[(i + 1) % smoothed.length]
      const angle = vertexInteriorAngleDegrees(prev, current, next, orientation)
      const deviation = naturalAngleDeviation(angle)

      if (deviation > worstDeviation) {
        worstDeviation = deviation
        worstIndex = i
      }
    }

    if (worstIndex === -1) break
    smoothed.splice(worstIndex, 1)
  }

  return smoothed
}

function simplifyClosedRing(points) {
  if (points.length <= 4) return points
  const open = points.slice(0, -1)
  let tolerance = 1
  let simplified = simplifyOpenRing(open, tolerance)

  while (simplified.length > MAX_POLYGON_POINTS && tolerance < 12) {
    tolerance += 1.5
    simplified = simplifyOpenRing(open, tolerance)
  }

  if (simplified.length < 3) return []
  const smoothed = smoothNaturalAngles(simplified)
  if (smoothed.length < 3) return []
  smoothed.push(smoothed[0])
  return smoothed
}

async function readImageryWindow({ map, seedLatLng, maxRadiusYards, tileUrlTemplate, maxNativeZoom }) {
  const zoom = Math.min(Math.round(map.getZoom()), maxNativeZoom)
  const centerPoint = map.project(seedLatLng, zoom)
  const radiusMeters = maxRadiusYards * YARDS_TO_METERS
  const radiusPixels = clamp(Math.ceil(radiusMeters / metersPerPixelAt(seedLatLng.lat, zoom)), 8, MAX_RADIUS_PIXELS)
  const minX = Math.floor(centerPoint.x - radiusPixels)
  const minY = Math.floor(centerPoint.y - radiusPixels)
  const size = radiusPixels * 2 + 1
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Auto draw could not create an imagery canvas.')

  const minTileX = Math.floor(minX / TILE_SIZE)
  const maxTileX = Math.floor((minX + size - 1) / TILE_SIZE)
  const minTileY = Math.floor(minY / TILE_SIZE)
  const maxTileY = Math.floor((minY + size - 1) / TILE_SIZE)
  const tileCount = 2 ** zoom
  const jobs = []

  for (let ty = minTileY; ty <= maxTileY; ty += 1) {
    if (ty < 0 || ty >= tileCount) continue
    for (let tx = minTileX; tx <= maxTileX; tx += 1) {
      const wrappedX = ((tx % tileCount) + tileCount) % tileCount
      jobs.push(
        loadTileImage(tileUrl(tileUrlTemplate, wrappedX, ty, zoom)).then((img) => {
          ctx.drawImage(img, tx * TILE_SIZE - minX, ty * TILE_SIZE - minY, TILE_SIZE, TILE_SIZE)
        }),
      )
    }
  }

  await Promise.all(jobs)

  try {
    return {
      imageData: ctx.getImageData(0, 0, size, size),
      originPixel: { x: minX, y: minY },
      radiusPixels,
      zoom,
    }
  } catch {
    throw new Error('Auto draw could not read imagery pixels. The tile service may be blocking canvas access.')
  }
}

/**
 * Generates a GeoJSON polygon by growing from the seed color in the current imagery.
 * @param {AutoDrawOptions} options
 * @returns {Promise<GeoJSON.Feature<GeoJSON.Polygon>>}
 */
export async function createAutoDrawRegion(options) {
  const { map, seedLatLng, tolerance, maxRadiusYards, tileUrlTemplate, maxNativeZoom } = options
  const { imageData, originPixel, radiusPixels, zoom } = await readImageryWindow({
    map,
    seedLatLng,
    maxRadiusYards,
    tileUrlTemplate,
    maxNativeZoom,
  })

  const seedX = radiusPixels
  const seedY = radiusPixels
  const { accepted, count, target } = floodFillByColor(
    imageData,
    seedX,
    seedY,
    radiusPixels,
    clamp(tolerance, 1, 255),
  )

  if (count < MIN_REGION_PIXELS) {
    throw new Error('Auto draw found too little matching color. Increase tolerance or choose a cleaner seed point.')
  }

  const traced = traceMaskBounds(accepted, imageData.width, imageData.height)
  const simplified = simplifyClosedRing(traced)
  if (simplified.length < 4) {
    throw new Error('Auto draw could not build a stable boundary from that seed point.')
  }

  const ring = simplified.map(([x, y]) => {
    const point = L.point(originPixel.x + x, originPixel.y + y)
    const latLng = map.unproject(point, zoom)
    return [
      Math.round(latLng.lng * 1e7) / 1e7,
      Math.round(latLng.lat * 1e7) / 1e7,
    ]
  })

  return {
    type: 'Feature',
    properties: {
      source: 'experimental_auto_draw',
      tolerance,
      max_radius_yards: maxRadiusYards,
      seed_color_rgb: [target.r, target.g, target.b],
    },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  }
}
