import { Shape } from './Shape.js';
import { SIZE_SCALE, ShapeTypeEnum } from '../constants.js';
import { Utils } from '../utils.js';

export class HalfPipe extends Shape {
  constructor(x, y, width = 75, height = 56, wallThickness = 12, colorIndex = 0) {
    super(x, y, colorIndex);
    this.width = width * SIZE_SCALE;
    this.height = height * SIZE_SCALE;
    this.wallThickness = wallThickness * SIZE_SCALE;
    this.shapeType = ShapeTypeEnum.HALF_PIPE;
  }

  getLocalVertices() {
    const hw = this.width / 2, hh = this.height / 2;
    const wt = this.wallThickness;
    return [
      { x: -hw, y: -hh },
      { x: -hw, y: hh },
      { x: hw, y: hh },
      { x: hw, y: -hh },
      { x: hw - wt, y: -hh },
      { x: hw - wt, y: hh - wt },
      { x: -hw + wt, y: hh - wt },
      { x: -hw + wt, y: -hh },
    ];
  }

  getVertices() {
    const local = this.getLocalVertices(), center = { x: this.x, y: this.y };
    return local.map(v => this.rotatePoint({ x: center.x + v.x, y: center.y + v.y }, center, this.rotation));
  }

  getSegments() {
    const v = this.getVertices();
    return [
      { a: v[7], b: v[6] }, // left inner wall
      { a: v[6], b: v[5] }, // bottom inner floor
      { a: v[5], b: v[4] }, // right inner wall
      { a: v[0], b: v[1] }, // left outer
      { a: v[1], b: v[2] }, // bottom outer
      { a: v[2], b: v[3] }, // right outer
      { a: v[0], b: v[7] }, // top-left cap
      { a: v[4], b: v[3] }, // top-right cap
    ];
  }

  containsPoint(px, py) {
    const v = this.getVertices();
    return this._pointInQuad(px, py, v[0], v[1], v[2], v[3]);
  }

  _pointInQuad(px, py, v0, v1, v2, v3) {
    const verts = [v0, v1, v2, v3];
    let inside = false;
    for (let i = 0, j = 3; i < 4; j = i++) {
      const xi = verts[i].x, yi = verts[i].y;
      const xj = verts[j].x, yj = verts[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  clampToCanvas(w, h, bottomLimit) {
    const margin = 10, halfSize = Math.max(this.width, this.height) / 2 + 10;
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
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x + 2, v[i].y + 3);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill('evenodd');

    if (this.isSelected) {
      ctx.shadowColor = theme.shapeSelectedGlow;
      ctx.shadowBlur = 20;
    }

    // U shape with hollow interior
    ctx.beginPath();
    ctx.moveTo(v[0].x, v[0].y);
    ctx.lineTo(v[1].x, v[1].y);
    ctx.lineTo(v[2].x, v[2].y);
    ctx.lineTo(v[3].x, v[3].y);
    ctx.closePath();
    ctx.moveTo(v[7].x, v[7].y);
    ctx.lineTo(v[6].x, v[6].y);
    ctx.lineTo(v[5].x, v[5].y);
    ctx.lineTo(v[4].x, v[4].y);
    ctx.closePath();
    ctx.fillStyle = colors.fill;
    ctx.fill('evenodd');

    if (this.hitHighlight > 0) {
      ctx.shadowColor = theme.shapeHitHighlight;
      ctx.shadowBlur = 25 * this.hitHighlight;
    }

    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = this.isSelected ? 3.5 : 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Stroke each edge separately
    const edges = [
      [v[0], v[1]], [v[1], v[2]], [v[2], v[3]], [v[3], v[4]],
      [v[4], v[5]], [v[5], v[6]], [v[6], v[7]], [v[7], v[0]],
    ];
    for (const [a, b] of edges) {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    ctx.shadowBlur = 0;

    this.drawOneWayHighlight(ctx, theme);
    this.drawRotateHandle(ctx, theme);
    this.drawHitCheck(ctx, this.x, this.y, theme);
    ctx.restore();
  }
}
