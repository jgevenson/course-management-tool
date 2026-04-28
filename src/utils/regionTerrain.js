// AI assisted development
/**
 * Preset terrain region types for course map polygons.
 * @typedef {'idle' | 'hover' | 'selected' | 'drawing'} RegionStylePhase
 */

/** @type {ReadonlyArray<{ id: string, label: string, fill: string }>} */
export const TERRAIN_TYPE_OPTIONS = Object.freeze([
  { id: 'green', label: 'Green', fill: '#14b8a6' },
  { id: 'tee', label: 'Tee box', fill: '#a3e635' },
  { id: 'fairway', label: 'Fairway', fill: '#22c55e' },
  { id: 'rough', label: 'Rough', fill: '#166534' },
  { id: 'bunker', label: 'Bunker', fill: '#fde68a' },
  { id: 'water', label: 'Water', fill: '#38bdf8' },
  { id: 'trees_ob', label: 'Trees / OB', fill: '#57534e' },
  { id: 'cart_path', label: 'Cart path', fill: '#94a3b8' },
  { id: 'unknown', label: 'Unassigned', fill: '#9ca3af' },
])

const DEFAULT_FILL = '#64748b'

/** @type {ReadonlySet<string>} */
const VALID_IDS = new Set(TERRAIN_TYPE_OPTIONS.map((o) => o.id))

/**
 * @param {string | null | undefined} terrainType
 * @returns {string}
 */
export function terrainFillColor(terrainType) {
  const opt = TERRAIN_TYPE_OPTIONS.find((o) => o.id === terrainType)
  return opt?.fill ?? DEFAULT_FILL
}

/**
 * @param {string | null | undefined} terrainType
 * @returns {boolean}
 */
export function isValidTerrainType(terrainType) {
  return Boolean(terrainType && VALID_IDS.has(terrainType))
}

/**
 * @param {string | null | undefined} terrainType
 * @returns {string}
 */
export function terrainTypeOptionLabel(terrainType) {
  const opt = TERRAIN_TYPE_OPTIONS.find((o) => o.id === terrainType)
  return opt?.label ?? terrainType ?? '—'
}

/**
 * Leaflet path options for overlay polygons.
 * @param {{ terrainType: string, phase: RegionStylePhase }} args
 * @returns {import('leaflet').PathOptions}
 */
export function styleForRegionPhase({ terrainType, phase }) {
  const fillColor = terrainFillColor(terrainType)
  const baseFillOpacity = phase === 'hover' || phase === 'selected' ? 0.42 : 0.32

  if (phase === 'drawing') {
    return {
      color: '#38bdf8',
      weight: 2,
      opacity: 1,
      fillColor,
      fillOpacity: 0.35,
    }
  }

  if (phase === 'idle') {
    return {
      color: fillColor,
      weight: 0,
      opacity: 0,
      fillColor,
      fillOpacity: baseFillOpacity,
    }
  }

  // hover + selected: visible outline
  return {
    color: '#3b82f6',
    weight: 2,
    opacity: 1,
    fillColor,
    fillOpacity: baseFillOpacity,
  }
}
