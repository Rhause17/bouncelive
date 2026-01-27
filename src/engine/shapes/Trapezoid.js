import { PolygonShape } from './PolygonShape.js';
import { SIZE_SCALE, ShapeTypeEnum } from '../constants.js';
import { Utils } from '../utils.js';

export class Trapezoid extends PolygonShape {
  constructor(x, y, topWidth = 40, bottomWidth = 70, height = 50, colorIndex = 0) {
    super(x, y, colorIndex);
    this.topWidth = topWidth * SIZE_SCALE;
    this.bottomWidth = bottomWidth * SIZE_SCALE;
    this.height = height * SIZE_SCALE;
    this.shapeType = ShapeTypeEnum.TRAPEZOID;
  }

  getLocalVertices() {
    const ht = this.topWidth / 2, hb = this.bottomWidth / 2, hh = this.height / 2;
    return [
      { x: -ht, y: -hh },
      { x: ht, y: -hh },
      { x: hb, y: hh },
      { x: -hb, y: hh },
    ];
  }

  containsPoint(px, py) { return this.containsPointConvex(px, py); }

  clampToCanvas(w, h, bottomLimit) {
    const margin = 10, halfSize = Math.max(this.bottomWidth, this.height) / 2 + 10;
    this.x = Utils.clamp(this.x, halfSize + margin, w - halfSize - margin);
    this.y = Utils.clamp(this.y, halfSize + margin, bottomLimit - halfSize - margin);
  }

  draw(ctx, theme) { this.drawPolygon(ctx, theme); }
}
