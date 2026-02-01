import { SIZE_SCALE, ANIM } from './constants.js';
import { Utils } from './utils.js';

/**
 * Ghost simulation for trajectory prediction.
 * Uses exact same physics as runtime to ensure preview matches actual ball behavior.
 *
 * Key principle: Only sample positions from the simulation - don't try to calculate
 * collision points analytically. This ensures the trajectory matches actual ball behavior.
 */
export function predictTrajectory(physics, shapes, basket, ballSpawnX, ballUpperLimit, trajectoryExtended, canvasWidth, canvasHeight) {
  const ballRadius = 15 * SIZE_SCALE;
  const ghost = { x: ballSpawnX, y: ballUpperLimit, vx: 0, vy: 0, radius: ballRadius };

  const gravity = physics.gravity;
  const restitution = physics.restitution;
  const friction = physics.friction;
  const substeps = physics.substeps;

  const dt = 1 / 60;
  const maxTime = trajectoryExtended ? 2.5 : 1.25;
  const maxBounces = 10;

  let reboundPoints = [];
  let bounceCount = 0;
  let totalTime = 0;
  let willVanish = false;

  const MIN_SAMPLE_DIST = 4; // Smaller for smoother curve
  let lastSampleX = ghost.x;
  let lastSampleY = ghost.y;

  reboundPoints.push({ x: ghost.x, y: ghost.y, time: 0 });

  while (totalTime < maxTime && bounceCount < maxBounces) {
    const subDt = dt / substeps;

    for (let sub = 0; sub < substeps; sub++) {
      // Store position before physics step
      const prevX = ghost.x;
      const prevY = ghost.y;

      ghost.vy += gravity * subDt;
      ghost.x += ghost.vx * subDt;
      ghost.y += ghost.vy * subDt;

      for (const shape of shapes) {
        if (!shape.isVisible()) continue;
        const segments = shape.getSegments();
        for (let segIdx = 0; segIdx < segments.length; segIdx++) {
          const seg = segments[segIdx];
          const collision = Utils.resolveSegmentCollision(
            { x: ghost.x, y: ghost.y }, ghost.radius, seg,
          );
          if (!collision) continue;

          const oneWayResult = Utils.evaluateOneWayCollision(shape, seg, segIdx, collision);

          if (oneWayResult.shouldVanish) {
            // Sample final position before vanishing
            reboundPoints.push({ x: ghost.x, y: ghost.y, time: totalTime });
            willVanish = bounceCount === 0;
            return { hitPoint: null, reboundPoints, hitShape: true, maxSteps: reboundPoints.length, willVanish };
          }

          ghost.x += collision.normal.x * collision.penetration;
          ghost.y += collision.normal.y * collision.penetration;

          const reflection = Utils.reflectVelocity(
            { x: ghost.vx, y: ghost.vy }, collision.normal, restitution, friction,
          );

          if (reflection) {
            ghost.vx = reflection.vel.x;
            ghost.vy = reflection.vel.y;

            // Sample position right after collision (pushed out position)
            const distFromLast = Math.sqrt((ghost.x - lastSampleX) ** 2 + (ghost.y - lastSampleY) ** 2);
            if (distFromLast >= MIN_SAMPLE_DIST / 2) {
              reboundPoints.push({ x: ghost.x, y: ghost.y, time: totalTime });
              lastSampleX = ghost.x;
              lastSampleY = ghost.y;
            }

            bounceCount++;
          }
        }
      }

      // Check basket collision (only before first shape hit)
      if (bounceCount === 0 && basket) {
        for (const seg of basket.getSegments()) {
          const collision = Utils.resolveSegmentCollision(
            { x: ghost.x, y: ghost.y }, ghost.radius, seg,
          );
          if (collision) {
            reboundPoints.push({ x: ghost.x, y: ghost.y, time: totalTime });
            return { hitPoint: null, reboundPoints, hitShape: false, maxSteps: reboundPoints.length };
          }
        }
      }
    }

    totalTime += dt;

    // Regular sampling at fixed distance intervals
    const distFromLast = Math.sqrt((ghost.x - lastSampleX) ** 2 + (ghost.y - lastSampleY) ** 2);
    if (distFromLast >= MIN_SAMPLE_DIST) {
      reboundPoints.push({ x: ghost.x, y: ghost.y, time: totalTime });
      lastSampleX = ghost.x;
      lastSampleY = ghost.y;
    }

    if (!isFinite(ghost.x) || !isFinite(ghost.y) || !isFinite(ghost.vx) || !isFinite(ghost.vy)) break;
    if (ghost.y > canvasHeight + 100 || ghost.x < -50 || ghost.x > canvasWidth + 50) break;
    if (ghost.y > canvasHeight + 50 && bounceCount === 0) {
      return { hitPoint: null, reboundPoints, hitShape: false, maxSteps: reboundPoints.length };
    }
    if (bounceCount >= maxBounces) break;
  }

  if (reboundPoints.length === 1) {
    reboundPoints.push({ x: reboundPoints[0].x, y: reboundPoints[0].y + 20, time: 0.1 });
  }

  return { hitPoint: null, reboundPoints, hitShape: bounceCount > 0, maxSteps: reboundPoints.length };
}

/**
 * Draw trajectory preview on canvas.
 * Uses even dot distribution along the total path length.
 */
export function drawTrajectory(ctx, trajectory, time, trajectoryExtended, theme) {
  if (trajectory.reboundPoints.length < 2) return;

  const points = trajectory.reboundPoints;
  const FADE_START = 0.25;
  const FADE_END = 0.65;
  const MAX_ALPHA = 0.85;

  const smoothstep = (edge0, edge1, x) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };

  const maxTime = trajectoryExtended ? 2.5 : 1.25;
  const getFadeAlpha = (timeProgress) => {
    if (timeProgress < FADE_START) return MAX_ALPHA;
    if (timeProgress > FADE_END) return 0;
    return MAX_ALPHA * smoothstep(FADE_END, FADE_START, timeProgress);
  };

  // Calculate total trajectory length for even dot distribution
  let totalLength = 0;
  const segmentLengths = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i], p2 = points[i + 1];
    const len = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    segmentLengths.push(len);
    totalLength += len;
  }

  // Place dots at fixed intervals along total trajectory length
  const dotSpacing = ANIM.trajectoryDotSpacing;
  const numDots = Math.floor(totalLength / dotSpacing);

  for (let d = 0; d <= numDots; d++) {
    const targetDist = d * dotSpacing;

    // Find which segment this distance falls into
    let accumDist = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const segLen = segmentLengths[i];
      if (accumDist + segLen >= targetDist || i === points.length - 2) {
        const p1 = points[i], p2 = points[i + 1];
        const localDist = targetDist - accumDist;
        const t = segLen > 0 ? Math.min(1, localDist / segLen) : 0;

        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;

        const time1 = p1.time || 0;
        const time2 = p2.time || time1 + 0.01;
        const interpolatedTime = time1 + (time2 - time1) * t;
        const progress = interpolatedTime / maxTime;
        const alpha = getFadeAlpha(progress);

        if (alpha >= 0.01) {
          const size = Math.max(1.5, 3 * (1 - progress * 0.5));
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = theme.trajectoryStart;
          ctx.globalAlpha = alpha;
          ctx.fill();
        }
        break;
      }
      accumDist += segLen;
    }
  }
  ctx.globalAlpha = 1;
}
