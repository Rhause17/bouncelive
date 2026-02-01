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

    // ===== ONE-WAY TUTORIAL =====
    if (state.tutorialActive) {
      drawOneWayTutorial(ctx, w, h, T);
    }

    // ===== REMOVE MODE OVERLAY =====
    if (state.selectRemoveTargetMode) {
      // Dark tint over everything except powerup area
      const powerupTop = h - LAYOUT.powerupAreaHeight;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, w, powerupTop);

      // Re-draw shapes above tint with pulsing red glow
      const glowPulse = 0.6 + 0.3 * Math.sin(go.time * 4);

      go.shapes.forEach(s => {
        if (!s.isVisible()) return;

        ctx.save();
        ctx.globalAlpha = s.opacity != null ? s.opacity : 1;

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
      ctx.font = `700 ${16 * SIZE_SCALE}px Nunito, sans-serif`;
      ctx.fillStyle = '#f87171';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Tap an object to remove', w / 2, powerupTop - 30);
    }

    // ===== BOTTOM CONTROLS =====
    const powerupY = h - L.powerupAreaHeight;
    const bottomOffset = (L.bottomControlsHeight + L.powerupAreaHeight) * (1 - animEase);

    ctx.save();
    ctx.translate(0, bottomOffset);

    drawBottomControls(ctx, w, h, state, go, T, L);
    drawPowerupArea(ctx, w, h, state, T, L, powerupY);

    ctx.restore();

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

    // Draw icon
    const isDisabled = btn.count <= 0;
    const iconColor = isDisabled ? 'rgba(100, 116, 139, 0.5)' : T.textPrimary;
    const centerX = bx + btnSize / 2;
    const centerY = btnY + btnSize / 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    if (btn.label === 'T') {
      // Trajectory icon: dotted arc + ball + arrowhead
      ctx.strokeStyle = iconColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(-8, 4, 14, -Math.PI * 0.8, -Math.PI * 0.15);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(-8, -6, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = iconColor;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(4, -3);
      ctx.lineTo(4, 3);
      ctx.closePath();
      ctx.fill();
    } else if (btn.label === 'R') {
      // Hammer icon
      ctx.fillStyle = iconColor;
      ctx.strokeStyle = iconColor;
      ctx.lineWidth = 2;

      ctx.save();
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(-10, -5, 12, 10);
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(-2, 2);
      ctx.lineTo(8, 12);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (btn.label === 'E') {
      // Double-sided arrow icon
      ctx.strokeStyle = iconColor;
      ctx.fillStyle = iconColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-5, -5);
      ctx.moveTo(-10, 0);
      ctx.lineTo(-5, 5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(5, -5);
      ctx.moveTo(10, 0);
      ctx.lineTo(5, 5);
      ctx.stroke();
    }

    ctx.restore();

    // Count badge (bottom-right corner)
    const badgeX = bx + btnSize - 8;
    const badgeY2 = btnY + btnSize - 8;
    const badgeRadius = 8;

    ctx.beginPath();
    ctx.arc(badgeX, badgeY2, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = isDisabled ? 'rgba(100, 116, 139, 0.6)' : (
      btn.label === 'T' ? T.secondary :
      btn.label === 'R' ? (T.danger || '#F87171') :
      T.secondary
    );
    ctx.fill();

    ctx.font = '700 10px Nunito, sans-serif';
    ctx.fillStyle = isDisabled ? 'rgba(255, 255, 255, 0.5)' : '#0F172A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.count.toString(), badgeX, badgeY2);
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

function drawOneWayTutorial(ctx, w, h, T) {
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

  ctx.strokeStyle = T.glassBorder || 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Title
  ctx.fillStyle = T.textPrimary;
  ctx.font = `bold ${44 * SIZE_SCALE}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('One-Way Bounce', w / 2, boxY + 65);

  // Body text with highlighted "this side"
  const bodyY = boxY + 130;
  const regularFont = `${32 * SIZE_SCALE}px Nunito, sans-serif`;
  const boldFont = `bold ${32 * SIZE_SCALE}px Nunito, sans-serif`;

  const text1 = 'Ball will bounce from only ';
  const text2 = 'this side';
  const text3 = '.';

  ctx.font = regularFont;
  const text1W = ctx.measureText(text1).width;
  ctx.font = boldFont;
  const text2W = ctx.measureText(text2).width;
  ctx.font = regularFont;
  const text3W = ctx.measureText(text3).width;

  const totalW = text1W + text2W + text3W;
  const startX = (w - totalW) / 2;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = T.textSecondary;
  ctx.font = regularFont;
  ctx.fillText(text1, startX, bodyY);

  ctx.fillStyle = T.oneWayHighlight || '#f97316';
  ctx.font = boldFont;
  ctx.fillText(text2, startX + text1W, bodyY);

  ctx.fillStyle = T.textSecondary;
  ctx.font = regularFont;
  ctx.fillText(text3, startX + text1W + text2W, bodyY);

  // Dismiss instruction
  ctx.fillStyle = T.textMuted;
  ctx.font = `${24 * SIZE_SCALE}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Tap anywhere to continue', w / 2, boxY + boxH - 35);
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
