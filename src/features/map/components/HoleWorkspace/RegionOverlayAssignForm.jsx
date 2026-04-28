import { useState, useCallback } from 'react'
import { TERRAIN_TYPE_OPTIONS, isValidTerrainType } from '../../utils/regionTerrain'

export default function RegionOverlayAssignForm({
  holes,
  selectedHole,
  onDiscardRegionDraft,
  onSaveRegionDraft,
  regionSaving,
  regionError,
}) {
  const [terrainType, setTerrainType] = useState(TERRAIN_TYPE_OPTIONS[0].id)
  const [label, setLabel] = useState('')
  const [holeIds, setHoleIds] = useState(() =>
    selectedHole?.id ? [selectedHole.id] : [],
  )

  const toggleHole = useCallback((holeId) => {
    setHoleIds((prev) => {
      const set = new Set(prev)
      if (set.has(holeId)) {
        if (set.size <= 1) return prev
        set.delete(holeId)
      } else {
        set.add(holeId)
      }
      return Array.from(set)
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!isValidTerrainType(terrainType) || holeIds.length === 0) return
    await onSaveRegionDraft({
      terrainType,
      label: label.trim(),
      holeIds,
    })
  }, [terrainType, label, holeIds, onSaveRegionDraft])

  return (
    <div className="mt-3 rounded-lg border border-emerald-500/40 bg-slate-900/90 p-3 flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">New region</h3>
        <p className="text-xs text-slate-500 mt-1">Choose type, optional label, and which holes use this area.</p>
      </div>
      <div>
        <label htmlFor="region-terrain-type" className="text-xs text-slate-500 uppercase tracking-wide">
          Terrain type
        </label>
        <select
          id="region-terrain-type"
          value={terrainType}
          onChange={(e) => setTerrainType(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        >
          {TERRAIN_TYPE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="region-label" className="text-xs text-slate-500 uppercase tracking-wide">
          Optional label
        </label>
        <input
          id="region-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Front bunker"
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Holes in play</span>
        <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800">
          {holes.map((h) => (
            <li key={h.id}>
              <label className="flex items-center gap-2 px-2 py-2 text-sm text-slate-200 cursor-pointer hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={holeIds.includes(h.id)}
                  onChange={() => toggleHole(h.id)}
                  className="size-3.5 rounded border-slate-600 bg-slate-900 text-emerald-600 focus:ring-emerald-500/40"
                />
                <span className="tabular-nums">Hole {h.hole_number}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      {regionError && <p className="text-xs text-red-400">{regionError}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDiscardRegionDraft}
          disabled={regionSaving}
          className="flex-1 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-all duration-200"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={regionSaving || holeIds.length === 0}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-all duration-200"
        >
          {regionSaving ? 'Saving…' : 'Save region'}
        </button>
      </div>
    </div>
  )
}
