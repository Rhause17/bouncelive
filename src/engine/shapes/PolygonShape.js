import { Shape } from './Shape.js';
import { Utils } from '../utils.js';

/**
 * Base class for polygon-based shapes (Diamond, Octagon, Trapezoid, Arrowhead, Boomerang, SawtoothRamp).
 * Provides shared vertex/segment/draw logic to reduce duplication.
 */
export class PolygonShape extends Shape {
  getLocalVertices() { return []; }

  getVertices() {
    const local = this.getLocalVertices();
    const center = { x: this.x, y: this.y };
    return local.map(v => this.rotatePoint(
      { x: center.x + v.x, y: center.y + v.y }, center, this.rotation,
    ));
  }

  getSegments() {
    const v = this.getVertices();
    const segs = [];
    for (let i = 0; i < v.length; i++) {
      segs.push({ a: v[i], b: v[(i + 1) % v.length] });
    }
    return segs;
  }

  // Convex polygon point-in-polygon test (cross product)
  containsPointConvex(px, py) {
    const v = this.getVertices();
    let positive = 0, negative = 0;
    for (let i = 0; i < v.length; i++) {
      const p1 = v[i], p2 = v[(i + 1) % v.length];
      const cross = (px - p1.x) * (p2.y - p1.y) - (py - p1.y) * (p2.x - p1.x);
      if (cross > 0) positive++;
      else if (cross < 0) negative++;
    }
    return positive === 0 || negative === 0;
  }

  // Concave polygon point-in-polygon test (ray casting)
  containsPointConcave(px, py) {
    const v = this.getVertices();
    let inside = false;
    for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
      const xi = v[i].x, yi = v[i].y;
      const xj = v[j].x, yj = v[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  drawPolygon(ctx, theme) {
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
    ctx.fill();

    if (this.isSelected) {
      ctx.shadowColor = theme.shapeSelectedGlow;
      ctx.shadowBlur = 20;
    }

    // Main shape
    ctx.beginPath();
    ctx.moveTo(v[0].x, v[0].y);
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
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
