import React, { useRef, useEffect, useCallback } from 'react';
import { useTutorial } from '../context/TutorialContext.jsx';
import { TutorialState, TUTORIAL_CONFIG, TUTORIAL_CONTENT, Level1TutorialStep } from '../engine/constants.js';

export default function TutorialOverlay({ width, height }) {
  const canvasRef = useRef(null);
  const tutorial = useTutorial();
  const animTimeRef = useRef(0);
  const rafRef = useRef(null);

  const { currentStep, state, fadeProgress, highlightedElements } = tutorial;

  // Get content for current step
  const content = currentStep ? TUTORIAL_CONTENT[currentStep] : null;

  // Animation loop for pulse effect
  useEffect(() => {
    if (state === TutorialState.HIDDEN) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let lastTime = performance.now();

    const animate = (now) => {
      const dt = now - lastTime;
      lastTime = now;
      animTimeRef.current += dt;

      draw();
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [state, fadeProgress, highlightedElements, currentStep]);

  // Draw the overlay
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return;

    const ctx = canvas.getContext('2d');
    const cfg = TUTORIAL_CONFIG;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (state === TutorialState.HIDDEN) return;

    // Calculate opacity
    const opacity = fadeProgress * 0.7;

    // 1. Draw full tint
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.fillRect(0, 0, width, height);

    // 2. Cut out highlighted areas
    if (highlightedElements.length > 0) {
      ctx.globalCompositeOperation = 'destination-out';

      for (const hl of highlightedElements) {
        const padding = cfg.HIGHLIGHT_PADDING;
        const x = hl.x - padding;
        const y = hl.y - padding;
        const w = hl.width + padding * 2;
        const h = hl.height + padding * 2;
        const r = cfg.HIGHLIGHT_BORDER_RADIUS;

        // Draw rounded rect cutout
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';

      // 3. Draw glow around cutouts
      const pulseTime = animTimeRef.current % cfg.HIGHLIGHT_PULSE_DURATION;
      const pulsePhase = pulseTime / cfg.HIGHLIGHT_PULSE_DURATION;
      const pulseOpacity = 0.2 + 0.2 * Math.sin(pulsePhase * Math.PI * 2);

      for (const hl of highlightedElements) {
        const padding = cfg.HIGHLIGHT_PADDING;
        const x = hl.x - padding;
        const y = hl.y - padding;
        const w = hl.width + padding * 2;
        const h = hl.height + padding * 2;
        const r = cfg.HIGHLIGHT_BORDER_RADIUS;

        // Glow color (red for missed objects)
        const glowColor = hl.isRed
          ? `rgba(255, 100, 100, ${(0.3 + 0.2 * Math.sin(pulsePhase * Math.PI * 2)) * fadeProgress})`
          : `rgba(255, 255, 255, ${pulseOpacity * fadeProgress})`;

        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = hl.isRed ? 'rgba(255, 100, 100, 0.6)' : 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 8;

        // Draw rounded rect glow
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.stroke();

        ctx.shadowBlur = 0;
      }
    }
  }, [width, height, state, fadeProgress, highlightedElements]);

  // Handle tap to dismiss
  const handleTap = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (state === TutorialState.VISIBLE) {
      tutorial.dismissTutorial();
    }
  }, [state, tutorial]);

  // Don't render if hidden
  if (state === TutorialState.HIDDEN || !content) {
    return null;
  }

  // Position text at top for NEAR_MISS (highlight is at bottom), otherwise at bottom
  const isTextAtTop = currentStep === Level1TutorialStep.NEAR_MISS;

  const textBoxStyle = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    ...(isTextAtTop
      ? { top: '150px' }
      : { bottom: `${TUTORIAL_CONFIG.TEXT_BOX_MARGIN_BOTTOM}px` }
    ),
    background: TUTORIAL_CONFIG.TEXT_BOX_BG,
    border: `1px solid ${TUTORIAL_CONFIG.TEXT_BOX_BORDER}`,
    borderRadius: `${TUTORIAL_CONFIG.TEXT_BOX_RADIUS}px`,
    padding: '20px 24px',
    maxWidth: '320px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    opacity: fadeProgress,
    zIndex: 1001,
    pointerEvents: 'none',
  };

  const mainTextStyle = {
    fontSize: '18px',
    fontWeight: 500,
    color: '#FFFFFF',
    lineHeight: 1.4,
    textAlign: 'center',
    margin: 0,
  };

  const subtextStyle = {
    fontSize: '13px',
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    margin: 0,
    marginTop: '12px',
  };

  return (
    <>
      {/* Canvas for tint and cutouts */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleTap}
        onTouchEnd={handleTap}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1000,
          pointerEvents: state === TutorialState.VISIBLE ? 'auto' : 'none',
        }}
      />

      {/* Text box */}
      <div style={textBoxStyle}>
        <p style={mainTextStyle}>{content.text}</p>
        <p style={subtextStyle}>{content.subtext}</p>
      </div>
    </>
  );
}
