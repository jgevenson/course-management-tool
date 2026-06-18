// AI assisted development
import HoleSelectorV2 from './HoleSelectorV2'

/**
 * ## V2SidebarLeft
 *
 * The left sidebar container for the MapLibre v2 course mapping canvas.
 * Manages hole navigation and exposes workspace tools.
 */
export default function V2SidebarLeft({
  holes = [],
  selectedHoleIndex = 0,
  onSelectHoleIndex,
  children,
}) {
  return (
    <aside className="v2-sidebar flex flex-col gap-4 w-[280px] shrink-0 p-4 bg-slate-950/80 border-r border-slate-800 backdrop-blur-md overflow-y-auto">
      {/* Hole Selector Component */}
      <HoleSelectorV2
        holes={holes}
        selectedHoleIndex={selectedHoleIndex}
        onSelectHoleIndex={onSelectHoleIndex}
      />

      {/* Tools Slot / Children */}
      <div className="flex-1 w-full flex flex-col gap-4">
        {children || (
          <div className="v2-sidebar__placeholder flex-1 flex items-center justify-center border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-600 text-xs font-semibold uppercase tracking-wider">
            Workspace Tools
            <br />
            (coming soon)
          </div>
        )}
      </div>
    </aside>
  )
}
