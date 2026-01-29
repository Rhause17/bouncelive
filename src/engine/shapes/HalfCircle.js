import { Shape } from './Shape.js';
import { SIZE_SCALE, ShapeTypeEnum } from '../constants.js';
import { Utils } from '../utils.js';

export class HalfCircle extends Shape {
  constructor(x, y, radius = 40, colorIndex = 0) {
    super(x, y, colorIndex);
    this.radius = radius * SIZE_SCALE;
    this.shapeType = ShapeTypeEnum.HALF_CIRCLE;
    this.segments = 12;
    this.oneWayEnabled = false;
  }

  getSegments() {
    const segs = [];
    // Curved segments (active side)
    for (let i = 0; i < this.segments; i++) {
      const a1 = (i / this.segments) * Math.PI + this.rotation;
      const a2 = ((i + 1) / this.segments) * Math.PI + this.rotation;
      segs.push({
        a: { x: this.x + Math.cos(a1) * this.radius, y: this.y + Math.sin(a1) * this.radius },
        b: { x: this.x + Math.cos(a2) * this.radius, y: this.y + Math.sin(a2) * this.radius },
        isActiveSide: true,
        isArc: true,
        arcCenter: { x: this.x, y: this.y },
        arcRadius: this.radius,
      });
    }
    // Flat segment (wrong side in one-way mode)
    const startAngle = this.rotation, endAngle = this.rotation + Math.PI;
    segs.push({
      a: { x: this.x + Math.cos(startAngle) * this.radius, y: this.y + Math.sin(startAngle) * this.radius },
      b: { x: this.x + Math.cos(endAngle) * this.radius, y: this.y + Math.sin(endAngle) * this.radius },
      isActiveSide: false,
    });
    return segs;
  }

  getBoundingBox() {
    // Half circle arc from rotation to rotation + PI
    const startAngle = this.rotation;
    const endAngle = this.rotation + Math.PI;

    // Start with the two endpoints
    const points = [
      { x: this.x + Math.cos(startAngle) * this.radius, y: this.y + Math.sin(startAngle) * this.radius },
      { x: this.x + Math.cos(endAngle) * this.radius, y: this.y + Math.sin(endAngle) * this.radius },
    ];

    // Check if cardinal directions (0, π/2, π, 3π/2) fall within the arc
    // and add those extreme points
    const cardinals = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    for (const angle of cardinals) {
      if (this._isAngleInArc(angle, startAngle, endAngle)) {
        points.push({
          x: this.x + Math.cos(angle) * this.radius,
          y: this.y + Math.sin(angle) * this.radius,
        });
      }
    }

    // Find bounding box from all points
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  _isAngleInArc(angle, start, end) {
    // Normalize angles to [0, 2π)
    const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const a = norm(angle);
    const s = norm(start);
    const e = norm(end);

    if (s <= e) {
      return a >= s && a <= e;
    } else {
      return a >= s || a <= e;
    }
  }

  containsPoint(px, py) {
    const dist = Math.sqrt((px - this.x) ** 2 + (py - this.y) ** 2);
    return dist < this.radius + 12;
  }

  clampToCanvas(w, h, bottomLimit) {
    const margin = 10;
    this.x = Utils.clamp(this.x, this.radius + margin, w - this.radius - margin);
    this.y = Utils.clamp(this.y, this.radius + margin, bottomLimit - this.radius - margin);
  }

  draw(ctx, theme) {
    if (!this.isVisible()) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    const colors = this.getColors(theme);

    if (this.hitScale !== 1) {
      ctx.translate(this.x, this.y);
      ctx.scale(this.hitScale, this.hitScale);
      ctx.translate(-this.x, -this.y);
    }

    // Shadow
    ctx.beginPath();
    ctx.arc(this.x + 2, this.y + 3, this.radius, this.rotation, this.rotation + Math.PI);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    if (this.isSelected) {
      ctx.shadowColor = theme.shapeSelectedGlow;
      ctx.shadowBlur = 20;
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, this.rotation, this.rotation + Math.PI);
    ctx.closePath();
    ctx.fillStyle = colors.fill;
    ctx.fill();

    if (this.hitHighlight > 0) {
      ctx.shadowColor = theme.shapeHitHighlight;
      ctx.shadowBlur = 25 * this.hitHighlight;
    }

    if (this.oneWayEnabled) {
      // Flat side normal stroke
      ctx.beginPath();
      const startAngle = this.rotation, endAngle = this.rotation + Math.PI;
      ctx.moveTo(this.x + Math.cos(startAngle) * this.radius, this.y + Math.sin(startAngle) * this.radius);
      ctx.lineTo(this.x + Math.cos(endAngle) * this.radius, this.y + Math.sin(endAngle) * this.radius);
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = this.isSelected ? 3.5 : 2;
      ctx.stroke();

      // Curved side one-way highlight
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, this.rotation, this.rotation + Math.PI);
      ctx.strokeStyle = theme.oneWayHighlight;
      ctx.lineWidth = this.isSelected ? 4.5 : 3;
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    } else {
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = this.isSelected ? 3.5 : 2;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    this.drawRotateHandle(ctx, theme);
    this.drawHitCheck(ctx, this.x, this.y, theme);
    ctx.restore();
  }
}
