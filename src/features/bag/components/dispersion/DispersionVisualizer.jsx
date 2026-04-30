import React from 'react';
import { 
  SVG_WIDTH, 
  SVG_HEIGHT, 
  PIXELS_PER_YARD, 
  TEE_X, 
  TEE_Y, 
  yardToPxX, 
  yardToPxY, 
  getPhysicsModifiers 
} from './physics';

export default function DispersionVisualizer({ clubs, activeClubId, handedness }) {
  return (
    <div className="flex-1 relative bg-[#0f172a] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at center, #10b981 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="relative h-full w-full max-w-3xl flex items-center justify-center">
        <svg 
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
          className="w-full h-full drop-shadow-2xl overflow-visible"
          style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }}
        >
          {/* Grid & Arcs */}
          <line x1={TEE_X} y1={0} x2={TEE_X} y2={TEE_Y} stroke="#1e293b" strokeWidth="2" strokeDasharray="6 6" />
          
          {Array.from({ length: 35 }, (_, i) => (i + 1) * 10).map((yard) => {
            const radius = yard * PIXELS_PER_YARD;
            const isMajor = yard % 50 === 0;
            return (
              <g key={`arc-${yard}`}>
                <circle 
                  cx={TEE_X} cy={TEE_Y} r={radius} 
                  fill="none" 
                  stroke={isMajor ? "#334155" : "#1e293b"} 
                  strokeWidth={isMajor ? "1" : "0.5"} 
                />
                {isMajor && (
                  <>
                    <text x={TEE_X - 35} y={TEE_Y - radius + 14} fill="#475569" fontSize="12" fontWeight="bold" fontFamily="monospace">{yard}</text>
                    <text x={TEE_X + 15} y={TEE_Y - radius + 14} fill="#475569" fontSize="12" fontWeight="bold" fontFamily="monospace">{yard}</text>
                  </>
                )}
              </g>
            );
          })}

          {/* The Tee */}
          <circle cx={TEE_X} cy={TEE_Y} r="6" fill="#f8fafc" />
          <circle cx={TEE_X} cy={TEE_Y} r="12" fill="none" stroke="#f8fafc" strokeWidth="2" opacity="0.5" />

          {/* Draw Ellipses & Flight Paths for all clubs */}
          {clubs.map((club) => {
            const isActive = club.id === activeClubId;
            const shape = club.shape || 'Straight';
            
            const { distMod, latShift, tiltAngle } = getPhysicsModifiers(shape, club.distance, handedness);
            const effectiveDistance = club.distance * distMod;
            
            const mechanicalOffsetX = (club.right - club.left) / 2;
            const mechanicalOffsetY = (club.long - club.short) / 2;
            const radiusX = (club.left + club.right) / 2;
            const radiusY = (club.short + club.long) / 2;

            const cx = yardToPxX(latShift + mechanicalOffsetX);
            const cy = yardToPxY(effectiveDistance + mechanicalOffsetY);
            const rx = radiusX * PIXELS_PER_YARD;
            const ry = radiusY * PIXELS_PER_YARD;
            
            const targetX = yardToPxX(latShift);
            const targetY = yardToPxY(effectiveDistance);

            // Aspect-Ratio Rotation Fix: Guarantees 10-to-4 axis for RH and 2-to-8 for LH
            const isRH = handedness === 'Right';
            const isWide = rx > ry; 
            let rotationAngle = 0;
            
            if (tiltAngle !== 0) {
              if (isRH) {
                // RH Misses: Left-Long / Right-Short (10-to-4 o'clock axis)
                rotationAngle = isWide ? tiltAngle : -tiltAngle;
              } else {
                // LH Misses: Right-Long / Left-Short (2-to-8 o'clock axis)
                rotationAngle = isWide ? -tiltAngle : tiltAngle;
              }
            }

            return (
              <g key={`dispersion-${club.id}`} className="transition-all duration-300">
                {/* The Dispersion Ellipse */}
                <ellipse 
                  cx={cx} cy={cy} rx={Math.max(rx, 1)} ry={Math.max(ry, 1)}
                  fill={club.color} fillOpacity={isActive ? 0.35 : 0.15}
                  stroke={club.color} strokeWidth={isActive ? 3 : 1} strokeDasharray={isActive ? "none" : "4 4"}
                  className="transition-all duration-500 ease-out"
                  style={{ filter: isActive ? `drop-shadow(0 0 15px ${club.color}40)` : 'none' }}
                  transform={`rotate(${rotationAngle} ${cx} ${cy})`}
                />
                
                {isActive && (
                  <>
                    {/* Base Aim Line */}
                    <g className="opacity-60">
                      <line x1={TEE_X} y1={TEE_Y} x2={TEE_X} y2={yardToPxY(club.distance + 20)} stroke="#475569" strokeWidth="1" strokeDasharray="2 4" />
                      <text x={TEE_X + 6} y={TEE_Y - 50} fill="#64748b" fontSize="10" letterSpacing="0.05em" transform={`rotate(-90 ${TEE_X + 6} ${TEE_Y - 50})`}>STARTING LINE</text>
                    </g>
                    
                    {/* True Ball Flight Curve */}
                    {shape !== 'Straight' ? (
                      <path 
                        d={`M ${TEE_X} ${TEE_Y} Q ${yardToPxX(-latShift * 1.5)} ${yardToPxY(effectiveDistance * 0.5)} ${targetX} ${targetY}`}
                        fill="none" stroke={club.color} strokeWidth="2" opacity="0.7"
                        className="transition-all duration-500 ease-out"
                      />
                    ) : (
                      <line x1={TEE_X} y1={TEE_Y} x2={targetX} y2={targetY} stroke={club.color} strokeWidth="2" opacity="0.7" />
                    )}

                    {/* Landing Dot */}
                    <circle cx={targetX} cy={targetY} r="4" fill={club.color} />
                    
                    {/* Dispersion Center Crosshair */}
                    {(mechanicalOffsetX !== 0 || mechanicalOffsetY !== 0 || rotationAngle !== 0) && (
                      <path 
                        d={`M ${cx-4} ${cy} L ${cx+4} ${cy} M ${cx} ${cy-4} L ${cx} ${cy+4}`} 
                        stroke={club.color} strokeWidth="2" opacity="0.8" 
                        transform={`rotate(${rotationAngle} ${cx} ${cy})`}
                      />
                    )}

                    {/* Club Label */}
                    <text 
                      x={cx + rx + 10} y={cy + 4} 
                      fill={club.color} fontSize="14" fontWeight="bold"
                      style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                    >
                      {club.name}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
