// AI assisted development
/**
 * Backfill `elevation` (yards) for marker rows where it is NULL, using USGS EPQS.
 *
 * Reads marker coordinates from the same views the UI uses; writes to base tables.
 *
 * Usage (from `course-management-tool` directory):
 *   node scripts/backfill_elevations.js
 *   node scripts/backfill_elevations.js --limit 25
 *   BACKFILL_LIMIT=10 node scripts/backfill_elevations.js
 *
 * `--limit` / `BACKFILL_LIMIT`: max markers to load and process (map markers first, then planning).
 * Omit for no cap (all null-elevation rows).
 *
 * Requires .env: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (typical Vite .env), or
 * `SUPABASE_URL` with `SUPABASE_SERVICE_ROLE_KEY` (recommended for updates) / anon key.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const METERS_TO_YARDS = 1.09361
const EPQS_BASE = 'https://epqs.nationalmap.gov/v1/json'
const THROTTLE_MS = 500
const PAGE_SIZE = 1000

/**
 * @returns {number | null} Positive integer = max records; null = no limit.
 */
function parseRecordLimit() {
  const rawEnv = process.env.BACKFILL_LIMIT
  if (rawEnv !== undefined && rawEnv !== '') {
    const n = Number.parseInt(rawEnv, 10)
    if (Number.isFinite(n) && n >= 0) return n
    console.warn(`Ignoring invalid BACKFILL_LIMIT="${rawEnv}"`)
  }

  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/backfill_elevations.js [--limit N]

  --limit N   Process at most N markers (map rows first, then planning). Env: BACKFILL_LIMIT
  -h, --help  Show this message`)
      process.exit(0)
    }
    if (a === '--limit' || a === '-n') {
      const v = argv[i + 1]
      if (v !== undefined) {
        const n = Number.parseInt(v, 10)
        if (Number.isFinite(n) && n >= 0) return n
      }
      console.error(`Invalid value for ${a}`)
      process.exit(1)
    }
    if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10)
      if (Number.isFinite(n) && n >= 0) return n
      console.error(`Invalid value for ${a}`)
      process.exit(1)
    }
  }
  return null
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Match rounding in `src/features/map/utils/fetchElevation.js` */
function metersToYards(meters) {
  return Math.round(meters * METERS_TO_YARDS * 100) / 100
}

async function fetchElevationYards(lat, lng) {
  const url = `${EPQS_BASE}?x=${lng}&y=${lat}&wkid=4326&units=Meters&includeDate=false`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  const meters = Number(json?.value)
  if (!Number.isFinite(meters)) return null
  return metersToYards(meters)
}

/**
 * @param {number | null} maxRows — stop after this many rows from this view (null = no cap).
 */
async function fetchNullElevationFromView(supabase, viewName, selectColumns, maxRows = null) {
  const rows = []
  let offset = 0
  const cap = maxRows == null ? Infinity : maxRows

  while (rows.length < cap) {
    const need = Math.min(PAGE_SIZE, cap - rows.length)
    const { data, error } = await supabase
      .from(viewName)
      .select(selectColumns)
      .is('elevation', null)
      .range(offset, offset + need - 1)

    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    if (rows.length >= cap) {
      rows.length = cap
      break
    }
    if (data.length < need) break
    offset += need
  }
  return rows
}

async function main() {
  const recordLimit = parseRecordLimit()

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error(
      'Missing Supabase URL (VITE_SUPABASE_URL or SUPABASE_URL) and/or key (VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY) in .env.'
    )
    process.exit(1)
  }

  const supabase = createClient(url, key)

  if (recordLimit === 0) {
    console.log('Record limit is 0; nothing to do.')
    return
  }

  if (recordLimit != null) {
    console.log(
      `Loading up to ${recordLimit} row(s) with elevation IS NULL (map markers first, then planning)...`
    )
  } else {
    console.log('Loading rows with elevation IS NULL from views (same sources as the UI)...')
  }

  let mapRows
  let planningRows

  if (recordLimit != null) {
    mapRows = await fetchNullElevationFromView(
      supabase,
      'hole_map_markers_view',
      'id, lat, lng',
      recordLimit
    )
    const remaining = recordLimit - mapRows.length
    planningRows =
      remaining > 0
        ? await fetchNullElevationFromView(
            supabase,
            'hole_planning_markers_view',
            'id, lat, lng',
            remaining
          )
        : []
  } else {
    mapRows = await fetchNullElevationFromView(
      supabase,
      'hole_map_markers_view',
      'id, lat, lng'
    )
    planningRows = await fetchNullElevationFromView(
      supabase,
      'hole_planning_markers_view',
      'id, lat, lng'
    )
  }

  /** @type {{ kind: 'map' | 'planning', id: string, lat: number, lng: number }[]} */
  const jobs = []

  for (const r of mapRows) {
    jobs.push({ kind: 'map', id: r.id, lat: r.lat, lng: r.lng })
  }
  for (const r of planningRows) {
    jobs.push({ kind: 'planning', id: r.id, lat: r.lat, lng: r.lng })
  }

  console.log(
    `Found ${mapRows.length} map marker(s) and ${planningRows.length} planning marker(s) (${jobs.length} total).`
  )

  let first = true
  for (const job of jobs) {
    if (!first) await sleep(THROTTLE_MS)
    first = false

    const { id, lat, lng, kind } = job
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn(`Skip marker ID ${id} (${kind}): invalid lat/lng`)
      continue
    }

    const yards = await fetchElevationYards(lat, lng)
    if (yards == null) {
      console.warn(`Could not resolve elevation for marker ID ${id} (${kind}) at lat=${lat}, lng=${lng}`)
      continue
    }

    const table = kind === 'map' ? 'hole_map_markers' : 'hole_planning_markers'
    const { error } = await supabase.from(table).update({ elevation: yards }).eq('id', id)

    if (error) {
      console.error(`Update failed for marker ID ${id} (${kind}):`, error.message)
      continue
    }

    console.log(`Updated marker ID ${id} (${kind}): ${yards} yds`)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
