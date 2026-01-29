import { ShapeTypeEnum } from './constants.js';

// ========================================
// VECTOR & COLLISION MATH UTILITIES
// ========================================

export const Utils = {
  dot(a, b) { return a.x * b.x + a.y * b.y; },

  length(v) { return Math.sqrt(v.x * v.x + v.y * v.y); },

  normalize(v) {
    const len = this.length(v);
    return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
  },

  subtract(a, b) { return { x: a.x - b.x, y: a.y - b.y }; },
  add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
  scale(v, s) { return { x: v.x * s, y: v.y * s }; },
  clamp(val, min, max) { return Math.max(min, Math.min(max, val)); },

  pointToSegment(p, a, b) {
    const ab = this.subtract(b, a), ap = this.subtract(p, a);
    const abLen2 = ab.x * ab.x + ab.y * ab.y;
    if (abLen2 === 0) return { dist: this.length(ap), closest: a, t: 0 };
    const t = this.clamp(this.dot(ap, ab) / abLen2, 0, 1);
    const closest = { x: a.x + t * ab.x, y: a.y + t * ab.y };
    return { dist: this.length(this.subtract(p, closest)), closest, t };
  },

  segmentNormal(a, b) {
    const dir = this.subtract(b, a);
    return this.normalize({ x: -dir.y, y: dir.x });
  },

  // ========================================
  // CCD: Swept Circle vs Line Segment
  // ========================================
  sweptCircleSegment(p0, p1, radius, segA, segB) {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const moveLen = Math.sqrt(dx * dx + dy * dy);
    if (moveLen < 0.0001) return null;

    const segDir = this.subtract(segB, segA);
    const segLen = this.length(segDir);
    if (segLen < 0.0001) {
      return this.sweptCirclePoint(p0, p1, radius, segA);
    }

    const segNorm = { x: -segDir.y / segLen, y: segDir.x / segLen };

    const d0 = this.dot(this.subtract(p0, segA), segNorm);
    const d1 = this.dot(this.subtract(p1, segA), segNorm);
    const dDelta = d1 - d0;

    let tLine = null;

    if (Math.abs(dDelta) > 0.0001) {
      const t1 = (radius - d0) / dDelta;
      const t2 = (-radius - d0) / dDelta;

      if (t1 >= 0 && t1 <= 1) {
        tLine = t1;
      }
      if (t2 >= 0 && t2 <= 1 && (tLine === null || t2 < tLine)) {
        tLine = t2;
      }
    }

    let segmentHitT = null;
    if (tLine !== null) {
      const hitX = p0.x + tLine * dx;
      const hitY = p0.y + tLine * dy;
      const projT = this.dot(this.subtract({ x: hitX, y: hitY }, segA), segDir) / (segLen * segLen);
      if (projT >= 0 && projT <= 1) {
        segmentHitT = tLine;
      }
    }

    const tCornerA = this.sweptCirclePoint(p0, p1, radius, segA);
    const tCornerB = this.sweptCirclePoint(p0, p1, radius, segB);

    let bestT = null;
    let hitType = null;
    let hitPoint = null;
    let hitCorner = null;

    if (segmentHitT !== null && (bestT === null || segmentHitT < bestT)) {
      bestT = segmentHitT;
      hitType = 'segment';
      const hitX = p0.x + bestT * dx;
      const hitY = p0.y + bestT * dy;
      const projT = this.dot(this.subtract({ x: hitX, y: hitY }, segA), segDir) / (segLen * segLen);
      hitPoint = { x: segA.x + projT * segDir.x, y: segA.y + projT * segDir.y };
    }

    if (tCornerA !== null && (bestT === null || tCornerA < bestT)) {
      bestT = tCornerA;
      hitType = 'cornerA';
      hitPoint = segA;
      hitCorner = segA;
    }

    if (tCornerB !== null && (bestT === null || tCornerB < bestT)) {
      bestT = tCornerB;
      hitType = 'cornerB';
      hitPoint = segB;
      hitCorner = segB;
    }

    if (bestT === null) return null;

    const contactX = p0.x + bestT * dx;
    const contactY = p0.y + bestT * dy;

    let normal;
    if (hitType === 'segment') {
      normal = { x: segNorm.x, y: segNorm.y };
      const d = this.dot(this.subtract({ x: contactX, y: contactY }, hitPoint), normal);
      if (d < 0) {
        normal = { x: -normal.x, y: -normal.y };
      }
    } else {
      normal = this.normalize(this.subtract({ x: contactX, y: contactY }, hitCorner));
    }

    return { t: bestT, contactX, contactY, hitPoint, normal, hitType, hitCorner };
  },

  // CCD: Swept Circle vs Point
  sweptCirclePoint(p0, p1, radius, point) {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const fx = p0.x - point.x;
    const fy = p0.y - point.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - radius * radius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    const sqrtD = Math.sqrt(discriminant);
    const t1 = (-b - sqrtD) / (2 * a);
    const t2 = (-b + sqrtD) / (2 * a);

    if (t1 >= 0 && t1 <= 1) return t1;
    if (t2 >= 0 && t2 <= 1) return t2;
    return null;
  },

  // CCD: Swept Circle vs Arc
  sweptCircleArc(p0, p1, radius, arcCenter, arcRadius, arcStartAngle, arcEndAngle) {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const fx = p0.x - arcCenter.x;
    const fy = p0.y - arcCenter.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);

    const targetRadius = arcRadius + radius;
    const c = fx * fx + fy * fy - targetRadius * targetRadius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    const sqrtD = Math.sqrt(discriminant);
    const t1 = (-b - sqrtD) / (2 * a);
    const t2 = (-b + sqrtD) / (2 * a);

    const candidates = [];
    for (const t of [t1, t2]) {
      if (t >= 0 && t <= 1) {
        const hitX = p0.x + t * dx;
        const hitY = p0.y + t * dy;
        const angle = Math.atan2(hitY - arcCenter.y, hitX - arcCenter.x);
        if (this.isAngleInArc(angle, arcStartAngle, arcEndAngle)) {
          candidates.push(t);
        }
      }
    }

    if (candidates.length === 0) return null;
    const bestT = Math.min(...candidates);

    const contactX = p0.x + bestT * dx;
    const contactY = p0.y + bestT * dy;
    const normal = this.normalize(this.subtract({ x: contactX, y: contactY }, arcCenter));

    const hitPoint = {
      x: arcCenter.x + normal.x * arcRadius,
      y: arcCenter.y + normal.y * arcRadius,
    };

    return { t: bestT, contactX, contactY, hitPoint, normal, hitType: 'arc' };
  },

  isAngleInArc(angle, startAngle, endAngle) {
    const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const a = norm(angle);
    const s = norm(startAngle);
    const e = norm(endAngle);

    if (s <= e) {
      return a >= s && a <= e;
    } else {
      return a >= s || a <= e;
    }
  },

  // Shared collision resolution
  resolveSegmentCollision(ballPos, ballRadius, seg) {
    const result = this.pointToSegment(ballPos, seg.a, seg.b);
    if (result.dist >= ballRadius) return null;

    const penetration = ballRadius - result.dist;
    let normal;

    // Arc collision: radial normal from circle center
    if (seg.isArc && seg.arcCenter) {
      normal = this.subtract(ballPos, seg.arcCenter);
      const normalLen = this.length(normal);
      if (normalLen < 0.001) {
        normal = this.segmentNormal(seg.a, seg.b);
      } else {
        normal = this.scale(normal, 1 / normalLen);
      }

      return { collided: true, normal, closest: result.closest, penetration, t: result.t, isArc: true };
    }

    // Flat segment collision
    const CORNER_THRESHOLD = 0.05;
    const isCornerA = result.t <= CORNER_THRESHOLD;
    const isCornerB = result.t >= (1 - CORNER_THRESHOLD);

    if (isCornerA || isCornerB) {
      const vertex = isCornerA ? seg.a : seg.b;
      normal = this.subtract(ballPos, vertex);
      const normalLen = this.length(normal);
      if (normalLen < 0.001) {
        normal = this.segmentNormal(seg.a, seg.b);
      } else {
        normal = this.scale(normal, 1 / normalLen);
      }
    } else {
      normal = this.subtract(ballPos, result.closest);
      const normalLen = this.length(normal);
      if (normalLen < 0.001) {
        normal = this.segmentNormal(seg.a, seg.b);
      } else {
        normal = this.scale(normal, 1 / normalLen);
      }
    }

    return { collided: true, normal, closest: result.closest, penetration, t: result.t };
  },

  // Reflect velocity with restitution and friction
  reflectVelocity(vel, normal, restitution, friction) {
    const velDotNormal = this.dot(vel, normal);
    if (velDotNormal >= 0) return null;

    const velNormal = this.scale(normal, velDotNormal);
    const velTangent = this.subtract(vel, velNormal);
    const newVel = this.add(
      this.scale(velNormal, -restitution),
      this.scale(velTangent, friction),
    );
    return { vel: newVel, impactSpeed: Math.abs(velDotNormal) };
  },

  // Shared one-way collision evaluator
  // collision parameter contains { t, ... } where t is position on segment (0-1)
  evaluateOneWayCollision(shape, seg, segIdx, collision = null) {
    const result = {
      isOneWay: false,
      isBounceSide: true,
      shouldVanish: false,
    };

    if (shape.oneWayEligible === false || shape.shapeType === ShapeTypeEnum.LINE) {
      return result;
    }

    if (!shape.oneWayEnabled) {
      return result;
    }

    result.isOneWay = true;

    // Helper to check if a side index is allowed
    const isSideAllowed = (sideIdx, segment) => {
      if (segment && segment.isActiveSide !== undefined) {
        return segment.isActiveSide;
      }
      if (shape.oneWayAllowedSides && shape.oneWayAllowedSides.length > 0) {
        return shape.oneWayAllowedSides.includes(sideIdx);
      }
      if (shape.oneWayFaceIndex >= 0) {
        return sideIdx === shape.oneWayFaceIndex;
      }
      return true; // Default: allowed
    };

    const logicalSideIndex = (seg.sideIndex !== undefined) ? seg.sideIndex : segIdx;

    // Check if this is a corner collision
    const CORNER_THRESHOLD = 0.08; // Slightly larger than physics threshold for safety
    const isCornerA = collision && collision.t <= CORNER_THRESHOLD;
    const isCornerB = collision && collision.t >= (1 - CORNER_THRESHOLD);
    const isCornerCollision = isCornerA || isCornerB;

    if (isCornerCollision) {
      // For corner collisions, check BOTH adjacent segments
      // Corner is safe only if BOTH sides meeting at corner are allowed
      const segments = shape.getSegments();
      const numSegs = segments.length;

      // Find the adjacent segment index
      let adjacentSegIdx;
      if (isCornerA) {
        // Hit corner A (start of this segment) - adjacent is previous segment
        adjacentSegIdx = (segIdx - 1 + numSegs) % numSegs;
      } else {
        // Hit corner B (end of this segment) - adjacent is next segment
        adjacentSegIdx = (segIdx + 1) % numSegs;
      }

      const adjacentSeg = segments[adjacentSegIdx];
      const adjacentLogicalIdx = (adjacentSeg && adjacentSeg.sideIndex !== undefined)
        ? adjacentSeg.sideIndex
        : adjacentSegIdx;

      const currentAllowed = isSideAllowed(logicalSideIndex, seg);
      const adjacentAllowed = isSideAllowed(adjacentLogicalIdx, adjacentSeg);

      // Corner is safe ONLY if both sides are allowed
      result.isBounceSide = currentAllowed && adjacentAllowed;
      result.shouldVanish = !(currentAllowed && adjacentAllowed);
    } else {
      // Normal segment collision (not at corner)
      if (seg.isActiveSide !== undefined) {
        result.isBounceSide = seg.isActiveSide;
        result.shouldVanish = !seg.isActiveSide;
      } else if (shape.oneWayAllowedSides && shape.oneWayAllowedSides.length > 0) {
        const isAllowedSide = shape.oneWayAllowedSides.includes(logicalSideIndex);
        result.isBounceSide = isAllowedSide;
        result.shouldVanish = !isAllowedSide;
      } else if (shape.oneWayFaceIndex >= 0) {
        const isAllowedSide = (logicalSideIndex === shape.oneWayFaceIndex);
        result.isBounceSide = isAllowedSide;
        result.shouldVanish = !isAllowedSide;
      } else {
        result.isOneWay = false;
        result.shouldVanish = false;
      }
    }

    return result;
  },

  roundRect(ctx, x, y, w, h, r) {
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
  },

  randomRange(min, max) {
    return min + Math.random() * (max - min);
  },
};
