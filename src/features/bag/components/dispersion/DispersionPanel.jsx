import React from 'react';
import DispersionVisualizer from './DispersionVisualizer';

export default function DispersionPanel({ 
  clubs: externalClubs, 
  handedness: externalHandedness, 
  handicap: externalHandicap,
  activeClubId
}) {
  // Normalize handedness (e.g. "Right Handed" -> "Right")
  const normalizedHandedness = externalHandedness 
    ? (externalHandedness.includes('Right') ? 'Right' : 'Left') 
    : 'Right';

  const handicap = Number(externalHandicap || 0);
  
  // Map external clubs to the internal format
  const mappedClubs = (externalClubs || []).map(c => ({
    id: c.id,
    name: c.name,
    distance: c.total_distance || 0,
    left: c.miss_left || 0,
    right: c.miss_right || 0,
    short: c.miss_short || 0,
    long: c.miss_long || 0,
    // Database currently lacks color, so provide reasonable defaults based on type
    color: c.color || (c.is_putter ? '#10b981' : '#3b82f6'),
    shape: c.stock_shot_shape || 'Straight',
    is_putter: c.is_putter
  })).filter(c => !c.is_putter);

  return (
    <div className="flex w-full bg-slate-950 text-slate-200 font-sans overflow-hidden rounded-xl border border-slate-800 h-[750px]">
      <DispersionVisualizer 
        clubs={mappedClubs} 
        activeClubId={activeClubId} 
        handedness={normalizedHandedness} 
        handicap={handicap}
      />
    </div>
  );
}
