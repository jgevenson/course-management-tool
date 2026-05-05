/**
 * ## Tool Button
 * 
 * A reusable UI button component designed for use within the `HoleWorkspace` toolbar.
 * It provides a consistent visual pattern for interactive tools, featuring an icon, a label, 
 * and an optional hint text.
*
 * ### Visual States & Theming
 * The button dynamically adjusts its appearance based on its `active` and `disabled` props, 
 * utilizing a modern, dark-themed color palette:
 * - **Active State**: When `active={true}`, the button displays a distinct green theme, 
 *   indicated by a green border (`border-emerald-500/60`), a subtle green background fill 
 *   (`bg-emerald-500/10`), and green text (`text-emerald-100`). The icon color also shifts 
 *   to green in this state.
 * - **Inactive State**: In the default state, the button uses a neutral dark theme with 
 *   a slate gray border (`border-slate-600`), a semi-transparent slate background 
 *   (`bg-slate-800/50`), and muted text (`text-slate-200`).
 * - **Hover Effect**: A hover state is defined for the inactive state, providing a 
 *   visual cue to the user (`hover:border-slate-500 hover:bg-slate-800`).
 * - **Disabled State**: When `disabled={true}`, the button's opacity is reduced to `0.4` 
 *   and pointer events are suppressed (`pointer-events-none`), clearly indicating that 
 *   the tool is currently unavailable for selection.
 *
 * ### Accessibility
 * The component includes ARIA (Accessible Rich Internet Applications) attributes to 
 * ensure it is accessible to users relying on assistive technologies:
 * - `type="button"`: Explicitly defines the element as a button.
 * - `aria-pressed={active}`: A boolean state attribute that communicates whether the 
 *   button is currently toggled on (active) or off (inactive) to screen readers.
 * - `aria-hidden="true"`: Applied to the icon, indicating that the icon is purely 
 *   decorative and does not convey essential information beyond what the label provides.
 *
 * ### Component Usage & Props
 * The button is designed to be used as a controlled component within a parent toolbar. 
 * The `icon` prop is a React component, allowing for flexible icon usage (e.g., `Pen`, 
 * `Trash2`). The `hint` prop allows for the inclusion of descriptive tooltip text.
 * 
 * @param {Object} props - The properties for the ToolButton component.
 * @param {boolean} props.active - A boolean flag indicating whether the tool is currently active or selected.
 * @param {boolean} props.disabled - A boolean flag indicating whether the tool is disabled and cannot be interacted with.
 * @param {function} props.onClick - The event handler function to execute when the button is clicked.
 * @param {React.ComponentType} props.icon - The icon component to display in the button.
 * @param {string} props.label - The text label to display in the button.
 * @param {string} [props.hint] - Optional hint text to display as a tooltip for the button.
 * @returns {JSX.Element}
 */

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
