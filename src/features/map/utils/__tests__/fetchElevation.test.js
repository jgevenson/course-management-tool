// AI assisted development
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchElevation } from '../fetchElevation'

describe('fetchElevation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns yards from EPQS meters value', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ value: '100' }),
    })

    const yd = await fetchElevation(40.7, -74.0)
    // 100 m × 1.09361 = 109.361 → rounded to 2 decimals
    expect(yd).toBe(109.36)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('x=-74'),
      expect.any(Object),
    )
    expect(global.fetch.mock.calls[0][0]).toContain('y=40.7')
  })

  it('returns null when response is not ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 503 })

    expect(await fetchElevation(1, 2)).toBeNull()
  })

  it('returns null on fetch rejection', async () => {
    global.fetch.mockRejectedValue(new Error('network'))

    expect(await fetchElevation(1, 2)).toBeNull()
  })

  it('returns null when value is missing or not numeric', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    expect(await fetchElevation(1, 2)).toBeNull()

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ value: 'not-a-number' }),
    })
    expect(await fetchElevation(1, 2)).toBeNull()
  })

  it('returns null for non-finite lat/lng', async () => {
    expect(await fetchElevation(NaN, 0)).toBeNull()
    expect(await fetchElevation(0, Infinity)).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
