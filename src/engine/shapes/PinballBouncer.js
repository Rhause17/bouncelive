import { Shape } from './Shape.js';
import { SIZE_SCALE, ShapeTypeEnum, FLIPPER_REST_ANGLE, FLIPPER_PEAK_ANGLE, FLIPPER_SWING_DURATION, FLIPPER_RETURN_DURATION } from '../constants.js';
import { Utils } from '../utils.js';

export class PinballBouncer extends Shape {
  constructor(x, y, direction = 'right', colorIndex = 0) {
    super(x, y, colorIndex);
    this.shapeType = ShapeTypeEnum.PINBALL_BOUNCER;
    this.direction = direction; // 'right' or 'left'

    // Dimensions - trapezoid stadium (pivot end wider than tip)
    this.bodyLength = 90 * SIZE_SCALE;      // Length between cap centers
    this.tipWidth = 21 * SIZE_SCALE;        // Narrow end (tip)
    this.pivotWidth = this.tipWidth * 1.3;  // Wide end (pivot) = 1.3x tip
    this.tipRadius = this.tipWidth / 2;
    this.pivotRadius = this.pivotWidth / 2;
    this.pivotPinRadius = 8 * SIZE_SCALE;  // Larger for visibility

    // Level obstacle properties
    this.isLevelObstacle = true;
    this.draggable = false;
    this.rotatable = false;
    this.mustBeHit = true;
    this.destroyOnHit = false;
    this.showCheckmarkOnHit = true;
    this.oneWayEligible = false;

    // Swing animation state
    this.isSwinging = false;
    this.swingTime = 0;
    // Positive angle = points down-right for 'right' flipper
    this.currentAngle = direction === 'right' ? Math.abs(FLIPPER_REST_ANGLE) : -Math.abs(FLIPPER_REST_ANGLE);
    this.baseRestAngle = direction === 'right' ? Math.abs(FLIPPER_REST_ANGLE) : -Math.abs(FLIPPER_REST_ANGLE);
    this.basePeakAngle = FLIPPER_PEAK_ANGLE;
  }

  triggerSwing() {
    this.isSwinging = true;
    this.swingTime = 0;
  }

  getHitPositionRatio(collisionPoint) {
    // Calculate where ball hit on flipper (0 = pivot, 1 = tip)
    const dx = collisionPoint.x - this.x;
    const dy = collisionPoint.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.bodyLength + this.tipRadius;
    return Math.min(1, Math.max(0, dist / maxDist));
  }

  getSurfaceNormal(collisionPoint) {
    // Get the flipper's current rotation in radians
    const angleRad = this.currentAngle * Math.PI / 180;
    const dirMult = this.direction === 'right' ? 1 : -1;

    // Normal is perpendicular to flipper surface (pointing upward in local coords)
    // For right flipper, normal points up-left when at rest
    return {
      x: -Math.sin(angleRad) * dirMult,
      y: -Math.cos(angleRad)
    };
  }

  update(dt) {
    super.update(dt);

    if (!this.isSwinging) return;

    this.swingTime += dt * 1000; // Convert to ms

    const totalDuration = FLIPPER_SWING_DURATION + FLIPPER_RETURN_DURATION;

    if (this.swingTime >= totalDuration) {
      // Animation complete
      this.isSwinging = false;
      this.currentAngle = this.baseRestAngle;
      return;
    }

    // Use stored base angles (consistent with constructor)
    const restAngle = this.baseRestAngle;
    const peakAngle = this.basePeakAngle;

    if (this.swingTime < FLIPPER_SWING_DURATION) {
      // Upswing phase - easeOutCubic for snappy start, smooth end
      const t = this.swingTime / FLIPPER_SWING_DURATION;
      const eased = 1 - Math.pow(1 - t, 3);
      this.currentAngle = restAngle + (peakAngle - restAngle) * eased;
    } else {
      // Return phase - easeInQuad for gradual start, accelerate to rest
      const t = (this.swingTime - FLIPPER_SWING_DURATION) / FLIPPER_RETURN_DURATION;
      const eased = t * t;
      this.currentAngle = peakAngle + (restAngle - peakAngle) * eased;
    }
  }

  getSegments() {
    const angleRad = this.currentAngle * Math.PI / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const dirMult = this.direction === 'right' ? 1 : -1;

    // Transform local point to world (pivot is at this.x, this.y)
    const toWorld = (lx, ly) => ({
      x: this.x + (lx * cos - ly * sin) * dirMult,
      y: this.y + lx * sin + ly * cos
    });

    const segments = [];
    const bodyLen = this.bodyLength;
    const pivotR = this.pivotRadius;
    const tipR = this.tipRadius;

    // Pivot end cap - 6 segments (wider semicircle)
    const capSegs = 6;
    for (let i = 0; i < capSegs; i++) {
      const a1 = Math.PI / 2 + (i / capSegs) * Math.PI;
      const a2 = Math.PI / 2 + ((i + 1) / capSegs) * Math.PI;
      segments.push({
        a: toWorld(pivotR * Math.cos(a1), pivotR * Math.sin(a1)),
        b: toWorld(pivotR * Math.cos(a2), pivotR * Math.sin(a2)),
        isArc: true,
        arcCenter: { x: this.x, y: this.y },
        arcRadius: pivotR,
        sideIndex: 0
      });
    }

    // Top edge (tapered from pivot to tip)
    segments.push({
      a: toWorld(0, -pivotR),
      b: toWorld(bodyLen, -tipR),
      sideIndex: 1
    });

    // Tip end cap - 6 segments (narrower semicircle)
    for (let i = 0; i < capSegs; i++) {
      const a1 = -Math.PI / 2 + (i / capSegs) * Math.PI;
      const a2 = -Math.PI / 2 + ((i + 1) / capSegs) * Math.PI;
      segments.push({
        a: toWorld(bodyLen + tipR * Math.cos(a1), tipR * Math.sin(a1)),
        b: toWorld(bodyLen + tipR * Math.cos(a2), tipR * Math.sin(a2)),
        isArc: true,
        arcCenter: toWorld(bodyLen, 0),
        arcRadius: tipR,
        sideIndex: 2
      });
    }

    // Bottom edge (tapered from tip to pivot)
    segments.push({
      a: toWorld(bodyLen, tipR),
      b: toWorld(0, pivotR),
      sideIndex: 3
    });

    return segments;
  }

  containsPoint(px, py) {
    // Check if point is inside the flipper shape (trapezoid stadium)
    const angleRad = this.currentAngle * Math.PI / 180;
    const cos = Math.cos(-angleRad);
    const sin = Math.sin(-angleRad);
    const dirMult = this.direction === 'right' ? 1 : -1;

    // Transform to local coords
    const dx = (px - this.x) * dirMult;
    const dy = py - this.y;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;

    // Check pivot cap (left end - wider)
    if (lx <= 0) {
      return Math.sqrt(lx * lx + ly * ly) <= this.pivotRadius;
    }

    // Check tip cap (right end - narrower)
    if (lx >= this.bodyLength) {
      const tipDx = lx - this.bodyLength;
      return Math.sqrt(tipDx * tipDx + ly * ly) <= this.tipRadius;
    }

    // Check body (tapered width)
    const t = lx / this.bodyLength;
    const halfWidthAtX = this.pivotRadius + (this.tipRadius - this.pivotRadius) * t;
    return Math.abs(ly) <= halfWidthAtX;
  }

  getBoundingBox() {
    const segs = this.getSegments();
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const seg of segs) {
      minX = Math.min(minX, seg.a.x, seg.b.x);
      maxX = Math.max(maxX, seg.a.x, seg.b.x);
      minY = Math.min(minY, seg.a.y, seg.b.y);
      maxY = Math.max(maxY, seg.a.y, seg.b.y);
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  clampToCanvas(w, h, bottomLimit) {
    // Level obstacles don't need clamping - they're placed by level design
  }

  draw(ctx, theme) {
    if (!this.isVisible()) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;

    const angleRad = this.currentAngle * Math.PI / 180;
    const dirMult = this.direction === 'right' ? 1 : -1;

    // Hit highlight glow
    if (this.hitHighlight > 0) {
      ctx.shadowColor = theme.shapeHitHighlight;
      ctx.shadowBlur = 20 * this.hitHighlight;
    }

    // Transform to flipper's coordinate system
    ctx.translate(this.x, this.y);
    ctx.rotate(angleRad);
    ctx.scale(dirMult, 1);

    // Draw shadow first
    ctx.save();
    ctx.translate(2, 4);
    this.drawFlipperShape(ctx, 'rgba(0, 0, 0, 0.3)', null);
    ctx.restore();

    // Get fill/stroke colors from theme (like other shapes)
    const colors = this.getColors(theme);

    // Draw flipper body
    this.drawFlipperShape(ctx, colors.fill, colors.stroke);

    // Draw pivot ring (same color as shape outline)
    ctx.beginPath();
    ctx.arc(0, 0, this.pivotPinRadius, 0, Math.PI * 2);
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Draw checkmark if hit (in world space)
    if (this.hasBeenHit && this.showCheckmarkOnHit) {
      this.drawHitCheck(ctx, this.x - 15, this.y - 15, theme);
    }
  }

  drawFlipperShape(ctx, fillStyle, strokeStyle) {
    const bodyLen = this.bodyLength;
    const pivotR = this.pivotRadius;
    const tipR = this.tipRadius;

    ctx.beginPath();

    // Pivot cap (left semicircle - wider)
    ctx.arc(0, 0, pivotR, Math.PI / 2, Math.PI * 1.5);

    // Top edge (tapered)
    ctx.lineTo(bodyLen, -tipR);

    // Tip cap (right semicircle - narrower)
    ctx.arc(bodyLen, 0, tipR, -Math.PI / 2, Math.PI / 2);

    // Bottom edge (tapered)
    ctx.lineTo(0, pivotR);

    ctx.closePath();

    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }

    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Override - flipper doesn't disappear on hit
  startDisappear() {
    // Do nothing - flipper persists after hit
  }
}
