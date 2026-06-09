import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'

const COLOR_OPTIONS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' }
]

export default function PlanningAreaDialog({ open, initialData, onClose, onSave }) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#22c55e')

  useEffect(() => {
    if (open) {
      setLabel(initialData?.label || '')
      setDescription(initialData?.description || '')
      setColor(initialData?.style?.color || '#22c55e')
    }
  }, [open, initialData])

  const handleSave = () => {
    onSave({
      label,
      description,
      style: {
        color,
        opacity: 0.3
      }
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialData ? 'Edit Planning Area' : 'New Planning Area'}</DialogTitle>
      <DialogContent className="space-y-4 pt-4">
        <TextField
          label="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          fullWidth
          required
          autoFocus
          margin="dense"
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={3}
          margin="dense"
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Color</InputLabel>
          <Select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            label="Color"
          >
            {COLOR_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: opt.value }} />
                  {opt.label}
                </div>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!label.trim()}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}
