// AI assisted development
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

/**
 * ## Tool Button
 * 
 * A reusable UI button component designed for use within the `HoleWorkspace` toolbar.
 * It is fully built using Material UI components to support standard theme configurations,
 * offering responsive styling, custom hover states, and clear accessible states.
 * 
 * @param {Object} props - The properties for the ToolButton component.
 * @param {boolean} props.active - A boolean flag indicating whether the tool is currently active or selected.
 * @param {boolean} props.disabled - A boolean flag indicating whether the tool is disabled and cannot be interacted with.
 * @param {function} props.onClick - The event handler function to execute when the button is clicked.
 * @param {React.ComponentType} props.icon - The icon component to display in the button.
 * @param {string} props.label - The text label to display in the button.
 * @param {string} [props.hint] - Optional hint text to display as a tooltip for the button.
 * @param {boolean} [props.isLoading] - Optional boolean flag indicating a loading state. Shows a spinner instead of the icon.
 * @returns {JSX.Element}
 */
export default function ToolButton({ active, disabled, isLoading, onClick, icon: Icon, label, hint }) {
  return (
    <Button
      fullWidth
      disabled={disabled}
      onClick={onClick}
      title={hint}
      aria-pressed={active}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        gap: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: active ? 'rgba(16, 185, 129, 0.6)' : 'divider',
        bgcolor: active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(30, 41, 59, 0.5)',
        color: active ? 'primary.light' : 'text.primary',
        textAlign: 'left',
        px: 2,
        py: 1.5,
        textTransform: 'none',
        '&:hover': {
          borderColor: active ? 'primary.dark' : 'text.secondary',
          bgcolor: active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.8)',
        },
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transition: 'all 0.2s ease',
      }}
    >
      <Box sx={{ display: 'flex', mt: 0.5, shrink: 0 }}>
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <Icon size={20} color={active ? '#34d399' : '#94a3b8'} aria-hidden="true" />
        )}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: active ? 'primary.light' : 'text.primary', display: 'block', wordBreak: 'break-word' }}>
          {label}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.2 }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Button>
  )
}
