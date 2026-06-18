import { Search, Loader2 } from 'lucide-react'

export default function V2OSMFeaturePanel({
  osmToolActive,
  osmFilters,
  onOsmFiltersChange,
  osmLoading,
  osmMessage,
  onSearch,
}) {
  if (!osmToolActive && !osmLoading && !osmMessage) {
    return null
  }

  const handleToggleAll = () => {
    const allTrue = Object.values(osmFilters).every((v) => v)
    onOsmFiltersChange({
      tees: !allTrue,
      greens: !allTrue,
      fairways: !allTrue,
      bunkers: !allTrue,
      water: !allTrue,
      rough: !allTrue,
    })
  }

  return (
    <div className="v2-osm-panel p-3 bg-slate-900/60 border border-emerald-900/40 rounded-lg flex flex-col gap-3">
      {osmToolActive && (
        <>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              OSM Features
            </span>
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 uppercase tracking-wider px-1"
            >
              {Object.values(osmFilters).every((v) => v) ? 'Clear All' : 'Select All'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'tees', label: 'Tees' },
              { key: 'greens', label: 'Greens' },
              { key: 'fairways', label: 'Fairways' },
              { key: 'bunkers', label: 'Bunkers' },
              { key: 'water', label: 'Water' },
              { key: 'rough', label: 'Rough' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={osmFilters[key]}
                    onChange={(e) =>
                      onOsmFiltersChange((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="appearance-none w-4 h-4 border border-slate-600 rounded bg-slate-800/50 checked:bg-emerald-600 checked:border-emerald-500 transition-colors"
                  />
                  {osmFilters[key] && (
                    <svg
                      className="absolute w-3 h-3 text-white pointer-events-none left-0.5 top-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-300 select-none">
                  {label}
                </span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={onSearch}
            disabled={osmLoading || !Object.values(osmFilters).some(Boolean)}
            className="flex items-center justify-center gap-2 w-full mt-1 py-1.5 rounded-md bg-emerald-600/90 text-white text-xs font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {osmLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            {osmLoading ? 'Searching...' : 'Search Area'}
          </button>
        </>
      )}

      {osmMessage && !osmLoading && (
        <div
          className={`text-[11px] leading-snug p-2 rounded bg-slate-950/50 border ${
            osmMessage.toLowerCase().includes('fail') ||
            osmMessage.toLowerCase().includes('error') ||
            osmMessage.toLowerCase().includes('time')
              ? 'text-red-400 border-red-900/30'
              : 'text-amber-400 border-amber-900/30'
          }`}
        >
          {osmMessage}
        </div>
      )}
    </div>
  )
}
