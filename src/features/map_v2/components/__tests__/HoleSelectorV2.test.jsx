// AI assisted development
import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import HoleSelectorV2 from '../HoleSelectorV2'

const mockHoles = [
  { id: 'h1', hole_number: 1, par: 4, scorecard_yardage: 410, stroke_index: 3 },
  { id: 'h2', hole_number: 2, par: 3, scorecard_yardage: 180, stroke_index: 17 },
  { id: 'h3', hole_number: 3, par: 5, scorecard_yardage: 530, stroke_index: 1 },
]

describe('HoleSelectorV2', () => {
  it('renders correct hole number and stats', () => {
    render(
      <HoleSelectorV2
        holes={mockHoles}
        selectedHoleIndex={0}
        onSelectHoleIndex={vi.fn()}
      />
    )

    expect(screen.getByText('Hole 1')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument() // Par
    expect(screen.getByText('410')).toBeInTheDocument() // Yardage

    const hcpLabel = screen.getByText('HCP / SI')
    const hcpValue = hcpLabel.nextElementSibling
    expect(hcpValue.textContent).toBe('3')
  })

  it('renders a grid button for each hole', () => {
    render(
      <HoleSelectorV2
        holes={mockHoles}
        selectedHoleIndex={0}
        onSelectHoleIndex={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
  })

  it('calls onSelectHoleIndex when a grid button is clicked', () => {
    const onSelect = vi.fn()
    render(
      <HoleSelectorV2
        holes={mockHoles}
        selectedHoleIndex={0}
        onSelectHoleIndex={onSelect}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('navigates to the next index and wraps on next click', () => {
    const onSelect = vi.fn()
    const { rerender } = render(
      <HoleSelectorV2
        holes={mockHoles}
        selectedHoleIndex={0}
        onSelectHoleIndex={onSelect}
      />
    )

    // Next from index 0 should go to index 1
    fireEvent.click(screen.getByLabelText('Next hole'))
    expect(onSelect).toHaveBeenCalledWith(1)

    // Next from final index 2 should wrap to 0
    rerender(
      <HoleSelectorV2
        holes={mockHoles}
        selectedHoleIndex={2}
        onSelectHoleIndex={onSelect}
      />
    )
    fireEvent.click(screen.getByLabelText('Next hole'))
    expect(onSelect).toHaveBeenCalledWith(0)
  })

  it('navigates to the previous index and wraps on prev click', () => {
    const onSelect = vi.fn()
    const { rerender } = render(
      <HoleSelectorV2
        holes={mockHoles}
        selectedHoleIndex={1}
        onSelectHoleIndex={onSelect}
      />
    )

    // Prev from index 1 should go to index 0
    fireEvent.click(screen.getByLabelText('Previous hole'))
    expect(onSelect).toHaveBeenCalledWith(0)

    // Prev from index 0 should wrap to final index 2
    rerender(
      <HoleSelectorV2
        holes={mockHoles}
        selectedHoleIndex={0}
        onSelectHoleIndex={onSelect}
      />
    )
    fireEvent.click(screen.getByLabelText('Previous hole'))
    expect(onSelect).toHaveBeenCalledWith(2)
  })
})
