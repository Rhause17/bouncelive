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

          const oneWayResult = Utils.evaluateOneWayCollision(shape, seg, segIdx);

          if (oneWayResult.shouldVanish) {
            const collPt = { x: collision.closest.x, y: collision.closest.y };
            if (bounceCount === 0) {
              hitPoint = { x: collPt.x, y: collPt.y, isVanish: true };
              reboundPoints.push({ x: collPt.x, y: collPt.y, time: totalTime, kind: 'vanish' });
              return { hitPoint, reboundPoints, hitShape: true, maxSteps: reboundPoints.length, willVanish: true };
            } else {
              reboundPoints.push({ x: collPt.x, y: collPt.y, time: totalTime, kind: 'end' });
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
            reboundPoints.push({ x: collPt.x, y: collPt.y, time: totalTime, kind: 'collision' });
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

  // Dots
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i], p2 = points[i + 1];
    const segLength = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const time1 = p1.time || 0;
    const time2 = p2.time || time1 + 0.01;
    const numDots = Math.floor(segLength / ANIM.trajectoryDotSpacing);

    for (let j = 0; j <= numDots; j++) {
      const t = j / Math.max(1, numDots);
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      const interpolatedTime = time1 + (time2 - time1) * t;
      const progress = interpolatedTime / maxTime;
      const alpha = getFadeAlpha(progress);
      if (alpha < 0.01) continue;

      const size = Math.max(1.5, 3 * (1 - progress * 0.5));
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = theme.trajectoryStart;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Direction ticks
  let lastTickDist = 0;
  let accumulatedDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i], p2 = points[i + 1];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const segLength = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const time1 = p1.time || 0;
    const time2 = p2.time || time1 + 0.01;

    let segDist = 0;
    while (segDist < segLength) {
      const distFromStart = accumulatedDist + segDist;
      if (distFromStart - lastTickDist >= ANIM.trajectoryTickSpacing && distFromStart > 20) {
        const t = segDist / segLength;
        const x = p1.x + dx * t;
        const y = p1.y + dy * t;
        const interpolatedTime = time1 + (time2 - time1) * t;
        const progress = interpolatedTime / maxTime;
        const alpha = getFadeAlpha(progress) * 0.7;

        if (alpha >= 0.01) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(ANIM.trajectoryTickSize, 0);
          ctx.lineTo(-ANIM.trajectoryTickSize * 0.5, -ANIM.trajectoryTickSize * 0.6);
          ctx.lineTo(-ANIM.trajectoryTickSize * 0.5, ANIM.trajectoryTickSize * 0.6);
          ctx.closePath();
          ctx.fillStyle = theme.trajectoryTick;
          ctx.globalAlpha = alpha;
          ctx.fill();
          ctx.restore();
        }
        lastTickDist = distFromStart;
      }
      segDist += ANIM.trajectoryTickSpacing;
    }
    accumulatedDist += segLength;
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
