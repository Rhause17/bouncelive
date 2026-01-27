import { PolygonShape } from './PolygonShape.js';
import { SIZE_SCALE, ShapeTypeEnum } from '../constants.js';
import { Utils } from '../utils.js';

export class SawtoothRamp extends PolygonShape {
  constructor(x, y, width = 70, height = 50, teethCount = 6, colorIndex = 0) {
    super(x, y, colorIndex);
    this.width = width * SIZE_SCALE;
    this.height = height * SIZE_SCALE;
    this.teethCount = teethCount;
    this.toothHeight = 8 * SIZE_SCALE;
    this.shapeType = ShapeTypeEnum.SAWTOOTH_RAMP;
  }

  getLocalVertices() {
    const hw = this.width / 2, hh = this.height / 2;
    const verts = [];

    verts.push({ x: -hw, y: -hh });

    const toothWidth = this.width / this.teethCount;
    for (let i = 0; i < this.teethCount; i++) {
      const baseX = -hw + i * toothWidth;
      verts.push({ x: baseX + toothWidth * 0.5, y: -hh - this.toothHeight });
      if (i < this.teethCount - 1) {
        verts.push({ x: baseX + toothWidth, y: -hh });
      }
    }

    verts.push({ x: hw, y: -hh });
    verts.push({ x: hw, y: hh });
    verts.push({ x: -hw, y: hh });

    return verts;
  }

  getSegments() {
    const v = this.getVertices();
    const segs = [];

    // Side indices:
    // 0 = all teeth segments (top edge)
    // 1 = right edge
    // 2 = bottom edge
    // 3 = left edge
    const teethEndVertex = this.teethCount * 2;

    for (let i = 0; i < v.length; i++) {
      const seg = { a: v[i], b: v[(i + 1) % v.length] };

      if (i < teethEndVertex) {
        seg.sideIndex = 0;
      } else if (i === teethEndVertex) {
        seg.sideIndex = 1;
      } else if (i === teethEndVertex + 1) {
        seg.sideIndex = 2;
      } else {
        seg.sideIndex = 3;
      }

      segs.push(seg);
    }
    return segs;
  }

  containsPoint(px, py) { return this.containsPointConcave(px, py); }

  clampToCanvas(w, h, bottomLimit) {
    const margin = 10, halfSize = Math.max(this.width, this.height) / 2 + this.toothHeight + 10;
    this.x = Utils.clamp(this.x, halfSize + margin, w - halfSize - margin);
    this.y = Utils.clamp(this.y, halfSize + margin, bottomLimit - halfSize - margin);
  }

  draw(ctx, theme) { this.drawPolygon(ctx, theme); }
}
