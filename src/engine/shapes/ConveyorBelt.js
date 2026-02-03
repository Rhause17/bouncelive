import { Shape } from './Shape.js';
import { SIZE_SCALE, ShapeTypeEnum, BELT_ARROW_SPEED, BELT_TANGENTIAL_STRENGTH } from '../constants.js';
import { Utils } from '../utils.js';

export class ConveyorBelt extends Shape {
  constructor(x, y, length = 105, width = 40, colorIndex = 0) {
    super(x, y, colorIndex);
    this.length = length * SIZE_SCALE;
    this.width = width * SIZE_SCALE;
    this.capRadius = this.width / 2;
    this.shapeType = ShapeTypeEnum.CONVEYOR_BELT;
    this.beltStrength = BELT_TANGENTIAL_STRENGTH * SIZE_SCALE;
    this.arrowPhase = 0;
    this.oneWayEligible = true;
    this.impactRipples = []; // Orange expanding rings on belt surface hit
  }

  triggerImpactRipple(worldX, worldY) {
    // Max 3 ripples for performance
    if (this.impactRipples.length >= 3) {
      this.impactRipples.shift();
    }
    this.impactRipples.push({
      x: worldX,
      y: worldY,
      progress: 0, // 0 to 1 over 200ms
    });
  }

  getBeltTangent() {
    return {
      x: Math.cos(this.rotation),
      y: Math.sin(this.rotation),
    };
  }

  getSegments() {
    const hw = this.length / 2;
    const hh = this.width / 2;
    const r = this.capRadius;
    const straightHalfLen = hw - r;

    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const cx = this.x, cy = this.y;

    const toWorld = (lx, ly) => ({
      x: cx + lx * cos - ly * sin,
      y: cy + lx * sin + ly * cos,
    });

    const segs = [];

    // Top straight segment (active - belt pushes RIGHT)
    segs.push({
      a: toWorld(-straightHalfLen, -hh),
      b: toWorld(straightHalfLen, -hh),
      isBeltActive: true,
      beltDirection: 1,
      sideIndex: 0,
    });

    // Right cap arc (6 segments, inactive)
    const capSegments = 6;
    for (let i = 0; i < capSegments; i++) {
      const angle1 = -Math.PI / 2 + (i / capSegments) * Math.PI;
      const angle2 = -Math.PI / 2 + ((i + 1) / capSegments) * Math.PI;
      segs.push({
        a: toWorld(straightHalfLen + r * Math.cos(angle1), r * Math.sin(angle1)),
        b: toWorld(straightHalfLen + r * Math.cos(angle2), r * Math.sin(angle2)),
        isBeltActive: false,
        isArc: true,
        arcCenter: toWorld(straightHalfLen, 0),
        arcRadius: r,
        sideIndex: 1,
      });
    }

    // Bottom straight segment (active - belt pushes LEFT)
    segs.push({
      a: toWorld(straightHalfLen, hh),
      b: toWorld(-straightHalfLen, hh),
      isBeltActive: true,
      beltDirection: -1,
      sideIndex: 2,
    });

    // Left cap arc (6 segments, inactive)
    for (let i = 0; i < capSegments; i++) {
      const angle1 = Math.PI / 2 + (i / capSegments) * Math.PI;
      const angle2 = Math.PI / 2 + ((i + 1) / capSegments) * Math.PI;
      segs.push({
        a: toWorld(-straightHalfLen + r * Math.cos(angle1), r * Math.sin(angle1)),
        b: toWorld(-straightHalfLen + r * Math.cos(angle2), r * Math.sin(angle2)),
        isBeltActive: false,
        isArc: true,
        arcCenter: toWorld(-straightHalfLen, 0),
        arcRadius: r,
        sideIndex: 3,
      });
    }

    return segs;
  }

  containsPoint(px, py) {
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    const dx = px - this.x;
    const dy = py - this.y;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;

    const hw = this.length / 2;
    const hh = this.width / 2;
    const r = this.capRadius;
    const straightHalfLen = hw - r;

    // Check rectangular body
    if (Math.abs(lx) <= straightHalfLen && Math.abs(ly) <= hh) {
      return true;
    }

    // Check end caps
    const leftCapDist = Math.sqrt((lx + straightHalfLen) ** 2 + ly ** 2);
    const rightCapDist = Math.sqrt((lx - straightHalfLen) ** 2 + ly ** 2);

    return leftCapDist <= r || rightCapDist <= r;
  }

  getBoundingBox() {
    const hw = this.length / 2;
    const hh = this.width / 2;

    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    // Four corners of the unrotated bounding box
    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const c of corners) {
      const wx = this.x + c.x * cos - c.y * sin;
      const wy = this.y + c.x * sin + c.y * cos;
      minX = Math.min(minX, wx);
      maxX = Math.max(maxX, wx);
      minY = Math.min(minY, wy);
      maxY = Math.max(maxY, wy);
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  clampToCanvas(w, h, bottomLimit) {
    const margin = 10;
    const halfSize = Math.max(this.length, this.width) / 2 + 10;
    this.x = Utils.clamp(this.x, halfSize + margin, w - halfSize - margin);
    this.y = Utils.clamp(this.y, halfSize + margin, bottomLimit - halfSize - margin);
  }

  update(dt) {
    super.update(dt);
    this.arrowPhase += dt * BELT_ARROW_SPEED;
    if (this.arrowPhase > 1000) this.arrowPhase -= 1000;

    // Update impact ripples (200ms duration = progress 0→1 in 0.2s)
    if (this.impactRipples.length > 0) {
      let writeIdx = 0;
      for (let i = 0; i < this.impactRipples.length; i++) {
        const ripple = this.impactRipples[i];
        ripple.progress += dt * 5; // 5 = 1/0.2s
        if (ripple.progress < 1) {
          this.impactRipples[writeIdx++] = ripple;
        }
      }
      this.impactRipples.length = writeIdx;
    }
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

    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const hw = this.length / 2;
    const hh = this.width / 2;
    const r = this.capRadius;
    const straightHalfLen = hw - r;

    // Shadow
    ctx.save();
    ctx.translate(2, 3);
    this.drawBeltShape(ctx, straightHalfLen, hh, r, 'rgba(0, 0, 0, 0.25)');
    ctx.restore();

    // Selection glow
    if (this.isSelected) {
      ctx.shadowColor = theme.shapeSelectedGlow;
      ctx.shadowBlur = 20;
    }

    // Belt body fill - dark metallic blue-gray
    const beltFill = this.isSelected ? colors.fill : 'rgba(60, 70, 90, 0.85)';
    this.drawBeltShape(ctx, straightHalfLen, hh, r, beltFill);

    // 3D Bevel overlay
    this.drawBeltBevel(ctx, straightHalfLen, hh, r);

    // Hit highlight
    if (this.hitHighlight > 0) {
      ctx.shadowColor = theme.shapeHitHighlight;
      ctx.shadowBlur = 25 * this.hitHighlight;
    }

    // Belt outline
    ctx.beginPath();
    ctx.moveTo(-straightHalfLen, -hh);
    ctx.lineTo(straightHalfLen, -hh);
    ctx.arc(straightHalfLen, 0, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-straightHalfLen, hh);
    ctx.arc(-straightHalfLen, 0, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    const beltStroke = this.isSelected ? colors.stroke : 'rgba(100, 110, 130, 1)';
    ctx.strokeStyle = beltStroke;
    ctx.lineWidth = this.isSelected ? 3.5 : 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Animated arrows
    this.drawBeltArrows(ctx, straightHalfLen, hh);

    ctx.restore();

    ctx.restore();

    // Draw impact ripples in world space (after shape transform restored)
    this.drawImpactRipples(ctx);

    // Draw rotate handle and hit check in world space
    ctx.save();
    ctx.globalAlpha = this.opacity;
    this.drawRotateHandle(ctx, theme);
    this.drawHitCheck(ctx, this.x, this.y, theme);
    ctx.restore();
  }

  drawImpactRipples(ctx) {
    if (this.impactRipples.length === 0) return;

    for (const ripple of this.impactRipples) {
      // 5px → 25px radius over progress 0→1
      const radius = 5 + ripple.progress * 20;
      const alpha = (1 - ripple.progress) * 0.8;

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 107, 0, ${alpha})`; // #FF6B00 orange
      ctx.lineWidth = 2.5 * (1 - ripple.progress * 0.5);
      ctx.stroke();
    }
  }

  drawBeltShape(ctx, straightHalfLen, hh, r, fillColor) {
    ctx.beginPath();
    ctx.moveTo(-straightHalfLen, -hh);
    ctx.lineTo(straightHalfLen, -hh);
    ctx.arc(straightHalfLen, 0, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-straightHalfLen, hh);
    ctx.arc(-straightHalfLen, 0, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  drawBeltBevel(ctx, straightHalfLen, hh, r) {
    const gradient = ctx.createLinearGradient(-straightHalfLen, -hh, straightHalfLen, hh);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.08)');

    ctx.beginPath();
    ctx.moveTo(-straightHalfLen, -hh);
    ctx.lineTo(straightHalfLen, -hh);
    ctx.arc(straightHalfLen, 0, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-straightHalfLen, hh);
    ctx.arc(-straightHalfLen, 0, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  drawBeltArrows(ctx, straightHalfLen, hh) {
    const arrowSpacing = 20 * SIZE_SCALE;
    const arrowSize = 6 * SIZE_SCALE;
    const edgePad = arrowSize * 1.5;

    const phase = this.arrowPhase % arrowSpacing;

    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getEdgeAlpha = (x) => {
      const distFromEdge = Math.min(x + straightHalfLen, straightHalfLen - x);
      if (distFromEdge < edgePad) {
        return Math.max(0, distFromEdge / edgePad);
      }
      return 1;
    };

    // Top arrows - moving RIGHT
    const topY = -hh * 0.45;
    const startX = -straightHalfLen - arrowSpacing;
    const endX = straightHalfLen + arrowSpacing;

    for (let x = startX + phase; x < endX; x += arrowSpacing) {
      const alpha = getEdgeAlpha(x);
      if (alpha < 0.01) continue;

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(x - arrowSize, topY - arrowSize * 0.5);
      ctx.lineTo(x + arrowSize * 0.5, topY);
      ctx.lineTo(x - arrowSize, topY + arrowSize * 0.5);
      ctx.stroke();
    }

    // Bottom arrows - moving LEFT
    const bottomY = hh * 0.45;

    for (let x = endX - phase; x > startX; x -= arrowSpacing) {
      const alpha = getEdgeAlpha(x);
      if (alpha < 0.01) continue;

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(x + arrowSize, bottomY - arrowSize * 0.5);
      ctx.lineTo(x - arrowSize * 0.5, bottomY);
      ctx.lineTo(x + arrowSize, bottomY + arrowSize * 0.5);
      ctx.stroke();
    }
  }
}
