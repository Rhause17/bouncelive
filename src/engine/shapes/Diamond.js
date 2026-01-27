import { PolygonShape } from './PolygonShape.js';
import { SIZE_SCALE, ShapeTypeEnum } from '../constants.js';
import { Utils } from '../utils.js';

export class Diamond extends PolygonShape {
  constructor(x, y, width = 50, height = 70, colorIndex = 0) {
    super(x, y, colorIndex);
    this.width = width * SIZE_SCALE;
    this.height = height * SIZE_SCALE;
    this.shapeType = ShapeTypeEnum.DIAMOND;
  }

  getLocalVertices() {
    const hw = this.width / 2, hh = this.height / 2;
    return [
      { x: 0, y: -hh },
      { x: hw, y: 0 },
      { x: 0, y: hh },
      { x: -hw, y: 0 },
    ];
  }

  containsPoint(px, py) { return this.containsPointConvex(px, py); }

  clampToCanvas(w, h, bottomLimit) {
    const margin = 10, halfSize = Math.max(this.width, this.height) / 2 + 10;
    this.x = Utils.clamp(this.x, halfSize + margin, w - halfSize - margin);
    this.y = Utils.clamp(this.y, halfSize + margin, bottomLimit - halfSize - margin);
  }

  draw(ctx, theme) { this.drawPolygon(ctx, theme); }
}
