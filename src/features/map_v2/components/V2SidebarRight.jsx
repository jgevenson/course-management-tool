// AI assisted development

/**
 * ## V2SidebarRight
 *
 * The right sidebar container for the MapLibre v2 course mapping canvas.
 * Primarily handles overlay properties inspection and drawing meta forms.
 */
export default function V2SidebarRight({
  isOpen = true,
  children,
}) {
  if (!isOpen) return null

  return (
    <aside className="v2-sidebar v2-sidebar--right flex flex-col gap-4 w-[320px] min-w-[320px] shrink-0 p-4 bg-slate-950/80 border-l border-slate-800 backdrop-blur-md overflow-y-auto">
      <div className="flex-1 w-full flex flex-col gap-4">
        {children || (
          <div className="v2-sidebar__placeholder flex-1 flex items-center justify-center border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-600 text-xs font-semibold uppercase tracking-wider">
            Inspector
            <br />
            (coming soon)
          </div>
        )}
      </div>
    </aside>
  )
}
