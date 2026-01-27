import { PolygonShape } from './PolygonShape.js';
import { SIZE_SCALE, ShapeTypeEnum } from '../constants.js';
import { Utils } from '../utils.js';

export class Arrowhead extends PolygonShape {
  constructor(x, y, width = 63, height = 75, colorIndex = 0) {
    super(x, y, colorIndex);
    this.width = width * SIZE_SCALE;
    this.height = height * SIZE_SCALE;
    this.shapeType = ShapeTypeEnum.ARROWHEAD;
  }

  getLocalVertices() {
    const hw = this.width / 2, hh = this.height / 2;
    const notchDepth = this.height * 0.35;
    return [
      { x: 0, y: -hh },
      { x: hw, y: hh },
      { x: 0, y: hh - notchDepth },
      { x: -hw, y: hh },
    ];
  }

  getSegments() {
    const v = this.getVertices();
    return [
      { a: v[0], b: v[1] },
      { a: v[1], b: v[2] },
      { a: v[2], b: v[3] },
      { a: v[3], b: v[0] },
    ];
  }

  containsPoint(px, py) { return this.containsPointConcave(px, py); }

  clampToCanvas(w, h, bottomLimit) {
    const margin = 10, halfSize = Math.max(this.width, this.height) / 2 + 10;
    this.x = Utils.clamp(this.x, halfSize + margin, w - halfSize - margin);
    this.y = Utils.clamp(this.y, halfSize + margin, bottomLimit - halfSize - margin);
  }

  draw(ctx, theme) { this.drawPolygon(ctx, theme); }
}
