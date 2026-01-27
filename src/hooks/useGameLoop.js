import { useRef, useEffect, useCallback } from 'react';
import { ANIM } from '../engine/constants.js';
import { getTheme } from '../engine/themes.js';
import { IS_SAFARI } from '../engine/platform.js';

const THEME = getTheme('arcadeDark');

/**
 * Custom hook for the game's requestAnimationFrame loop.
 * Manages dt calculation, state updates, and physics stepping.
 *
 * Safari optimization: pauses the RAF loop when overlays are shown
 * to prevent GPU compositor stalls.
 */
export function useGameLoop({ gameObjects, state, dispatch, onDraw }) {
  const rafId = useRef(null);
  const lastTimeRef = useRef(0);
  const stateRef = useRef(state);
  const pausedRef = useRef(false);
  const onDrawRef = useRef(onDraw);
  stateRef.current = state;
  onDrawRef.current = onDraw;

  const loop = useCallback((timestamp) => {
    if (pausedRef.current) {
      // Don't schedule next frame while paused
      rafId.current = null;
      return;
    }

    let dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    // Clamp dt to avoid physics spikes after pauses or tab switches
    if (dt <= 0 || dt > 0.05) dt = 1 / 60;

    const s = stateRef.current;
    if (s.screen !== 'playing') {
      rafId.current = requestAnimationFrame(loop);
      return;
    }

    const go = gameObjects.current;
    go.time += dt;

    // HUD pop-in animation
    if (go.hudAnimProgress < 1) {
      go.hudAnimProgress = Math.min(1, go.hudAnimProgress + dt * 3);
    }

    // HUD state transition
    if (s.gameState !== go.prevState) {
      go.targetHudOffset = (s.gameState === 'sim') ? ANIM.hudStateOffset : 0;
      go.prevState = s.gameState;
    }
    go.hudStateOffset += (go.targetHudOffset - go.hudStateOffset) * ANIM.hudStateTransitionSpeed * dt;

    // Submit button pop
    const canSubmit = s.canSubmit;
    if (canSubmit && !go.wasCanSubmit) {
      go.submitPopScale = ANIM.submitPopScale;
      go.submitPopTime = ANIM.submitPopDuration;
    }
    go.wasCanSubmit = canSubmit;

    if (go.submitPopTime > 0) {
      go.submitPopTime -= dt;
      const t = go.submitPopTime / ANIM.submitPopDuration;
      go.submitPopScale = 1 + (ANIM.submitPopScale - 1) * t;
    } else {
      go.submitPopScale = 1;
    }

    // Update shapes
    go.shapes.forEach(s => s.update(dt));

    // Update basket animation
    if (go.basket) go.basket.update(dt);

    // Basket widen animation
    if (s.basketWidened && go.basketWidenProgress < 1 && go.basketOriginalRadius) {
      go.basketWidenProgress = Math.min(1, go.basketWidenProgress + dt * 4);
      const eased = 1 - Math.pow(1 - go.basketWidenProgress, 3);
      const targetRadius = go.basketOriginalRadius * 1.30;
      go.basket.radius = go.basketOriginalRadius + (targetRadius - go.basketOriginalRadius) * eased;
    }

    // Update VFX
    go.vfx.update(dt);

    // Replay swoosh
    if (go.replaySwooshTime > 0) go.replaySwooshTime -= dt;

    // Submit glow
    if (canSubmit) {
      go.submitButtonGlow = Math.min(1, go.submitButtonGlow + dt * 3);
    } else {
      go.submitButtonGlow = Math.max(0, go.submitButtonGlow - dt * 3);
    }

    // === SIMULATION STATE ===
    if (s.gameState === 'sim') {
      // Fail watchdog
      if (go.ball.vanishing && !go.failQueued) {
        go.failQueued = true;
        go.failReason = 'ONEWAY';
        go.failStartTime = performance.now();
      }

      if (go.failQueued) {
        const elapsed = performance.now() - go.failStartTime;
        if (go.failReason === 'ONEWAY' && go.ball.vanishing) {
          go.ball.update(dt, 0);
        }
        if (elapsed >= 1000 || go.ball.isVanishComplete()) {
          go.failQueued = false;
          go.failReason = null;
          go.failStartTime = 0;
          dispatch({ type: 'RETURN_TO_EDIT' });
          // Reset ball/shapes for edit
          go.ball.reset(go.ballSpawnX, go.ballUpperLimit);
          go.ball.visible = true;
          go.shapes.forEach(sh => { if (!sh.removedByPowerup) sh.restorePosition(); });
          go.basket.reset();
          go.vfx.reset();
          go.replaySwooshTime = ANIM.swooshDuration;
        }
      } else {
        // Normal physics update
        go.physics.update(go.ball, go.shapes, dt, go.basket);

        // Process collision events for VFX
        for (const event of go.physics.collisionEvents) {
          if (event.isWrongSideHit) {
            go.failQueued = true;
            go.failReason = 'ONEWAY';
            go.failStartTime = performance.now();
            go.ball.startVanish(event.x, event.y);
            go.vfx.spawnCollisionParticles(event.x, event.y, 0, -1, 200, THEME);
            continue;
          }

          go.vfx.spawnCollisionParticles(
            event.x, event.y, event.normalX, event.normalY, event.speed, THEME,
          );

          if (event.speed > ANIM.shakeThreshold) {
            const intensity = Math.min(
              ANIM.shakeIntensity,
              (event.speed - ANIM.shakeThreshold) / 200 * ANIM.shakeIntensity,
            );
            go.vfx.triggerShake(intensity);
          }
        }

        if (!go.failQueued) {
          // Check lid opening
          if (!go.basket.targetLidOpen && go.shapes.every(sh => sh.hasBeenHit || sh.removedByPowerup)) {
            go.basket.openLid();
          }

          // Hide ball if past basket line
          if (go.ball.y > go.basketLineY + 10) {
            go.ball.visible = false;
          }

          // Win check
          if (go.basket.containsBall(go.ball)) {
            go.basket.triggerWinPulse();
            go.vfx.spawnConfetti(go.basket.x, go.basket.y, THEME);
            dispatch({ type: 'WIN' });
          } else if (go.ball.y > go.basketLineY + 200 || go.ball.restTimer > 2 || !go.ball.visible) {
            // Fail - return to edit
            dispatch({ type: 'RETURN_TO_EDIT' });
            go.ball.reset(go.ballSpawnX, go.ballUpperLimit);
            go.ball.visible = true;
            go.shapes.forEach(sh => { if (!sh.removedByPowerup) sh.restorePosition(); });
            go.basket.reset();
            go.vfx.reset();
            go.replaySwooshTime = ANIM.swooshDuration;
          }
        }
      }
    }

    // Draw
    onDrawRef.current(dt);

    rafId.current = requestAnimationFrame(loop);
  }, [gameObjects, dispatch]);

  // Pause/resume RAF when overlays are shown (Safari optimization)
  useEffect(() => {
    const shouldPause = IS_SAFARI && state.screen === 'playing' && state.gameState === 'win';

    if (shouldPause && !pausedRef.current) {
      // Pause: stop scheduling new frames
      pausedRef.current = true;
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    } else if (!shouldPause && pausedRef.current) {
      // Resume: reset time to avoid large dt, restart loop
      pausedRef.current = false;
      lastTimeRef.current = performance.now();
      rafId.current = requestAnimationFrame(loop);
    }
  }, [state.gameState, state.screen, loop]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    rafId.current = requestAnimationFrame(loop);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [loop]);
}
