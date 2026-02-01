import { SIZE_SCALE, ANIM } from './constants.js';
import { Utils } from './utils.js';

/**
 * Ghost simulation for trajectory prediction.
 * Uses exact same physics as runtime to ensure preview matches actual ball behavior.
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

  let hitPoint = null;
  let reboundPoints = [];
  let bounceCount = 0;
  let totalTime = 0;

  const MIN_SAMPLE_DIST = 6;
  let lastSampleX = ghost.x;
  let lastSampleY = ghost.y;

  reboundPoints.push({ x: ghost.x, y: ghost.y, time: 0, kind: 'start' });

  while (totalTime < maxTime && bounceCount < maxBounces) {
    const subDt = dt / substeps;

    for (let sub = 0; sub < substeps; sub++) {
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
            const collPt = { x: collision.closest.x, y: collision.closest.y };

            // Check if collision point is too close to last sample - if so, replace instead of add
            // This prevents tiny "kink" segments at the end of trajectory
            const lastPt = reboundPoints[reboundPoints.length - 1];
            const distToLast = Math.sqrt((collPt.x - lastPt.x) ** 2 + (collPt.y - lastPt.y) ** 2);
            const MIN_ENDPOINT_DIST = MIN_SAMPLE_DIST * 1.5; // 9px threshold

            if (bounceCount === 0) {
              hitPoint = { x: collPt.x, y: collPt.y, isVanish: true };
              if (distToLast < MIN_ENDPOINT_DIST && reboundPoints.length > 1) {
                // Replace last sample with collision point
                reboundPoints[reboundPoints.length - 1] = { x: collPt.x, y: collPt.y, time: totalTime, kind: 'vanish' };
              } else {
                reboundPoints.push({ x: collPt.x, y: collPt.y, time: totalTime, kind: 'vanish' });
              }
              return { hitPoint, reboundPoints, hitShape: true, maxSteps: reboundPoints.length, willVanish: true };
            } else {
              if (distToLast < MIN_ENDPOINT_DIST && reboundPoints.length > 1) {
                reboundPoints[reboundPoints.length - 1] = { x: collPt.x, y: collPt.y, time: totalTime, kind: 'end' };
              } else {
                reboundPoints.push({ x: collPt.x, y: collPt.y, time: totalTime, kind: 'end' });
              }
              return { hitPoint, reboundPoints, hitShape: true, maxSteps: reboundPoints.length, willVanish: false };
            }
          }

          ghost.x += collision.normal.x * collision.penetration;
          ghost.y += collision.normal.y * collision.penetration;

          const reflection = Utils.reflectVelocity(
            { x: ghost.vx, y: ghost.vy }, collision.normal, restitution, friction,
          );

          if (reflection) {
            ghost.vx = reflection.vel.x;
            ghost.vy = reflection.vel.y;

            const collPt = { x: collision.closest.x, y: collision.closest.y };
            if (hitPoint === null) {
              hitPoint = { x: collPt.x, y: collPt.y };
            }

            // Check if collision point is too close to last sample - if so, replace instead of add
            const lastPt = reboundPoints[reboundPoints.length - 1];
            const distToLast = Math.sqrt((collPt.x - lastPt.x) ** 2 + (collPt.y - lastPt.y) ** 2);
            const MIN_ENDPOINT_DIST = MIN_SAMPLE_DIST * 1.5;

            if (distToLast < MIN_ENDPOINT_DIST && reboundPoints.length > 1) {
              reboundPoints[reboundPoints.length - 1] = { x: collPt.x, y: collPt.y, time: totalTime, kind: 'collision' };
            } else {
              reboundPoints.push({ x: collPt.x, y: collPt.y, time: totalTime, kind: 'collision' });
            }

            lastSampleX = collPt.x;
            lastSampleY = collPt.y;
            bounceCount++;
          }
        }
      }

      if (bounceCount === 0 && basket) {
        for (const seg of basket.getSegments()) {
          const collision = Utils.resolveSegmentCollision(
            { x: ghost.x, y: ghost.y }, ghost.radius, seg,
          );
          if (collision) {
            return { hitPoint: null, reboundPoints, hitShape: false, maxSteps: reboundPoints.length };
          }
        }
      }
    }

    totalTime += dt;

    const distFromLast = Math.sqrt((ghost.x - lastSampleX) ** 2 + (ghost.y - lastSampleY) ** 2);
    if (distFromLast >= MIN_SAMPLE_DIST) {
      reboundPoints.push({ x: ghost.x, y: ghost.y, time: totalTime, kind: bounceCount === 0 ? 'pre' : 'post' });
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
    reboundPoints.push({ x: reboundPoints[0].x, y: reboundPoints[0].y + 20, time: 0.1, kind: 'pre' });
  }

  return { hitPoint, reboundPoints, hitShape: bounceCount > 0 || hitPoint !== null, maxSteps: reboundPoints.length };
}

/**
 * Draw trajectory preview on canvas.
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
        // This segment contains the target distance
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

  // Impact marker
  if (trajectory.hitPoint) {
    const pulse = 0.5 + Math.sin(time * ANIM.trajectoryPulseSpeed * Math.PI) * 0.5;

    if (trajectory.willVanish) {
      const size = 10 + pulse * 3;
      ctx.save();
      ctx.translate(trajectory.hitPoint.x, trajectory.hitPoint.y);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = theme.oneWayHighlight;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-size, 0); ctx.lineTo(size, 0);
      ctx.moveTo(0, -size); ctx.lineTo(0, size);
      ctx.stroke();
      ctx.restore();
    } else {
      const outerRadius = 8 + pulse * 4;
      ctx.beginPath();
      ctx.arc(trajectory.hitPoint.x, trajectory.hitPoint.y, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = theme.trajectoryImpactGlow;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.3 + pulse * 0.3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(trajectory.hitPoint.x, trajectory.hitPoint.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = theme.trajectoryImpact;
      ctx.globalAlpha = 0.7;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
