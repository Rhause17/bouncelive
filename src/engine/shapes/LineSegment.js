import { Shape } from './Shape.js';
import { SIZE_SCALE, ShapeTypeEnum } from '../constants.js';
import { Utils } from '../utils.js';

export class LineSegment extends Shape {
  constructor(x, y, length, angle, colorIndex = 0) {
    super(x, y, colorIndex);
    this.length = length * SIZE_SCALE;
    this.baseAngle = angle;
    this.shapeType = ShapeTypeEnum.LINE;
    this.oneWayEligible = false;
  }

  getEndpoints() {
    const totalAngle = this.baseAngle + this.rotation, halfLen = this.length / 2;
    const dx = Math.cos(totalAngle) * halfLen, dy = Math.sin(totalAngle) * halfLen;
    return { a: { x: this.x - dx, y: this.y - dy }, b: { x: this.x + dx, y: this.y + dy } };
  }

  getSegments() { const e = this.getEndpoints(); return [{ a: e.a, b: e.b }]; }

  getBoundingBox() {
    const e = this.getEndpoints();
    const minX = Math.min(e.a.x, e.b.x);
    const maxX = Math.max(e.a.x, e.b.x);
    const minY = Math.min(e.a.y, e.b.y);
    const maxY = Math.max(e.a.y, e.b.y);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  containsPoint(px, py) {
    return Utils.pointToSegment({ x: px, y: py }, this.getEndpoints().a, this.getEndpoints().b).dist < 15;
  }

  clampToCanvas(w, h, bottomLimit) {
    const margin = 10, halfLen = this.length / 2 + 10;
    this.x = Utils.clamp(this.x, halfLen + margin, w - halfLen - margin);
    this.y = Utils.clamp(this.y, halfLen + margin, bottomLimit - halfLen - margin);
  }

  is2D() { return false; }

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

    const e = this.getEndpoints();

    // Shadow
    ctx.beginPath();
    ctx.moveTo(e.a.x + 2, e.a.y + 3);
    ctx.lineTo(e.b.x + 2, e.b.y + 3);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (this.isSelected) {
      ctx.shadowColor = theme.shapeSelectedGlow;
      ctx.shadowBlur = 20;
    }

    if (this.hitHighlight > 0) {
      ctx.shadowColor = theme.shapeHitHighlight;
      ctx.shadowBlur = 25 * this.hitHighlight;
    }

    ctx.beginPath();
    ctx.moveTo(e.a.x, e.a.y);
    ctx.lineTo(e.b.x, e.b.y);
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = this.isSelected ? 5 : 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;

    [e.a, e.b].forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = colors.stroke;
      ctx.fill();
    });

    this.drawRotateHandle(ctx, theme);
    this.drawHitCheck(ctx, this.x + 20 * SIZE_SCALE, this.y, theme);
    ctx.restore();
  }
}
