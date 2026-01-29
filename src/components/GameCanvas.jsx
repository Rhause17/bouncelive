import React, { useRef, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useCanvasSize } from '../hooks/useCanvasSize.js';
import { useGameLoop } from '../hooks/useGameLoop.js';
import { getTheme } from '../engine/themes.js';
import { Utils } from '../engine/utils.js';
import { LAYOUT, ANIM, GRAVITY_PRESETS, REBOUND_PRESETS, SIZE_SCALE } from '../engine/constants.js';
import { predictTrajectory, drawTrajectory } from '../engine/trajectory.js';

const THEME = getTheme('arcadeDark');

export default function GameCanvas() {
  const canvasRef = useRef(null);
  const { state, dispatch, gameObjects, setupLevel, submit, nextLevel } = useGame();
  const { width, height } = useCanvasSize();
  const patternCanvasRef = useRef(null);
  const lastTapTimeRef = useRef(0); // For double-tap detection

  // Create background dot pattern once
  useEffect(() => {
    const pc = document.createElement('canvas');
    pc.width = 24;
    pc.height = 24;
    const pctx = pc.getContext('2d');
    pctx.fillStyle = THEME.bgPattern;
    pctx.beginPath();
    pctx.arc(12, 12, 1.5, 0, Math.PI * 2);
    pctx.fill();
    patternCanvasRef.current = pc;
  }, []);

  // Clear game objects when returning to welcome
  useEffect(() => {
    if (state.screen === 'welcome') {
      gameObjects.current.ball = null;
      gameObjects.current.basket = null;
      gameObjects.current.shapes = [];
    }
  }, [state.screen, gameObjects]);

  // Initialize level when game starts
  useEffect(() => {
    if (state.screen === 'playing' && state.gameState === 'edit' && !gameObjects.current.ball) {
      setupLevel(state.level, width, height);
    }
  }, [state.screen, state.level, width, height, setupLevel, state.gameState, gameObjects]);

  // ========================================
  // DRAWING
  // ========================================
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const go = gameObjects.current;
    if (!go.ball || !go.basket) return;

    const w = canvas.width;
    const h = canvas.height;
    const T = THEME;
    const L = LAYOUT;
    const animEase = Math.min(1, go.hudAnimProgress * go.hudAnimProgress * (3 - 2 * go.hudAnimProgress));

    // Screen shake
    ctx.save();
    if (go.vfx.screenShake.time > 0) {
      ctx.translate(go.vfx.screenShake.x, go.vfx.screenShake.y);
    }

    // Background
    const bgGradient = ctx.createLinearGradient(0, 0, w * 0.3, h);
    bgGradient.addColorStop(0, T.bgGradientStart);
    bgGradient.addColorStop(0.5, T.bgGradientMid);
    bgGradient.addColorStop(1, T.bgGradientEnd);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Dot pattern
    if (patternCanvasRef.current) {
      const pattern = ctx.createPattern(patternCanvasRef.current, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
    }

    // Vignette
    const vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.5, w / 2, h / 2, h);
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, w, h);

    // ===== TOP PANEL =====
    const topOffset = L.levelDataAreaHeight * (1 - animEase) + go.hudStateOffset;
    ctx.save();
    ctx.translate(0, -topOffset);

    const panelGrad = ctx.createLinearGradient(0, 0, 0, L.levelDataAreaHeight);
    panelGrad.addColorStop(0, T.panelTopStart);
    panelGrad.addColorStop(1, T.panelTopEnd);
    ctx.fillStyle = panelGrad;
    ctx.fillRect(0, 0, w, L.levelDataAreaHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, w, 1);
    ctx.fillStyle = T.panelTopStroke;
    ctx.fillRect(0, L.levelDataAreaHeight - 1, w, 1);

    // Lives pill
    drawLivesPill(ctx, state, go, T, L);

    // Specs box
    drawSpecsBox(ctx, w, state, T, L);

    // Level display
    ctx.font = `800 ${L.levelFontSize}px Nunito, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Level ${state.level}`, w / 2, L.movesBoxY + L.movesBoxHeight / 2 + 2);

    ctx.restore();

    // ===== BALL LINE =====
    ctx.beginPath();
    ctx.moveTo(0, go.ballUpperLimit);
    ctx.lineTo(w, go.ballUpperLimit);
    ctx.strokeStyle = T.spawnLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ===== REPLAY SWOOSH =====
    if (go.replaySwooshTime > 0) {
      const swooshAlpha = go.replaySwooshTime / ANIM.swooshDuration;
      const swooshGlow = Math.sin(swooshAlpha * Math.PI) * 0.6;

      ctx.beginPath();
      ctx.moveTo(0, go.ballUpperLimit);
      ctx.lineTo(w, go.ballUpperLimit);
      ctx.strokeStyle = T.swooshColor || 'rgba(34, 211, 238, 0.5)';
      ctx.lineWidth = 4;
      ctx.globalAlpha = swooshGlow;
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.moveTo(0, go.basketLineY);
      ctx.lineTo(w, go.basketLineY);
      ctx.strokeStyle = T.swooshColor || 'rgba(34, 211, 238, 0.5)';
      ctx.lineWidth = 4;
      ctx.globalAlpha = swooshGlow;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ===== PIECE AREA =====
    if (!state.allShapesPlaced) {
      Utils.roundRect(ctx, go.pieceAreaX, go.pieceAreaY, go.pieceAreaWidth, go.pieceAreaHeight, L.pieceAreaCornerRadius);
      ctx.strokeStyle = T.pieceAreaStroke;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Hint text above piece area - only on level 1, fades when piece moved
      if (state.level === 1 && go.pieceHintAlpha > 0) {
        // Fade out when any piece has been moved
        const anyMoved = go.shapes.some(s => s.hasBeenMoved);
        if (anyMoved && go.pieceHintAlpha > 0) {
          go.pieceHintAlpha = Math.max(0, go.pieceHintAlpha - 0.05);
        }

        ctx.save();
        ctx.globalAlpha = go.pieceHintAlpha;
        ctx.font = `700 ${L.controlBoxFontSize * 0.85}px Nunito, sans-serif`;
        ctx.fillStyle = T.textSecondary;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Place objects to submit', w / 2, go.pieceAreaY - 10);
        ctx.restore();
      }
    }

    // ===== BASKET LINE =====
    ctx.beginPath();
    ctx.moveTo(0, go.basketLineY);
    ctx.lineTo(w, go.basketLineY);
    ctx.strokeStyle = T.basketLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ===== SHAPES =====
    go.shapes.forEach((s, i) => {
      s.isSelected = (i === state.selectedShapeIndex);
      s.draw(ctx, T);
    });

    // ===== BASKET =====
    go.basket.draw(ctx, T);

    // ===== TRAJECTORY =====
    if (state.gameState === 'edit' && state.allShapesPlaced) {
      const traj = predictTrajectory(
        go.physics, go.shapes, go.basket,
        go.ballSpawnX, go.ballUpperLimit,
        state.trajectoryExtended, w, h,
      );
      drawTrajectory(ctx, traj, go.time, state.trajectoryExtended, T);
    }

    // ===== BALL =====
    go.ball.draw(ctx, T);

    // ===== VFX =====
    go.vfx.draw(ctx);

    // ===== BOTTOM CONTROLS =====
    const powerupY = h - L.powerupAreaHeight;
    const bottomOffset = (L.bottomControlsHeight + L.powerupAreaHeight) * (1 - animEase);

    ctx.save();
    ctx.translate(0, bottomOffset);

    drawBottomControls(ctx, w, h, state, go, T, L);
    drawPowerupArea(ctx, w, h, state, T, L, powerupY);

    ctx.restore();

    // ===== REMOVE MODE OVERLAY (after bottom controls to cover them) =====
    // Animate tint alpha
    if (state.selectRemoveTargetMode) {
      go.removeModeAlpha = Math.min(1, go.removeModeAlpha + 0.08);
    } else {
      go.removeModeAlpha = Math.max(0, go.removeModeAlpha - 0.12);
    }

    if (go.removeModeAlpha > 0) {
      const tintAlpha = go.removeModeAlpha * 0.65;

      // Dark tint over ENTIRE screen
      ctx.fillStyle = `rgba(0, 0, 0, ${tintAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // Re-draw shapes above tint with pulsing red glow
      const glowPulse = 0.6 + 0.3 * Math.sin(go.time * 4);

      go.shapes.forEach(s => {
        if (!s.isVisible()) return;

        ctx.save();
        ctx.globalAlpha = (s.opacity != null ? s.opacity : 1) * go.removeModeAlpha;

        // Pulsing red glow
        ctx.shadowColor = `rgba(248, 113, 113, ${glowPulse})`;
        ctx.shadowBlur = 18 + 6 * Math.sin(go.time * 4);

        // Draw shape segments with neutral fill + red stroke
        const segs = s.getSegments();
        if (segs.length > 0) {
          ctx.beginPath();
          ctx.moveTo(segs[0].a.x, segs[0].a.y);
          for (const seg of segs) {
            ctx.lineTo(seg.a.x, seg.a.y);
            ctx.lineTo(seg.b.x, seg.b.y);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(248, 113, 113, 0.95)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // Hint text
      ctx.save();
      ctx.globalAlpha = go.removeModeAlpha;
      ctx.font = `700 ${16 * SIZE_SCALE}px Nunito, sans-serif`;
      ctx.fillStyle = '#f87171';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const hintY = h - L.powerupAreaHeight - 30;
      ctx.fillText('Tap an object to remove', w / 2, hintY);
      ctx.restore();
    }

    // ===== ONE-WAY TUTORIAL (drawn last to cover everything) =====
    if (state.tutorialActive) {
      drawOneWayTutorial(ctx, w, h, T);
    }

    // End screen shake
    ctx.restore();
  }, [state, gameObjects]);

  // ========================================
  // GAME LOOP
  // ========================================
  useGameLoop({
    gameObjects,
    state,
    dispatch,
    onDraw: draw,
  });

  // ========================================
  // INPUT HANDLING
  // ========================================
  const getCanvasCoords = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (canvas.width / r.width),
      y: (clientY - r.top) * (canvas.height / r.height),
    };
  }, []);

  const dragState = useRef({
    isDragging: false,
    isRotating: false,
    shapeIndex: -1,
    offsetX: 0,
    offsetY: 0,
    isSwipingAngle: false,
    swipeStartX: 0,
    angleAtSwipeStart: 0,
  });

  const handlePointerDown = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasCoords(clientX, clientY);
    const go = gameObjects.current;
    const s = state;

    if (s.gameState !== 'edit') return;

    // Tutorial dismiss
    if (s.tutorialActive) {
      dispatch({ type: 'DISMISS_TUTORIAL' });
      return;
    }

    // Remove mode: click on shape to remove it
    if (s.selectRemoveTargetMode) {
      for (let i = go.shapes.length - 1; i >= 0; i--) {
        const shape = go.shapes[i];
        if (!shape.isVisible()) continue;
        if (shape.containsPoint(x, y)) {
          shape.hasBeenHit = true;
          shape.hasBeenMoved = true;
          shape.removedByPowerup = true;
          shape.startDisappear();
          dispatch({ type: 'REMOVE_SHAPE' });
          return;
        }
      }
      // Tap outside shape cancels
      dispatch({ type: 'EXIT_REMOVE_MODE' });
      return;
    }

    // Check powerup buttons
    const powerupHit = getPowerupButtonHit(canvasRef.current, x, y);
    if (powerupHit) {
      dispatch({ type: 'OPEN_POWERUP_POPOVER', powerupType: powerupHit });
      return;
    }

    // Check submit button
    const submitBox = getSubmitBoxBounds(canvasRef.current);
    if (s.canSubmit && hitTest(x, y, submitBox)) {
      submit();
      return;
    }

    // Check shape interactions
    for (let i = go.shapes.length - 1; i >= 0; i--) {
      const shape = go.shapes[i];
      if (!shape.isVisible()) continue;

      // Check rotate handle first
      if (shape.containsRotateHandle(x, y)) {
        dragState.current = {
          isDragging: false,
          isRotating: true,
          shapeIndex: i,
          offsetX: 0,
          offsetY: 0,
          isSwipingAngle: false,
          swipeStartX: 0,
          angleAtSwipeStart: 0,
        };
        dispatch({ type: 'SELECT_SHAPE', index: i });
        return;
      }

      if (shape.touchAreaContains(x, y)) {
        shape.saveDragStart(); // Save position for snap-back on invalid drop
        dragState.current = {
          isDragging: true,
          isRotating: false,
          shapeIndex: i,
          offsetX: x - shape.x,
          offsetY: y - shape.y,
          isSwipingAngle: false,
          swipeStartX: 0,
          angleAtSwipeStart: 0,
        };
        dispatch({ type: 'SELECT_SHAPE', index: i });
        return;
      }
    }

    // Check angle box swipe
    const angleBox = getAngleBoxBounds(canvasRef.current);
    if (s.selectedShapeIndex >= 0 && hitTest(x, y, angleBox)) {
      const shape = go.shapes[s.selectedShapeIndex];
      dragState.current = {
        isDragging: false,
        isRotating: false,
        shapeIndex: -1,
        offsetX: 0,
        offsetY: 0,
        isSwipingAngle: true,
        swipeStartX: clientX,
        angleAtSwipeStart: shape.rotation,
      };
      return;
    }

    // Empty area tap - only deselect on double-tap (300ms threshold)
    const now = Date.now();
    const isDoubleTap = (now - lastTapTimeRef.current) < 300;
    lastTapTimeRef.current = now;

    if (isDoubleTap) {
      dispatch({ type: 'DESELECT_SHAPE' });
    }
    // Single tap on empty area = no-op (selection preserved)
  }, [state, gameObjects, dispatch, submit, getCanvasCoords]);

  const handlePointerMove = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasCoords(clientX, clientY);
    const go = gameObjects.current;
    const ds = dragState.current;
    const canvas = canvasRef.current;

    if (ds.isDragging && ds.shapeIndex >= 0) {
      const shape = go.shapes[ds.shapeIndex];
      shape.x = x - ds.offsetX;
      shape.y = y - ds.offsetY;
      shape.hasBeenMoved = true;
      shape.clampToCanvas(canvas.width, canvas.height, go.basketLineY);
      updateCanSubmit(go, dispatch, state);
    }

    if (ds.isRotating && ds.shapeIndex >= 0) {
      const shape = go.shapes[ds.shapeIndex];
      const center = shape.getCenter();
      const newRotation = Math.atan2(y - center.y, x - center.x) + Math.PI / 2;

      // Only apply rotation if it doesn't cause overlap (5px gap)
      if (!shape.wouldOverlapAtRotation(newRotation, go.shapes, 5)) {
        shape.rotation = newRotation;
      }
      // If overlap would occur, rotation stays at last valid angle
    }

    if (ds.isSwipingAngle && state.selectedShapeIndex >= 0) {
      const shape = go.shapes[state.selectedShapeIndex];
      const delta = (clientX - ds.swipeStartX) * LAYOUT.degreeSwipeSensitivity;
      const newRotation = ds.angleAtSwipeStart + delta * Math.PI / 180;

      // Only apply rotation if it doesn't cause overlap (5px gap)
      if (!shape.wouldOverlapAtRotation(newRotation, go.shapes, 5)) {
        shape.rotation = newRotation;
      }
    }
  }, [state, gameObjects, dispatch, getCanvasCoords]);

  const handlePointerUp = useCallback(() => {
    const ds = dragState.current;
    const go = gameObjects.current;

    // Check for overlap on drag release and snap back if invalid
    if (ds.isDragging && ds.shapeIndex >= 0) {
      const shape = go.shapes[ds.shapeIndex];
      if (shape.hasOverlap(go.shapes, 5)) {
        // Invalid position - snap back to drag start
        shape.returnToDragStart();
        // TODO: Add shake animation for visual feedback
      }
      updateCanSubmit(go, dispatch, state);
    }

    dragState.current = {
      isDragging: false,
      isRotating: false,
      shapeIndex: -1,
      offsetX: 0,
      offsetY: 0,
      isSwipingAngle: false,
      swipeStartX: 0,
      angleAtSwipeStart: 0,
    };
  }, [gameObjects, dispatch, state]);

  // ========================================
  // RENDER
  // ========================================
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: width + 'px',
        height: height + 'px',
        display: 'block',
        touchAction: 'none',
      }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={(e) => { e.preventDefault(); handlePointerDown(e); }}
      onTouchMove={(e) => { e.preventDefault(); handlePointerMove(e); }}
      onTouchEnd={(e) => { e.preventDefault(); handlePointerUp(); }}
      onTouchCancel={handlePointerUp}
    />
  );
}

// ========================================
// HELPER DRAWING FUNCTIONS
// ========================================

function drawLivesPill(ctx, state, go, T, L) {
  const x = L.movesBoxX, y = L.movesBoxY;
  const livesRatio = state.lives / state.initialLives;
  let pillStart, pillEnd, textColor;

  if (livesRatio > 0.6) {
    pillStart = T.movesGoodStart; pillEnd = T.movesGoodEnd; textColor = T.movesGoodText;
  } else if (livesRatio > 0.2) {
    pillStart = T.movesWarnStart; pillEnd = T.movesWarnEnd; textColor = T.movesWarnText;
  } else {
    pillStart = T.movesLowStart; pillEnd = T.movesLowEnd; textColor = T.movesLowText;
  }

  if (state.lives <= 1 && state.gameState === 'edit') {
    const pulse = 0.5 + Math.sin(go.time * 4) * 0.5;
    ctx.shadowColor = T.movesLowGlow;
    ctx.shadowBlur = 15 * pulse;
  }

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;

  Utils.roundRect(ctx, x, y, L.movesBoxWidth, L.movesBoxHeight, L.boxCornerRadius);
  const grad = ctx.createLinearGradient(x, y, x, y + L.movesBoxHeight);
  grad.addColorStop(0, pillStart);
  grad.addColorStop(1, pillEnd);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  Utils.roundRect(ctx, x, y, L.movesBoxWidth, L.movesBoxHeight, L.boxCornerRadius);
  ctx.stroke();

  ctx.font = `700 ${L.movesLabelFontSize}px Nunito, sans-serif`;
  ctx.fillStyle = textColor;
  ctx.globalAlpha = 0.8;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LIVES', x + L.movesBoxWidth / 2, y + 15);
  ctx.globalAlpha = 1;

  ctx.font = `900 ${L.movesNumberFontSize + 6}px Nunito, sans-serif`;
  ctx.fillStyle = textColor;
  ctx.fillText(state.lives, x + L.movesBoxWidth / 2, y + 38);
}

function drawSpecsBox(ctx, canvasW, state, T, L) {
  const x = canvasW - L.specsBoxMarginRight - L.specsBoxWidth;
  const y = L.specsBoxY;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;

  Utils.roundRect(ctx, x, y, L.specsBoxWidth, L.specsBoxHeight, L.boxCornerRadius);
  const grad = ctx.createLinearGradient(x, y, x, y + L.specsBoxHeight);
  grad.addColorStop(0, T.specsPillStart);
  grad.addColorStop(1, T.specsPillEnd);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  Utils.roundRect(ctx, x, y, L.specsBoxWidth, L.specsBoxHeight, L.boxCornerRadius);
  ctx.stroke();

  ctx.font = `600 ${L.specsFontSize}px Nunito, sans-serif`;
  ctx.textAlign = 'center';

  ctx.fillStyle = GRAVITY_PRESETS[state.gravityLevel].color;
  ctx.fillText(`${state.gravityLevel} Gravity`, x + L.specsBoxWidth / 2, y + 20);

  ctx.fillStyle = REBOUND_PRESETS[state.reboundLevel].color;
  ctx.fillText(`${state.reboundLevel} Rebound`, x + L.specsBoxWidth / 2, y + 38);
}

function drawBottomControls(ctx, w, h, state, go, T, L) {
  const bottomPanelGrad = ctx.createLinearGradient(0, go.bottomControlsY, 0, go.bottomControlsY + L.bottomControlsHeight);
  bottomPanelGrad.addColorStop(0, T.panelBottomStart);
  bottomPanelGrad.addColorStop(1, T.panelBottomEnd);
  ctx.fillStyle = bottomPanelGrad;
  ctx.fillRect(0, go.bottomControlsY, w, L.bottomControlsHeight);

  ctx.fillStyle = T.panelBottomStroke;
  ctx.fillRect(0, go.bottomControlsY, w, 1);

  // Angle box
  const angleBox = {
    x: L.controlBoxMargin,
    y: go.bottomControlsY + L.bottomControlsPadding,
    w: (w - L.controlBoxMargin * 2 - L.controlBoxGap) / 2,
    h: L.controlBoxHeight,
  };

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  Utils.roundRect(ctx, angleBox.x, angleBox.y, angleBox.w, angleBox.h, L.controlCornerRadius);

  if (state.selectedShapeIndex >= 0 && state.allShapesPlaced) {
    const shape = go.shapes[state.selectedShapeIndex];
    const agGrad = ctx.createLinearGradient(angleBox.x, angleBox.y, angleBox.x, angleBox.y + angleBox.h);
    agGrad.addColorStop(0, T.angleChipActiveStart);
    agGrad.addColorStop(1, T.angleChipActiveEnd);
    ctx.fillStyle = agGrad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = T.angleChipActiveStroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    let angleDeg = (shape.rotation * 180 / Math.PI) % 360;
    if (angleDeg < 0) angleDeg += 360;
    if (angleDeg > 180) angleDeg -= 360;
    angleDeg = Math.round(angleDeg * 10) / 10;
    const sign = angleDeg >= 0 ? '+' : '';

    ctx.font = `700 ${L.controlBoxFontSize}px Nunito, sans-serif`;
    ctx.fillStyle = T.angleChipActiveText || T.secondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${sign}${angleDeg}\u00B0`, angleBox.x + angleBox.w / 2, angleBox.y + angleBox.h / 2 - 6);

    drawBidirectionalArrow(ctx, angleBox.x + angleBox.w / 2, angleBox.y + angleBox.h / 2 + 10, 20, T.angleChipActiveText || T.secondary, 1);
  } else {
    const agGrad = ctx.createLinearGradient(angleBox.x, angleBox.y, angleBox.x, angleBox.y + angleBox.h);
    agGrad.addColorStop(0, T.angleChipStart);
    agGrad.addColorStop(1, T.angleChipEnd);
    ctx.fillStyle = agGrad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = T.angleChipStroke;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `600 ${L.controlBoxFontSize - 2}px Nunito, sans-serif`;
    ctx.fillStyle = T.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Angle Adjust', angleBox.x + angleBox.w / 2, angleBox.y + angleBox.h / 2 - 5);

    ctx.globalAlpha = 0.7;
    drawBidirectionalArrow(ctx, angleBox.x + angleBox.w / 2, angleBox.y + angleBox.h / 2 + 12, 32, T.textSecondary, 1.5);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Submit button
  const submitBox = {
    x: angleBox.x + angleBox.w + L.controlBoxGap,
    y: angleBox.y,
    w: angleBox.w,
    h: L.controlBoxHeight,
  };
  let submitScale = go.submitPopScale;

  ctx.save();
  ctx.translate(submitBox.x + submitBox.w / 2, submitBox.y + submitBox.h / 2);
  ctx.scale(submitScale, submitScale);
  ctx.translate(-(submitBox.x + submitBox.w / 2), -(submitBox.y + submitBox.h / 2));

  if (state.canSubmit && go.submitButtonGlow > 0) {
    const pulse = 0.6 + Math.sin(go.time * ANIM.glowPulseSpeed * Math.PI) * 0.4;
    ctx.shadowColor = T.submitGlow;
    ctx.shadowBlur = 22 * go.submitButtonGlow * pulse;
  }

  Utils.roundRect(ctx, submitBox.x, submitBox.y, submitBox.w, submitBox.h, L.controlCornerRadius);

  if (state.canSubmit) {
    const btnGrad = ctx.createLinearGradient(submitBox.x, submitBox.y, submitBox.x, submitBox.y + submitBox.h);
    btnGrad.addColorStop(0, T.submitStart);
    btnGrad.addColorStop(1, T.submitEnd);
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    Utils.roundRect(ctx, submitBox.x + 1, submitBox.y + 1, submitBox.w - 2, submitBox.h - 2, L.controlCornerRadius - 1);
    ctx.stroke();
    ctx.font = `700 ${L.controlBoxFontSize}px Nunito, sans-serif`;
    ctx.fillStyle = T.textOnPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUBMIT', submitBox.x + submitBox.w / 2, submitBox.y + submitBox.h / 2);
  } else {
    const dGrad = ctx.createLinearGradient(submitBox.x, submitBox.y, submitBox.x, submitBox.y + submitBox.h);
    dGrad.addColorStop(0, T.submitDisabledStart);
    dGrad.addColorStop(1, T.submitDisabledEnd);
    ctx.fillStyle = dGrad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = `700 ${L.controlBoxFontSize}px Nunito, sans-serif`;
    ctx.fillStyle = T.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUBMIT', submitBox.x + submitBox.w / 2, submitBox.y + submitBox.h / 2);
  }
  ctx.restore();
}

function drawPowerupArea(ctx, w, h, state, T, L, powerupY) {
  const powerupPanelGrad = ctx.createLinearGradient(0, powerupY, 0, powerupY + L.powerupAreaHeight);
  powerupPanelGrad.addColorStop(0, T.panelPowerupStart);
  powerupPanelGrad.addColorStop(1, T.panelPowerupEnd);
  ctx.fillStyle = powerupPanelGrad;
  ctx.fillRect(0, powerupY, w, L.powerupAreaHeight);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, powerupY, w, 1);

  const btnSize = L.powerupButtonSize;
  const btnY = powerupY + (L.powerupAreaHeight - btnSize) / 2;
  const spacing = (w - btnSize * 3) / 4;

  const buttons = [
    { label: 'T', count: state.trajectoryCount, used: state.tUsedThisLevel, start: T.powerup1Start, end: T.powerup1End, stroke: T.powerup1Stroke },
    { label: 'R', count: state.removeCount, used: state.rUsedThisLevel, start: T.powerup2Start, end: T.powerup2End, stroke: T.powerup2Stroke },
    { label: 'E', count: state.widenCount, used: state.eUsedThisLevel, start: T.powerup3Start, end: T.powerup3End, stroke: T.powerup3Stroke },
  ];

  buttons.forEach((btn, i) => {
    const bx = spacing + i * (btnSize + spacing);

    Utils.roundRect(ctx, bx, btnY, btnSize, btnSize, L.boxCornerRadius);
    const grad = ctx.createLinearGradient(bx, btnY, bx, btnY + btnSize);
    grad.addColorStop(0, btn.start);
    grad.addColorStop(1, btn.end);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = btn.stroke;
    ctx.lineWidth = 1.5;
    Utils.roundRect(ctx, bx, btnY, btnSize, btnSize, L.boxCornerRadius);
    ctx.stroke();

    // Draw icon - CENTERED, consistent sizes across all powerups
    const isDisabled = btn.count <= 0;
    const iconColor = isDisabled ? 'rgba(100, 116, 139, 0.5)' : T.textPrimary;
    const centerX = bx + btnSize / 2;
    const centerY = btnY + btnSize / 2;
    const iconCenterY = centerY - 10; // Shift icon up for better spacing from count

    // Consistent icon bounding box: 22x22 for all icons
    const iconSize = 11; // Half-size, so total is 22x22

    ctx.save();
    ctx.translate(centerX, iconCenterY);

    if (btn.label === 'T') {
      // Trajectory icon: SYMMETRIC CURVED PATH with ball and arrow
      ctx.strokeStyle = iconColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([2.5, 2.5]);
      ctx.beginPath();
      // Symmetric parabola centered at origin, fits in iconSize bounds
      ctx.moveTo(-iconSize, 5);
      ctx.quadraticCurveTo(0, -8, iconSize, 5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ball at start of trajectory (left)
      ctx.beginPath();
      ctx.arc(-iconSize, 5, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = iconColor;
      ctx.fill();

      // Arrowhead at end (right)
      ctx.beginPath();
      ctx.moveTo(iconSize + 2, 5);
      ctx.lineTo(iconSize - 2, 1);
      ctx.lineTo(iconSize - 2, 9);
      ctx.closePath();
      ctx.fill();
    } else if (btn.label === 'R') {
      // Hammer icon - SMALLER and CENTERED
      ctx.fillStyle = iconColor;
      ctx.strokeStyle = iconColor;

      // Hammer head (smaller, centered)
      ctx.save();
      ctx.translate(0, -1);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(-6, -4, 12, 8);
      ctx.restore();

      // Handle (shorter, centered)
      ctx.beginPath();
      ctx.moveTo(1, 1);
      ctx.lineTo(7, 7);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (btn.label === 'E') {
      // Expand/Widen icon: CENTERED bidirectional arrow
      ctx.strokeStyle = iconColor;
      ctx.fillStyle = iconColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      // Horizontal line (fits in iconSize bounds)
      ctx.beginPath();
      ctx.moveTo(-iconSize, 0);
      ctx.lineTo(iconSize, 0);
      ctx.stroke();

      // Left arrowhead
      ctx.beginPath();
      ctx.moveTo(-iconSize, 0);
      ctx.lineTo(-iconSize + 5, -4);
      ctx.moveTo(-iconSize, 0);
      ctx.lineTo(-iconSize + 5, 4);
      ctx.stroke();

      // Right arrowhead
      ctx.beginPath();
      ctx.moveTo(iconSize, 0);
      ctx.lineTo(iconSize - 5, -4);
      ctx.moveTo(iconSize, 0);
      ctx.lineTo(iconSize - 5, 4);
      ctx.stroke();
    }

    ctx.restore();

    // Count displayed INSIDE button, below icon
    const countY = centerY + 14;
    const countText = `×${btn.count}`;

    ctx.font = '800 14px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (btn.count > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(countText, centerX, countY);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillText('×0', centerX, countY);
    }
  });
}

function drawBidirectionalArrow(ctx, cx, y, width, color, lineWidth) {
  const hw = width / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(cx - hw + 4, y - 3);
  ctx.lineTo(cx - hw, y);
  ctx.lineTo(cx - hw + 4, y + 3);
  ctx.moveTo(cx - hw, y);
  ctx.lineTo(cx + hw, y);
  ctx.moveTo(cx + hw - 4, y - 3);
  ctx.lineTo(cx + hw, y);
  ctx.lineTo(cx + hw - 4, y + 3);
  ctx.stroke();
}

// ========================================
// HELPERS
// ========================================

function getSubmitBoxBounds(canvas) {
  if (!canvas) return { x: 0, y: 0, w: 0, h: 0 };
  const w = canvas.width;
  const h = canvas.height;
  const L = LAYOUT;
  const bottomControlsY = h - L.powerupAreaHeight - L.bottomControlsHeight;
  const halfW = (w - L.controlBoxMargin * 2 - L.controlBoxGap) / 2;
  return {
    x: L.controlBoxMargin + halfW + L.controlBoxGap,
    y: bottomControlsY + L.bottomControlsPadding,
    w: halfW,
    h: L.controlBoxHeight,
  };
}

function getAngleBoxBounds(canvas) {
  if (!canvas) return { x: 0, y: 0, w: 0, h: 0 };
  const w = canvas.width;
  const h = canvas.height;
  const L = LAYOUT;
  const bottomControlsY = h - L.powerupAreaHeight - L.bottomControlsHeight;
  const halfW = (w - L.controlBoxMargin * 2 - L.controlBoxGap) / 2;
  return {
    x: L.controlBoxMargin,
    y: bottomControlsY + L.bottomControlsPadding,
    w: halfW,
    h: L.controlBoxHeight,
  };
}

function hitTest(x, y, box) {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

function getPowerupButtonHit(canvas, x, y) {
  if (!canvas) return null;
  const w = canvas.width;
  const h = canvas.height;
  const L = LAYOUT;
  const btnSize = L.powerupButtonSize;
  const powerupY = h - L.powerupAreaHeight;
  const btnY = powerupY + (L.powerupAreaHeight - btnSize) / 2;
  const spacing = (w - btnSize * 3) / 4;

  const labels = ['T', 'R', 'E'];
  for (let i = 0; i < 3; i++) {
    const bx = spacing + i * (btnSize + spacing);
    if (x >= bx && x <= bx + btnSize && y >= btnY && y <= btnY + btnSize) {
      return labels[i];
    }
  }
  return null;
}

function drawOneWayTutorial(ctx, w, h, T, tutorialAlpha = 1) {
  ctx.save();
  ctx.globalAlpha = tutorialAlpha;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, w, h);

  const boxW = w * 0.92;
  const boxH = 280;
  const boxX = (w - boxW) / 2;
  const boxY = (h - boxH) / 2;
  const radius = 16;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = T.glassBackgroundSolid || 'rgba(51, 65, 85, 0.95)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, radius);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = T.oneWayHighlight || '#FF00AA';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Title - prominent header style
  ctx.fillStyle = T.oneWayHighlight || '#FF00AA';
  ctx.font = `900 ${48 * SIZE_SCALE}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ONE-WAY BOUNCE', w / 2, boxY + 60);

  // Body text line 1
  const bodyY1 = boxY + 125;
  const bodyY2 = boxY + 170;
  const regularFont = `${30 * SIZE_SCALE}px Nunito, sans-serif`;
  const highlightFont = `900 ${34 * SIZE_SCALE}px Nunito, sans-serif`;

  ctx.fillStyle = T.textSecondary;
  ctx.font = regularFont;
  ctx.textAlign = 'center';
  ctx.fillText('Ball will bounce from only', w / 2, bodyY1);

  // "THIS SIDE" on separate line, highlighted
  ctx.fillStyle = T.oneWayHighlight || '#FF00AA';
  ctx.font = highlightFont;
  ctx.fillText('THIS SIDE', w / 2, bodyY2);

  // Dismiss instruction
  ctx.fillStyle = T.textMuted;
  ctx.font = `${24 * SIZE_SCALE}px Nunito, sans-serif`;
  ctx.fillText('Tap anywhere to continue', w / 2, boxY + boxH - 35);

  ctx.restore();
}

function updateCanSubmit(go, dispatch, state) {
  const allPlaced = go.shapes.filter(s => s.isVisible() && !s.removedByPowerup).every(s => s.hasBeenMoved);
  if (allPlaced !== state.allShapesPlaced) {
    dispatch({ type: 'SET_ALL_SHAPES_PLACED', value: allPlaced });
  }
  const canSubmit = allPlaced && state.lives > 0 && state.gameState === 'edit';
  if (canSubmit !== state.canSubmit) {
    dispatch({ type: 'SET_CAN_SUBMIT', value: canSubmit });
  }
}
