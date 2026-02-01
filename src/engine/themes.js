// ========================================
// THEME / SKIN SYSTEM - ARCADE NEON
// ========================================

export const SKINS = {
  arcadeDark: {
    name: 'Arcade Neon',

    // Base colors
    primary: '#00F5FF',           // Electric cyan
    primaryLight: '#66F9FF',
    primaryDark: '#00C4CC',
    secondary: '#FF00AA',         // Hot pink/magenta
    secondaryLight: '#FF55CC',
    accent: '#FFFF00',            // Neon yellow
    accentLight: '#FFFF66',
    danger: '#FF3366',            // Neon red
    dangerLight: '#FF6688',
    success: '#00FF7F',           // Neon green
    successLight: '#55FFAA',
    ink: '#0F1629',

    // Background gradients - LIGHTENED for better visibility
    bgGradientStart: '#1E2642',
    bgGradientMid: '#252D4A',
    bgGradientEnd: '#1E2642',
    bgPattern: 'rgba(0, 245, 255, 0.03)',

    // Panels - lighter for contrast against new background
    panelTopStart: 'rgba(45, 55, 85, 0.95)',
    panelTopEnd: 'rgba(40, 50, 75, 0.92)',
    panelTopStroke: 'rgba(0, 245, 255, 0.35)',
    panelBottomStart: 'rgba(45, 55, 85, 0.95)',
    panelBottomEnd: 'rgba(40, 50, 75, 0.92)',
    panelBottomStroke: 'rgba(0, 245, 255, 0.35)',
    panelPowerupStart: 'rgba(45, 55, 85, 0.96)',
    panelPowerupEnd: 'rgba(40, 50, 75, 0.94)',

    // Moves pill
    movesPillStart: 'rgba(45, 55, 85, 0.95)',
    movesPillEnd: 'rgba(40, 50, 75, 0.92)',
    movesPillStroke: 'rgba(0, 245, 255, 0.35)',
    specsPillStart: 'rgba(45, 55, 85, 0.95)',
    specsPillEnd: 'rgba(40, 50, 75, 0.92)',
    specsPillStroke: 'rgba(0, 245, 255, 0.35)',

    // Lives indicators - more saturated
    movesGoodStart: 'rgba(0, 255, 127, 0.35)',
    movesGoodEnd: 'rgba(0, 255, 127, 0.25)',
    movesGoodText: '#00FF7F',
    movesGoodGlow: 'rgba(0, 255, 127, 0.5)',
    movesWarnStart: 'rgba(255, 255, 0, 0.35)',
    movesWarnEnd: 'rgba(255, 255, 0, 0.25)',
    movesWarnText: '#FFFF00',
    movesWarnGlow: 'rgba(255, 255, 0, 0.5)',
    movesLowStart: 'rgba(255, 51, 102, 0.45)',
    movesLowEnd: 'rgba(255, 51, 102, 0.35)',
    movesLowText: '#FF3366',
    movesLowGlow: 'rgba(255, 51, 102, 0.6)',

    // Submit button - neon green
    submitStart: '#00FF7F',
    submitEnd: '#00CC66',
    submitGlow: 'rgba(0, 255, 127, 0.6)',
    submitDisabledStart: 'rgba(45, 51, 72, 0.8)',
    submitDisabledEnd: 'rgba(35, 40, 58, 0.7)',

    // Angle chip - more visible when inactive
    angleChipStart: 'rgba(50, 60, 90, 0.95)',
    angleChipEnd: 'rgba(45, 55, 80, 0.92)',
    angleChipStroke: 'rgba(100, 130, 200, 0.4)',
    angleChipActiveStart: 'rgba(0, 245, 255, 0.2)',
    angleChipActiveEnd: 'rgba(0, 245, 255, 0.1)',
    angleChipActiveStroke: '#00F5FF',
    angleChipActiveText: '#00F5FF',

    // Powerups
    powerup1Start: 'rgba(0, 245, 255, 0.2)',     // T - cyan
    powerup1End: 'rgba(0, 245, 255, 0.1)',
    powerup1Stroke: '#00F5FF',
    powerup2Start: 'rgba(255, 0, 170, 0.2)',     // R - pink
    powerup2End: 'rgba(255, 0, 170, 0.1)',
    powerup2Stroke: '#FF00AA',
    powerup3Start: 'rgba(255, 255, 0, 0.2)',     // E - yellow
    powerup3End: 'rgba(255, 255, 0, 0.1)',
    powerup3Stroke: '#FFFF00',

    // Ball - neon yellow with glow
    ballFillStart: '#FFFF66',
    ballFillEnd: '#FFFF00',
    ballStroke: '#CCCC00',

    // Basket - neon green
    basketFill: 'rgba(0, 255, 127, 0.15)',
    basketStroke: '#00FF7F',
    basketRim: '#00CC66',
    basketLid: '#FF3366',
    basketLidGlow: 'rgba(255, 51, 102, 0.5)',

    // Shapes - NEUTRAL GRAY when not selected
    shapeNeutralFill: 'rgba(100, 116, 139, 0.2)',
    shapeNeutralStroke: 'rgba(148, 163, 184, 0.8)',
    shapeNeutralGlow: 'rgba(148, 163, 184, 0.3)',

    // Selected shape - BRIGHT CYAN (stands out)
    shapeSelectedAccent: '#00F5FF',
    shapeSelectedFill: 'rgba(0, 245, 255, 0.25)',
    shapeSelectedStroke: '#00F5FF',
    shapeSelectedGlow: 'rgba(0, 245, 255, 0.6)',

    // Lines - MORE VISIBLE
    spawnLine: 'rgba(0, 245, 255, 0.45)',
    basketLine: 'rgba(0, 255, 127, 0.55)',
    pieceAreaStroke: 'rgba(0, 245, 255, 0.35)',

    // Trajectory - cyan
    trajectoryStart: 'rgba(0, 245, 255, 0.8)',
    trajectoryEnd: 'rgba(0, 245, 255, 0.1)',
    trajectoryTick: 'rgba(0, 245, 255, 0.6)',
    trajectoryImpact: '#FFFF00',
    trajectoryImpactGlow: 'rgba(255, 255, 0, 0.6)',

    // Trail and particles
    trailColor: '#FFFF00',
    trailColorFast: '#FF3366',
    trailGlow: 'rgba(255, 255, 0, 0.6)',
    particleColors: ['#00F5FF', '#FF00AA', '#FFFF00', '#00FF7F', '#FF3366'],
    confettiColors: ['#00F5FF', '#FF00AA', '#FFFF00', '#00FF7F', '#FF3366'],
    shapeHitHighlight: '#FFFF00',
    swooshColor: 'rgba(0, 245, 255, 0.5)',

    // Text colors
    textPrimary: '#FFFFFF',
    textSecondary: '#B8C0D0',
    textMuted: '#6B7280',
    textLight: '#4B5563',
    textOnPrimary: '#0A0E1A',
  },
};

export function getTheme(skinName = 'arcadeDark') {
  const SKIN = SKINS[skinName] || SKINS.arcadeDark;
  return {
    ...SKIN,
    oneWayHighlight: '#FF00AA',
    oneWayGlow: 'rgba(255, 0, 170, 0.6)',
    glassBackground: 'rgba(26, 31, 53, 0.9)',
    glassBorder: 'rgba(0, 245, 255, 0.15)',
    glassBackgroundSolid: 'rgba(26, 31, 53, 0.98)',
    shadowSoft: 'rgba(0, 0, 0, 0.4)',
    shadowMedium: 'rgba(0, 0, 0, 0.5)',
    shadowGlow: SKIN.submitGlow,
    shadowSuccess: SKIN.submitGlow,
    buttonDisabled: SKIN.submitDisabledStart,
    buttonDisabledText: SKIN.textMuted,
    successLight: SKIN.successLight,
    success: SKIN.success,
    shapeStroke: SKIN.shapeNeutralStroke,
    shapeFill: SKIN.shapeNeutralFill,
    shapeGlow: SKIN.shapeNeutralGlow,
    shapeSelected: SKIN.shapeSelectedStroke,
    shapeSelectedFill: SKIN.shapeSelectedFill,
    shapeSelectedGlow: SKIN.shapeSelectedGlow,
    shapeSelectedAccent: SKIN.shapeSelectedAccent,
  };
}
