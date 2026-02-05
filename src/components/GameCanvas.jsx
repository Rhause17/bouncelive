import React, { useRef, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useCanvasSize } from '../hooks/useCanvasSize.js';
import { useGameLoop } from '../hooks/useGameLoop.js';
import { getTheme } from '../engine/themes.js';
import { Utils } from '../engine/utils.js';
import { LAYOUT, ANIM, GRAVITY_PRESETS, REBOUND_PRESETS, SIZE_SCALE, TutorialType } from '../engine/constants.js';
import { predictTrajectory, drawTrajectory } from '../engine/trajectory.js';

const THEME = getTheme('arcadeDark');

export default function GameCanvas() {
  const canvasRef = useRef(null);
  const { state, dispatch, gameObjects, setupLevel, submit, nextLevel, invalidateTrajectory } = useGame();
  const { width, height } = useCanvasSize();
  const patternCanvasRef = useRef(null);
  const lastTapTimeRef = useRef(0); // For double-tap detection
  const levelPassTapRef = useRef({ count: 0, lastTime: 0 }); // Hidden level selector trigger
  const levelSelectorOpenRef = useRef(false); // Level selector panel state
  const gradientCacheRef = useRef({ width: 0, height: 0 }); // Cached gradients for performance

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

  // Cache gradients when canvas size changes (MAJOR performance optimization)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;

    const ctx = canvas.getContext('2d');
    const cache = gradientCacheRef.current;
    const T = THEME;
    const L = LAYOUT;

    // Only rebuild if size changed
    if (cache.width === width && cache.height === height) return;
    cache.width = width;
    cache.height = height;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width * 0.3, height);
    bgGrad.addColorStop(0, T.bgGradientStart);
    bgGrad.addColorStop(0.5, T.bgGradientMid);
    bgGrad.addColorStop(1, T.bgGradientEnd);
    cache.bgGradient = bgGrad;

    // Vignette gradient
    const vignetteGrad = ctx.createRadialGradient(width / 2, height / 2, height * 0.5, width / 2, height / 2, height);
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    cache.vignetteGradient = vignetteGrad;

    // Top panel gradient
    const panelGrad = ctx.createLinearGradient(0, 0, 0, L.levelDataAreaHeight);
    panelGrad.addColorStop(0, T.panelTopStart);
    panelGrad.addColorStop(1, T.panelTopEnd);
    cache.panelGradient = panelGrad;

    // Pattern (create once)
    if (patternCanvasRef.current) {
      cache.pattern = ctx.createPattern(patternCanvasRef.current, 'repeat');
    }
  }, [width, height]);

  // Initialize floating background particles
  useEffect(() => {
    if (width === 0 || height === 0) return;
    const go = gameObjects.current;
    if (go.vfx && go.vfx.floatingParticles.length === 0) {
      go.vfx.initFloatingParticles(width, height, THEME);
    }
  }, [width, height, gameObjects]);

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

    // Background (use cached gradient)
    const cache = gradientCacheRef.current;
    if (cache.bgGradient) {
      ctx.fillStyle = cache.bgGradient;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = T.bgGradientStart;
      ctx.fillRect(0, 0, w, h);
    }

    // Dot pattern (use cached pattern)
    if (cache.pattern) {
      ctx.fillStyle = cache.pattern;
      ctx.fillRect(0, 0, w, h);
    }

    // Vignette (use cached gradient)
    if (cache.vignetteGradient) {
      ctx.fillStyle = cache.vignetteGradient;
      ctx.fillRect(0, 0, w, h);
    }

    // Floating background particles
    go.vfx.drawFloatingParticles(ctx);

    // ===== TOP PANEL =====
    const topOffset = L.levelDataAreaHeight * (1 - animEase) + go.hudStateOffset;
    ctx.save();
    ctx.translate(0, -topOffset);

    // Use cached panel gradient or solid color fallback
    if (cache.panelGradient) {
      ctx.fillStyle = cache.panelGradient;
    } else {
      ctx.fillStyle = T.panelTopStart;
    }
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

    // ===== TRAJECTORY (cached for performance) =====
    if (state.gameState === 'edit' && state.allShapesPlaced) {
      // Only recalculate trajectory when invalidated
      if (!go.trajectoryValid || !go.cachedTrajectory) {
        go.cachedTrajectory = predictTrajectory(
          go.physics, go.shapes, go.basket,
          go.ballSpawnX, go.ballUpperLimit,
          state.trajectoryExtended, w, h,
        );
        go.trajectoryValid = true;
      }
      // Belt flash progress: 1 at start, fades to 0 over 400ms
      const beltFlashProgress = go.beltFlashTimer ? go.beltFlashTimer / 0.4 : 0;
      drawTrajectory(ctx, go.cachedTrajectory, go.time, state.trajectoryExtended, T, beltFlashProgress);
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
    drawPowerupArea(ctx, w, h, state, go, T, L, powerupY);

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
      // Pre-calculate pulse values once (avoid recalculating sin() per shape)
      const sinVal = Math.sin(go.time * 4);
      const glowPulse = 0.6 + 0.3 * sinVal;
      const shadowBlurVal = 18 + 6 * sinVal;
      const shadowColorStr = `rgba(248, 113, 113, ${glowPulse.toFixed(2)})`;

      go.shapes.forEach(s => {
        if (!s.isVisible()) return;
        if (s.isLevelObstacle) return; // Don't highlight level obstacles (flipper)

        ctx.save();
        ctx.globalAlpha = (s.opacity != null ? s.opacity : 1) * go.removeModeAlpha;

        // Pulsing red glow - use pre-calculated values
        ctx.shadowColor = shadowColorStr;
        ctx.shadowBlur = shadowBlurVal;

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

      // Hint text - same size as angle adjust, positioned above bottom controls
      ctx.save();
      ctx.globalAlpha = go.removeModeAlpha;

      // Use controlBoxFontSize to match angle adjust text
      const hintText = 'Tap an object to remove';
      let fontSize = L.controlBoxFontSize;

      // Ensure single line - measure and reduce if needed
      ctx.font = `700 ${fontSize}px Nunito, sans-serif`;
      while (ctx.measureText(hintText).width > w - 40 && fontSize > 12) {
        fontSize -= 1;
        ctx.font = `700 ${fontSize}px Nunito, sans-serif`;
      }

      ctx.fillStyle = '#f87171';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Position slightly above the bottom controls area
      const hintY = go.bottomControlsY - 20;
      ctx.fillText(hintText, w / 2, hintY);
      ctx.restore();
    }

    // ===== TUTORIAL POPUPS (drawn last to cover everything) =====
    if (state.tutorialActive && state.tutorialType) {
      drawTutorial(ctx, w, h, go, T, state.tutorialType);
    }

    // ===== LEVEL SELECTOR PANEL =====
    if (levelSelectorOpenRef.current) {
      drawLevelSelector(ctx, w, h, T, state.level);
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

    // Hidden level selector: tap level display 4 times to open
    const L = LAYOUT;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    // Handle level selector panel clicks
    if (levelSelectorOpenRef.current) {
      const panelW = 280;
      const panelH = 320;
      const panelX = (w - panelW) / 2;
      const panelY = (h - panelH) / 2;

      // Check if click is inside the panel
      if (x >= panelX && x <= panelX + panelW && y >= panelY && y <= panelY + panelH) {
        // Calculate which level button was clicked
        const gridStartX = panelX + 20;
        const gridStartY = panelY + 50;
        const btnSize = 44;
        const gap = 8;
        const cols = 5;

        const col = Math.floor((x - gridStartX) / (btnSize + gap));
        const row = Math.floor((y - gridStartY) / (btnSize + gap));

        if (col >= 0 && col < cols && row >= 0 && row < 4) {
          const levelNum = row * cols + col + 1;
          if (levelNum >= 1 && levelNum <= 20) {
            levelSelectorOpenRef.current = false;
            setupLevel(levelNum, w, h);
            return;
          }
        }
      } else {
        // Click outside panel - close it
        levelSelectorOpenRef.current = false;
        return;
      }
      return;
    }

    const levelDisplayBox = {
      x: L.movesBoxX + L.movesBoxWidth + 10,
      y: L.movesBoxY,
      w: w - L.movesBoxX - L.movesBoxWidth - L.specsBoxWidth - L.specsBoxMarginRight - 20,
      h: L.movesBoxHeight,
    };
    if (y < L.levelDataAreaHeight && x > levelDisplayBox.x && x < levelDisplayBox.x + levelDisplayBox.w) {
      const now = Date.now();
      const tapState = levelPassTapRef.current;
      if (now - tapState.lastTime < 800) {
        tapState.count++;
      } else {
        tapState.count = 1;
      }
      tapState.lastTime = now;
      if (tapState.count >= 4) {
        tapState.count = 0;
        levelSelectorOpenRef.current = true;
        return;
      }
    }

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
        if (shape.isLevelObstacle) continue; // Skip level obstacles (flipper)
        if (shape.containsPoint(x, y)) {
          shape.hasBeenHit = true;
          shape.hasBeenMoved = true;
          shape.removedByPowerup = true;
          shape.startDisappear();
          dispatch({ type: 'REMOVE_SHAPE' });
          invalidateTrajectory(); // Recalculate trajectory after shape removal
          return;
        }
      }
      // Tap outside removable shape (or on level obstacle) cancels
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
      // Set pressed state and spawn ripple
      go.submitPressed = true;
      go.submitRipples.push({
        x: x - submitBox.x,
        y: y - submitBox.y,
        progress: 0,
      });
      submit();
      // Reset pressed state after brief delay
      setTimeout(() => { go.submitPressed = false; }, 150);
      return;
    }

    // Check shape interactions
    for (let i = go.shapes.length - 1; i >= 0; i--) {
      const shape = go.shapes[i];
      if (!shape.isVisible()) continue;

      // Skip level obstacles (not draggable/rotatable)
      if (shape.isLevelObstacle) continue;

      // Check rotate handle first (if rotatable)
      if (shape.rotatable !== false && shape.containsRotateHandle(x, y)) {
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

      // Check drag (if draggable)
      if (shape.draggable !== false && shape.touchAreaContains(x, y)) {
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
      invalidateTrajectory(); // Recalculate trajectory on shape move
    }

    if (ds.isRotating && ds.shapeIndex >= 0) {
      const shape = go.shapes[ds.shapeIndex];
      const center = shape.getCenter();
      const newRotation = Math.atan2(y - center.y, x - center.x) + Math.PI / 2;

      // Only apply rotation if it doesn't cause overlap (5px gap)
      if (!shape.wouldOverlapAtRotation(newRotation, go.shapes, 5)) {
        shape.rotation = newRotation;
        invalidateTrajectory(); // Recalculate trajectory on shape rotate
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
        invalidateTrajectory(); // Recalculate trajectory on angle swipe
      }
    }
  }, [state, gameObjects, dispatch, getCanvasCoords, invalidateTrajectory]);

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
  ctx.fillStyle = pillStart; // Solid color for performance
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
  ctx.fillStyle = T.specsPillStart; // Solid color for performance
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
  ctx.fillStyle = T.panelBottomStart; // Solid color for performance
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
    ctx.fillStyle = T.angleChipActiveStart; // Solid color for performance
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
    ctx.fillStyle = T.angleChipStart; // Solid color for performance
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

  // 3D Press effect: move down and reduce shadow when pressed
  const pressOffset = go.submitPressed ? 2 : 0;

  ctx.save();
  ctx.translate(submitBox.x + submitBox.w / 2, submitBox.y + submitBox.h / 2 + pressOffset);
  ctx.scale(submitScale, submitScale);
  ctx.translate(-(submitBox.x + submitBox.w / 2), -(submitBox.y + submitBox.h / 2));

  // Pulsing glow (no shadowBlur - use outer glow layer)
  if (state.canSubmit && go.submitButtonGlow > 0) {
    const pulse = 0.6 + Math.sin(go.time * ANIM.glowPulseSpeed * Math.PI) * 0.4;
    const glowAlpha = go.submitButtonGlow * pulse * 0.4;

    // Outer glow layer (instead of shadowBlur)
    ctx.globalAlpha = glowAlpha;
    Utils.roundRect(ctx, submitBox.x - 4, submitBox.y - 4, submitBox.w + 8, submitBox.h + 8, L.controlCornerRadius + 4);
    ctx.fillStyle = T.submitGlow;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Shadow (reduced when pressed)
  if (!go.submitPressed) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    Utils.roundRect(ctx, submitBox.x + 2, submitBox.y + 3, submitBox.w, submitBox.h, L.controlCornerRadius);
    ctx.fill();
  }

  Utils.roundRect(ctx, submitBox.x, submitBox.y, submitBox.w, submitBox.h, L.controlCornerRadius);

  if (state.canSubmit) {
    ctx.fillStyle = go.submitPressed ? T.submitEnd : T.submitStart;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    Utils.roundRect(ctx, submitBox.x + 1, submitBox.y + 1, submitBox.w - 2, submitBox.h - 2, L.controlCornerRadius - 1);
    ctx.stroke();

    // Ripple effect
    if (go.submitRipples.length > 0) {
      ctx.save();
      ctx.beginPath();
      Utils.roundRect(ctx, submitBox.x, submitBox.y, submitBox.w, submitBox.h, L.controlCornerRadius);
      ctx.clip();

      for (const ripple of go.submitRipples) {
        const maxRadius = Math.max(submitBox.w, submitBox.h) * 1.5;
        const radius = ripple.progress * maxRadius;
        const alpha = (1 - ripple.progress) * 0.4;

        ctx.beginPath();
        ctx.arc(submitBox.x + ripple.x, submitBox.y + ripple.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.font = `700 ${L.controlBoxFontSize}px Nunito, sans-serif`;
    ctx.fillStyle = T.textOnPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUBMIT', submitBox.x + submitBox.w / 2, submitBox.y + submitBox.h / 2);
  } else {
    ctx.fillStyle = T.submitDisabledStart;
    ctx.fill();
    ctx.font = `700 ${L.controlBoxFontSize}px Nunito, sans-serif`;
    ctx.fillStyle = T.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUBMIT', submitBox.x + submitBox.w / 2, submitBox.y + submitBox.h / 2);
  }
  ctx.restore();
}

function drawPowerupArea(ctx, w, h, state, go, T, L, powerupY) {
  ctx.fillStyle = T.panelPowerupStart; // Solid color for performance
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
    let bx = spacing + i * (btnSize + spacing);
    let by = btnY;

    // Shake effect when count === 1 (low warning)
    if (btn.count === 1) {
      const shakeAmount = Math.sin(go.time * 20) * 2;
      bx += shakeAmount;
    }

    ctx.save();

    // Glow effect when available (count > 0)
    if (btn.count > 0) {
      const glowPulse = 0.3 + Math.sin(go.time * 3) * 0.2;
      ctx.globalAlpha = glowPulse;
      Utils.roundRect(ctx, bx - 3, by - 3, btnSize + 6, btnSize + 6, L.boxCornerRadius + 3);
      ctx.fillStyle = btn.stroke;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    Utils.roundRect(ctx, bx, by, btnSize, btnSize, L.boxCornerRadius);
    ctx.fillStyle = btn.start; // Solid color for performance
    ctx.fill();

    ctx.strokeStyle = btn.stroke;
    ctx.lineWidth = 1.5;
    Utils.roundRect(ctx, bx, by, btnSize, btnSize, L.boxCornerRadius);
    ctx.stroke();

    ctx.restore();

    // Draw icon - CENTERED, consistent sizes across all powerups
    const isDisabled = btn.count <= 0;
    const iconColor = isDisabled ? 'rgba(100, 116, 139, 0.5)' : T.textPrimary;
    const centerX = bx + btnSize / 2;
    const centerY = by + btnSize / 2;
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

// ========================================
// UNIFIED TUTORIAL POPUP SYSTEM
// ========================================

const TUTORIAL_CONFIGS = {
  [TutorialType.ONE_WAY]: {
    title: 'One-Way Bounce',
    borderColor: '#FF00AA',
    boxHeight: 270,
    demoOffsetY: 95,
    bodyOffsetY: 155,
    drawDemo: (ctx, cx, cy, time, T) => {
      // One-way line demo
      const lineLength = 80;
      const lineX = cx - lineLength / 2;

      // Glow effect
      ctx.beginPath();
      ctx.moveTo(lineX, cy);
      ctx.lineTo(lineX + lineLength, cy);
      ctx.strokeStyle = T.oneWayHighlight || '#FF00AA';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.2;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Main line
      ctx.beginPath();
      ctx.moveTo(lineX, cy);
      ctx.lineTo(lineX + lineLength, cy);
      ctx.strokeStyle = T.oneWayHighlight || '#FF00AA';
      ctx.lineWidth = 4;
      ctx.stroke();
    },
    bodyLines: [
      {
        parts: [
          { text: 'Ball will bounce from', color: 'textSecondary' },
        ]
      },
      {
        parts: [
          { text: 'only ', color: 'textSecondary' },
          { text: 'this side', color: '#FF00AA', bold: true },
          { text: '.', color: 'textSecondary' },
        ]
      },
    ],
  },

  [TutorialType.CONVEYOR_BELT]: {
    title: 'Conveyor Belt',
    borderColor: '#FF6B00',
    boxHeight: 270,
    demoOffsetY: 100,
    bodyOffsetY: 160,
    drawDemo: drawMiniConveyor,
    bodyLines: [
      {
        parts: [
          { text: 'Ball gets a ', color: 'textSecondary' },
          { text: 'SIDEWAYS PUSH', color: '#FF6B00', bold: true },
        ]
      },
      { text: 'when bouncing off this belt.', color: 'textSecondary', size: 'normal' },
    ],
  },

  [TutorialType.PINBALL_BOUNCER]: {
    title: 'Pinball Flipper',
    borderColor: '#FFD700',
    boxHeight: 270,
    demoOffsetY: 105,
    bodyOffsetY: 175,
    drawDemo: drawMiniFlipper,
    bodyLines: [
      {
        parts: [
          { text: 'Ball will ', color: 'textSecondary' },
          { text: 'bounce', color: '#FFD700', bold: true },
          { text: ' from the flipper!', color: 'textSecondary' },
        ]
      },
      { text: "You can't move the flipper.", color: 'textMuted', size: 'small' },
    ],
  },
};

function drawTutorial(ctx, w, h, go, T, tutorialType) {
  const config = TUTORIAL_CONFIGS[tutorialType];
  if (!config) return;

  // Entry animation
  const entryDuration = 0.3;
  const entryProgress = Math.min(1, (go.tutorialOpenTime || 0) / entryDuration);
  const easeOut = 1 - Math.pow(1 - entryProgress, 3);

  ctx.save();
  ctx.globalAlpha = easeOut;

  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, w, h);

  // Box dimensions
  const boxW = w * 0.92;
  const boxH = config.boxHeight;
  const boxX = (w - boxW) / 2;
  const boxY = (h - boxH) / 2;

  // Scale animation
  const scale = 0.9 + 0.1 * easeOut;
  ctx.translate(w / 2, h / 2);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);

  // Box shadow & fill
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = T.glassBackgroundSolid || 'rgba(51, 65, 85, 0.95)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 16);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Pulsing border
  const borderPulse = 0.5 + Math.sin(go.time * 4) * 0.3;
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = easeOut * borderPulse;
  ctx.stroke();
  ctx.globalAlpha = easeOut;

  // Title
  ctx.fillStyle = T.textPrimary;
  ctx.font = `bold ${44 * SIZE_SCALE}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.title, w / 2, boxY + 45);

  // Demo (custom per tutorial)
  ctx.save();
  config.drawDemo(ctx, w / 2, boxY + config.demoOffsetY, go.time, T);
  ctx.restore();

  // Body text
  drawTutorialBodyLines(ctx, w, boxY + config.bodyOffsetY, config.bodyLines, T);

  // Tap to continue
  const tapPulse = 0.4 + Math.sin(go.time * 2) * 0.3;
  ctx.globalAlpha = easeOut * tapPulse;
  ctx.fillStyle = T.textMuted;
  ctx.font = `${24 * SIZE_SCALE}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Tap anywhere to continue', w / 2, boxY + boxH - 30);

  ctx.restore();
}

function drawTutorialBodyLines(ctx, w, startY, lines, T) {
  let y = startY;

  for (const line of lines) {
    ctx.textBaseline = 'middle';

    if (line.parts) {
      // Multi-part line with highlights
      let totalWidth = 0;
      for (const part of line.parts) {
        ctx.font = part.bold
          ? `bold ${32 * SIZE_SCALE}px Nunito, sans-serif`
          : `${32 * SIZE_SCALE}px Nunito, sans-serif`;
        totalWidth += ctx.measureText(part.text).width;
      }

      let x = (w - totalWidth) / 2;
      ctx.textAlign = 'left';
      for (const part of line.parts) {
        ctx.font = part.bold
          ? `bold ${32 * SIZE_SCALE}px Nunito, sans-serif`
          : `${32 * SIZE_SCALE}px Nunito, sans-serif`;
        ctx.fillStyle = part.color.startsWith('#') ? part.color : T[part.color];
        ctx.fillText(part.text, x, y);
        x += ctx.measureText(part.text).width;
      }
    } else {
      // Simple single-color line
      const fontSize = line.size === 'small' ? 24 : 32;
      ctx.font = `${fontSize * SIZE_SCALE}px Nunito, sans-serif`;
      ctx.fillStyle = line.color.startsWith('#') ? line.color : T[line.color];
      ctx.textAlign = 'center';
      ctx.fillText(line.text, w / 2, y);
    }

    y += line.size === 'small' ? 28 : 32;
  }
}

function drawMiniConveyor(ctx, cx, cy, time, T) {
  const beltW = 120;
  const beltH = 40;
  const r = beltH / 2;
  const straightHalfLen = beltW / 2 - r;

  ctx.save();
  ctx.translate(cx, cy);

  // Belt body
  ctx.beginPath();
  ctx.moveTo(-straightHalfLen, -beltH / 2);
  ctx.lineTo(straightHalfLen, -beltH / 2);
  ctx.arc(straightHalfLen, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-straightHalfLen, beltH / 2);
  ctx.arc(-straightHalfLen, 0, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(60, 70, 90, 0.85)';
  ctx.fill();

  // 3D Bevel
  const gradient = ctx.createLinearGradient(-straightHalfLen, -beltH / 2, straightHalfLen, beltH / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Belt stroke
  ctx.strokeStyle = 'rgba(100, 110, 130, 1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Animated arrows with edge fade (like real conveyor)
  const arrowSpacing = 18;
  const arrowSize = 5;
  const edgePad = arrowSize * 1.5;
  const phase = (time * 35) % arrowSpacing;

  const getEdgeAlpha = (x) => {
    const distFromEdge = Math.min(x + straightHalfLen, straightHalfLen - x);
    if (distFromEdge < edgePad) {
      return Math.max(0, distFromEdge / edgePad);
    }
    return 1;
  };

  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Top arrows - moving RIGHT
  const topY = -beltH * 0.22;
  const startX = -straightHalfLen - arrowSpacing;
  const endX = straightHalfLen + arrowSpacing;

  for (let x = startX + phase; x < endX; x += arrowSpacing) {
    const alpha = getEdgeAlpha(x);
    if (alpha < 0.01) continue;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(x - arrowSize, topY - arrowSize * 0.5);
    ctx.lineTo(x + arrowSize * 0.5, topY);
    ctx.lineTo(x - arrowSize, topY + arrowSize * 0.5);
    ctx.stroke();
  }

  // Bottom arrows - moving LEFT
  const bottomY = beltH * 0.22;

  for (let x = endX - phase; x > startX; x -= arrowSpacing) {
    const alpha = getEdgeAlpha(x);
    if (alpha < 0.01) continue;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(x + arrowSize, bottomY - arrowSize * 0.5);
    ctx.lineTo(x - arrowSize * 0.5, bottomY);
    ctx.lineTo(x + arrowSize, bottomY + arrowSize * 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMiniFlipper(ctx, cx, cy, time, T) {
  // Static flipper at rest angle (same as board)
  const angle = 30; // Pointing down-right (positive angle)
  const angleRad = angle * Math.PI / 180;

  // Flipper dimensions (scaled to ~70% of actual)
  const bodyLength = 90 * SIZE_SCALE * 0.7;
  const tipWidth = 21 * SIZE_SCALE * 0.7;
  const pivotWidth = tipWidth * 1.3;
  const tipR = tipWidth / 2;
  const pivotR = pivotWidth / 2;
  const pivotPinR = 8 * SIZE_SCALE * 0.7;

  // Get theme colors (same as board shapes)
  const fill = T.shapeFills ? T.shapeFills[0] : 'rgba(148, 163, 184, 0.35)';
  const stroke = T.shapeStrokes ? T.shapeStrokes[0] : 'rgba(100, 116, 139, 1)';

  // Offset pivot to center the flipper visually
  const pivotX = cx - 15;
  const pivotY = cy;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(angleRad);

  // Shadow
  ctx.save();
  ctx.translate(2, 4);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  drawFlipperPath(ctx, bodyLength, tipR, pivotR);
  ctx.fill();
  ctx.restore();

  // Body fill (theme color)
  ctx.fillStyle = fill;
  drawFlipperPath(ctx, bodyLength, tipR, pivotR);
  ctx.fill();

  // Body stroke (theme color)
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pivot ring (same as board)
  ctx.beginPath();
  ctx.arc(0, 0, pivotPinR, 0, Math.PI * 2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawFlipperPath(ctx, edgeLen, narrowR, wideR) {
  ctx.beginPath();
  // Wide end (at pivot)
  ctx.arc(0, 0, wideR, Math.PI / 2, -Math.PI / 2, true);
  // Top edge
  ctx.lineTo(edgeLen, -narrowR);
  // Narrow end (tip)
  ctx.arc(edgeLen, 0, narrowR, -Math.PI / 2, Math.PI / 2);
  // Bottom edge
  ctx.lineTo(0, wideR);
  ctx.closePath();
}

function updateCanSubmit(go, dispatch, state) {
  // Avoid array allocation by using a simple loop
  let allPlaced = true;
  for (let i = 0; i < go.shapes.length; i++) {
    const s = go.shapes[i];
    // Skip level obstacles (like flipper) - they don't need to be moved
    if (s.isLevelObstacle) continue;
    if (s.isVisible() && !s.removedByPowerup && !s.hasBeenMoved) {
      allPlaced = false;
      break;
    }
  }
  if (allPlaced !== state.allShapesPlaced) {
    dispatch({ type: 'SET_ALL_SHAPES_PLACED', value: allPlaced });
  }
  const canSubmit = allPlaced && state.lives > 0 && state.gameState === 'edit';
  if (canSubmit !== state.canSubmit) {
    dispatch({ type: 'SET_CAN_SUBMIT', value: canSubmit });
  }
}

function drawLevelSelector(ctx, w, h, T, currentLevel) {
  const panelW = 280;
  const panelH = 320;
  const panelX = (w - panelW) / 2;
  const panelY = (h - panelH) / 2;

  // Dim background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, w, h);

  // Panel background
  ctx.fillStyle = T.bgPanel;
  ctx.strokeStyle = T.neonCyan;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.stroke();

  // Title
  ctx.fillStyle = T.textPrimary;
  ctx.font = `bold ${18}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Select Level', panelX + panelW / 2, panelY + 28);

  // Level buttons grid (5 columns, 4 rows = 20 levels)
  const gridStartX = panelX + 20;
  const gridStartY = panelY + 50;
  const btnSize = 44;
  const gap = 8;
  const cols = 5;

  for (let i = 0; i < 20; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const levelNum = i + 1;

    const btnX = gridStartX + col * (btnSize + gap);
    const btnY = gridStartY + row * (btnSize + gap);

    // Button background
    const isCurrentLevel = levelNum === currentLevel;
    ctx.fillStyle = isCurrentLevel ? 'rgba(0, 245, 255, 0.3)' : 'rgba(60, 70, 90, 0.8)';
    ctx.strokeStyle = isCurrentLevel ? T.neonCyan : 'rgba(100, 116, 139, 0.5)';
    ctx.lineWidth = isCurrentLevel ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnSize, btnSize, 8);
    ctx.fill();
    ctx.stroke();

    // Level number
    ctx.fillStyle = isCurrentLevel ? T.neonCyan : T.textSecondary;
    ctx.font = `bold ${16}px Nunito, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(levelNum), btnX + btnSize / 2, btnY + btnSize / 2);
  }

  // Hint text
  ctx.fillStyle = T.textMuted;
  ctx.font = `${12}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Tap outside to close', panelX + panelW / 2, panelY + panelH - 15);
}
