import { Shape } from './Shape.js';
import { SIZE_SCALE, ShapeTypeEnum } from '../constants.js';
import { Utils } from '../utils.js';

export class Triangle extends Shape {
  constructor(x, y, leg1, leg2, slopeDirection = 'left', colorIndex = 0) {
    super(x, y, colorIndex);
    this.leg1 = leg1 * SIZE_SCALE;
    this.leg2 = leg2 * SIZE_SCALE;
    this.slopeDirection = slopeDirection;
    this.shapeType = slopeDirection === 'left' ? ShapeTypeEnum.TRIANGLE_LEFT : ShapeTypeEnum.TRIANGLE_RIGHT;
  }

  getLocalVertices() {
    const h1 = this.leg1 / 2, h2 = this.leg2 / 2;
    return this.slopeDirection === 'left'
      ? [{ x: -h1, y: h2 }, { x: h1, y: h2 }, { x: -h1, y: -h2 }]
      : [{ x: -h1, y: h2 }, { x: h1, y: h2 }, { x: h1, y: -h2 }];
  }

  getVertices() {
    const local = this.getLocalVertices(), center = { x: this.x, y: this.y };
    return local.map(v => this.rotatePoint({ x: center.x + v.x, y: center.y + v.y }, center, this.rotation));
  }

  getSegments() {
    const v = this.getVertices();
    return [{ a: v[0], b: v[1] }, { a: v[1], b: v[2] }, { a: v[2], b: v[0] }];
  }

  containsPoint(px, py) {
    const v = this.getVertices();
    const sign = (p1x, p1y, p2, p3) => (p1x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1y - p3.y);
    const d1 = sign(px, py, v[0], v[1]), d2 = sign(px, py, v[1], v[2]), d3 = sign(px, py, v[2], v[0]);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  }

  clampToCanvas(w, h, bottomLimit) {
    const margin = 10, halfSize = Math.max(this.leg1, this.leg2) / 2 + 10;
    this.x = Utils.clamp(this.x, halfSize + margin, w - halfSize - margin);
    this.y = Utils.clamp(this.y, halfSize + margin, bottomLimit - halfSize - margin);
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

    const v = this.getVertices();

    // Shadow
    ctx.beginPath();
    ctx.moveTo(v[0].x + 2, v[0].y + 3);
    ctx.lineTo(v[1].x + 2, v[1].y + 3);
    ctx.lineTo(v[2].x + 2, v[2].y + 3);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    if (this.isSelected) {
      ctx.shadowColor = theme.shapeSelectedGlow;
      ctx.shadowBlur = 20;
    }

    ctx.beginPath();
    ctx.moveTo(v[0].x, v[0].y);
    ctx.lineTo(v[1].x, v[1].y);
    ctx.lineTo(v[2].x, v[2].y);
    ctx.closePath();
    ctx.fillStyle = colors.fill;
    ctx.fill();

    if (this.hitHighlight > 0) {
      ctx.shadowColor = theme.shapeHitHighlight;
      ctx.shadowBlur = 25 * this.hitHighlight;
    }

    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = this.isSelected ? 3.5 : 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;

    this.drawOneWayHighlight(ctx, theme);
    this.drawRotateHandle(ctx, theme);
    this.drawHitCheck(ctx, this.x, this.y, theme);
    ctx.restore();
  }
}
