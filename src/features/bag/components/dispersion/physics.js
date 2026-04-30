// --- SVG Coordinate Math ---
export const SVG_WIDTH = 360;
export const SVG_HEIGHT = 900;
export const PIXELS_PER_YARD = 2.6;
export const TEE_X = SVG_WIDTH / 2;
export const TEE_Y = SVG_HEIGHT - 10;

export const yardToPxX = (yards) => TEE_X + (yards * PIXELS_PER_YARD);
export const yardToPxY = (yards) => TEE_Y - (yards * PIXELS_PER_YARD);

export const calculateTypicalDispersion = (club, hcp) => {
  const baseLatPercent = 0.04; 
  const baseDistPercent = 0.03; 
  const hcpLatModifier = 0.0035; 
  const hcpDistModifier = 0.0025;

  const latFactor = baseLatPercent + (hcp * hcpLatModifier);
  const distFactor = baseDistPercent + (hcp * hcpDistModifier);

  const shortBias = 1.0 + (hcp * 0.02); 
  const longBias = 1.0 - (hcp * 0.015); 

  return {
    ...club,
    left: Math.round(club.distance * latFactor),
    right: Math.round(club.distance * latFactor),
    short: Math.round(club.distance * distFactor * shortBias),
    long: Math.round(club.distance * distFactor * Math.max(longBias, 0.2)) 
  };
};

// Core Physics Engine
export const getPhysicsModifiers = (shape, baseDistance, handedness) => {
  const isRH = handedness === 'Right';
  const activeShape = shape || 'Straight';
  
  const curveMap = {
    'Big Draw': { dist: 1.06, curve: 0.12, angle: 45 },
    'Draw': { dist: 1.04, curve: 0.08, angle: 30 },
    'Slight Draw': { dist: 1.02, curve: 0.04, angle: 15 },
    'Straight': { dist: 1.0, curve: 0, angle: 0 },
    'Slight Fade': { dist: 0.98, curve: 0.04, angle: 15 },
    'Fade': { dist: 0.96, curve: 0.08, angle: 30 },
    'Big Fade': { dist: 0.94, curve: 0.12, angle: 45 },
  };

  const profile = curveMap[activeShape] || curveMap['Straight'];
  const curveIntensity = baseDistance * profile.curve;

  let latShift = 0;
  
  if (activeShape.includes('Draw')) {
    latShift = isRH ? -curveIntensity : curveIntensity;
  } else if (activeShape.includes('Fade')) {
    latShift = isRH ? curveIntensity : -curveIntensity;
  }

  // Return the raw angle magnitude, we will dynamically calculate rotation based on bounding box later
  return { distMod: profile.dist, latShift, tiltAngle: profile.angle };
};
