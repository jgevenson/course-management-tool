export default function ToolButton({ active, disabled, onClick, icon: Icon, label, hint }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={hint}
      aria-pressed={active}
      className={`w-full flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-200 ${
        active
          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
          : 'border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500 hover:bg-slate-800'
      } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${active ? 'text-emerald-400' : 'text-slate-400'}`} aria-hidden />
      <span>
        <span className="font-medium block">{label}</span>
        {hint && <span className="text-xs text-slate-500 block mt-0.5">{hint}</span>}
      </span>
    </button>
  )
}
