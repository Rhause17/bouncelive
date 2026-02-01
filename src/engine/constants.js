// ========================================
// CORE CONSTANTS & CONFIGURATION
// ========================================

export const SIZE_SCALE = 0.65;

export const ShapeTypeEnum = {
  TRIANGLE_LEFT: 'triangle_left',
  TRIANGLE_RIGHT: 'triangle_right',
  LINE: 'line',
  HALF_CIRCLE: 'half_circle',
  DIAMOND: 'diamond',
  OCTAGON: 'octagon',
  TRAPEZOID: 'trapezoid',
  ARROWHEAD: 'arrowhead',
  BOOMERANG: 'boomerang',
  HALF_PIPE: 'half_pipe',
  SAWTOOTH_RAMP: 'sawtooth_ramp',
};

// Object ID to ShapeTypeEnum mapping (used by level data)
export const OBJECT_ID_MAP = {
  1: ShapeTypeEnum.TRIANGLE_LEFT,
  2: ShapeTypeEnum.TRIANGLE_RIGHT,
  3: ShapeTypeEnum.LINE,
  4: ShapeTypeEnum.HALF_CIRCLE,
  5: ShapeTypeEnum.TRAPEZOID,
  6: ShapeTypeEnum.DIAMOND,
  7: ShapeTypeEnum.OCTAGON,
  8: ShapeTypeEnum.ARROWHEAD,
  9: ShapeTypeEnum.BOOMERANG,
  10: ShapeTypeEnum.HALF_PIPE,
  11: ShapeTypeEnum.SAWTOOTH_RAMP,
};

export const ONEWAY_ELIGIBLE = {
  1: true,
  2: true,
  3: false,
  4: true,
  5: true,
  6: true,
  7: true,
  8: true,
  9: true,
  10: true,
  11: true,
};

// Shape categories
export const NORMAL_SHAPES = [
  ShapeTypeEnum.TRIANGLE_LEFT,
  ShapeTypeEnum.TRIANGLE_RIGHT,
  ShapeTypeEnum.LINE,
  ShapeTypeEnum.HALF_CIRCLE,
  ShapeTypeEnum.TRAPEZOID,
];

export const ODD_SHAPES = [
  ShapeTypeEnum.DIAMOND,
  ShapeTypeEnum.OCTAGON,
  ShapeTypeEnum.ARROWHEAD,
  ShapeTypeEnum.BOOMERANG,
  ShapeTypeEnum.HALF_PIPE,
  ShapeTypeEnum.SAWTOOTH_RAMP,
];

// ========================================
// PHYSICS PRESETS
// ========================================

export const BASE_GRAVITY = 1500;

export const GRAVITY_PRESETS = {
  Low:    { multiplier: 0.70, color: '#4ADE80' },
  Normal: { multiplier: 1.00, color: '#FFFFFF' },
  High:   { multiplier: 1.30, color: '#F87171' },
};

export const REBOUND_PRESETS = {
  Soft:   { restitution: 0.55, friction: 0.82, color: '#4ADE80' },
  Normal: { restitution: 0.75, friction: 0.90, color: '#FFFFFF' },
  Bouncy: { restitution: 0.92, friction: 0.94, color: '#F87171' },
};

export const GRAVITY_NAMES = ['Low', 'Normal', 'High'];
export const REBOUND_NAMES = ['Soft', 'Normal', 'Bouncy'];

// ========================================
// DIFFICULTY TIERS
// ========================================

export const SPECS_TIER = {
  STABLE: 'stable',
  MODERATE: 'moderate',
  WILD: 'wild',
};

export const STABLE_COMBOS = [
  ['Normal', 'Normal'],
  ['Low', 'Normal'],
  ['Normal', 'Soft'],
];

export const MODERATE_COMBOS = [
  ['Normal', 'Normal'],
  ['Low', 'Normal'],
  ['Normal', 'Soft'],
  ['Low', 'Soft'],
  ['High', 'Normal'],
  ['Normal', 'Bouncy'],
];

export const WILD_COMBOS = [];
for (const g of GRAVITY_NAMES) {
  for (const r of REBOUND_NAMES) {
    WILD_COMBOS.push([g, r]);
  }
}

// ========================================
// ANIMATION CONSTANTS
// ========================================

export const ANIM = {
  buttonPressScale: 0.96,
  buttonHoverScale: 1.02,
  hudPopDuration: 0.3,
  glowPulseSpeed: 2.5,
  transitionSpeed: 0.15,

  // Ball trail
  trailMaxPoints: 30,
  trailMinDistance: 3,
  trailSpeedThreshold: 50,
  trailFadeSpeed: 4,
  trailHighSpeedThreshold: 400,

  // Squash/stretch
  squashAmount: 0.25,
  squashDecay: 12,

  // Collision particles
  particleCountMin: 6,
  particleCountMax: 12,
  particleLifetimeMin: 0.25,
  particleLifetimeMax: 0.5,
  particleSpeedMin: 80,
  particleSpeedMax: 200,
  particleSizeMin: 2,
  particleSizeMax: 5,

  // Shape hit feedback
  shapeHitScale: 1.15,
  shapeHitScaleDecay: 8,
  shapeHighlightDuration: 0.3,

  // Basket animation
  lidOpenSpeed: 12,
  lidBounce: 0.3,
  successPulseScale: 1.2,
  basketPulseDuration: 0.3,
  confettiCount: 30,
  confettiLifetime: 1.5,

  // Screen shake
  shakeThreshold: 300,
  shakeIntensity: 4,
  shakeDuration: 0.15,

  // Replay swoosh
  swooshDuration: 0.4,

  // Trajectory preview
  trajectoryDotSpacing: 8,
  trajectoryTickSpacing: 40,
  trajectoryTickSize: 6,
  trajectoryPulseSpeed: 3,

  // HUD transitions
  hudStateTransitionSpeed: 6,
  hudStateOffset: 8,
  submitPopScale: 1.08,
  submitPopDuration: 0.2,
};

// ========================================
// LAYOUT CONSTANTS
// ========================================

export const LAYOUT = {
  levelDataAreaHeight: 75,
  levelDataAreaPadding: 12,

  movesBoxWidth: 100,
  movesBoxHeight: 55,
  movesBoxX: 12,
  movesBoxY: 10,
  movesLabelFontSize: 11,
  movesNumberFontSize: 24,
  movesSeparatorY: 22,

  specsBoxWidth: 100,
  specsBoxHeight: 55,
  specsBoxMarginRight: 12,
  specsBoxY: 10,
  specsFontSize: 11,

  levelFontSize: 26,

  ballLineOffsetFromTop: 60,

  pieceAreaHeight: 90,
  pieceAreaMargin: 15,
  pieceAreaAboveBasket: 70,

  basketLineExtraOffset: 120,

  bottomControlsHeight: 105,
  bottomControlsPadding: 25,
  controlBoxHeight: 55,
  controlBoxMargin: 25,
  controlBoxGap: 35,
  controlBoxFontSize: 20,

  powerupAreaHeight: 60,
  powerupButtonSize: 42,

  boxCornerRadius: 8,
  controlCornerRadius: 10,
  pieceAreaCornerRadius: 10,

  degreeSwipeSensitivity: 0.1,
};
