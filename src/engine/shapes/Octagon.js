import { PolygonShape } from './PolygonShape.js';
import { SIZE_SCALE, ShapeTypeEnum } from '../constants.js';
import { Utils } from '../utils.js';

export class Octagon extends PolygonShape {
  constructor(x, y, radius = 35, colorIndex = 0) {
    super(x, y, colorIndex);
    this.radius = radius * SIZE_SCALE;
    this.shapeType = ShapeTypeEnum.OCTAGON;
  }

  getLocalVertices() {
    const verts = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      verts.push({ x: Math.cos(angle) * this.radius, y: Math.sin(angle) * this.radius });
    }
    return verts;
  }

  containsPoint(px, py) { return this.containsPointConvex(px, py); }

  clampToCanvas(w, h, bottomLimit) {
    const margin = 10;
    this.x = Utils.clamp(this.x, this.radius + margin, w - this.radius - margin);
    this.y = Utils.clamp(this.y, this.radius + margin, bottomLimit - this.radius - margin);
  }

  draw(ctx, theme) { this.drawPolygon(ctx, theme); }
}
