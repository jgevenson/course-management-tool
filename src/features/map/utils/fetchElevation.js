// AI assisted development

const METERS_TO_YARDS = 1.09361
const EPQS_URL = 'https://epqs.nationalmap.gov/v1/json'

/**
 * USGS EPQS elevation lookup; converts meters to yards (× 1.09361).
 * @param {number} lat
 * @param {number} lng
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<number|null>} Yards above sea level, or null if lookup fails.
 */
export async function fetchElevation(lat, lng, { signal } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  try {
    const url = `${EPQS_URL}?x=${lng}&y=${lat}&wkid=4326&units=Meters&includeDate=false`
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const json = await res.json()
    const meters = Number(json?.value)
    if (!Number.isFinite(meters)) return null
    return Math.round(meters * METERS_TO_YARDS * 100) / 100
  } catch {
    return null
  }
}
