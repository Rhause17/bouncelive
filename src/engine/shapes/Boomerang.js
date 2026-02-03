import { PolygonShape } from './PolygonShape.js';
import { SIZE_SCALE, ShapeTypeEnum } from '../constants.js';
import { Utils } from '../utils.js';

export class Boomerang extends PolygonShape {
  constructor(x, y, armLength = 76, armWidth = 15, angle = 70, colorIndex = 0) {
    super(x, y, colorIndex);
    this.armLength = armLength * SIZE_SCALE;
    this.armWidth = armWidth * SIZE_SCALE;
    this.armAngle = angle * Math.PI / 180;
    this.shapeType = ShapeTypeEnum.BOOMERANG;
  }

  getLocalVertices() {
    const len = this.armLength, w = this.armWidth;
    const halfAngle = this.armAngle / 2;
    return [
      { x: -Math.sin(halfAngle) * len, y: -Math.cos(halfAngle) * len },
      { x: 0, y: -w * 0.5 },
      { x: Math.sin(halfAngle) * len, y: -Math.cos(halfAngle) * len },
      { x: Math.sin(halfAngle) * (len - w), y: -Math.cos(halfAngle) * (len - w) + w * 0.3 },
      { x: 0, y: w * 0.8 },
      { x: -Math.sin(halfAngle) * (len - w), y: -Math.cos(halfAngle) * (len - w) + w * 0.3 },
    ];
  }

  containsPoint(px, py) { return this.containsPointConcave(px, py); }

  clampToCanvas(w, h, bottomLimit) {
    // Use armLength as the max radius (accounts for any rotation)
    const margin = 5;
    const maxRadius = this.armLength;
    this.x = Utils.clamp(this.x, maxRadius + margin, w - maxRadius - margin);
    this.y = Utils.clamp(this.y, maxRadius + margin, bottomLimit - maxRadius - margin);
  }

  draw(ctx, theme) { this.drawPolygon(ctx, theme); }
}
