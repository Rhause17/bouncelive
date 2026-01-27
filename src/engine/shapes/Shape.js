import { SIZE_SCALE, ANIM } from '../constants.js';
import { Utils } from '../utils.js';

export class Shape {
  constructor(x, y, colorIndex = 0) {
    this.x = x; this.y = y; this.startX = x; this.startY = y;
    this.savedX = x; this.savedY = y; this.savedRotation = 0;
    this.rotation = 0;
    this.isDragging = false; this.isRotating = false;
    this.hasBeenHit = false;
    this.hasBeenMoved = false;
    this.dragStartX = x; this.dragStartY = y;
    this.rotateHandleDistance = 35 * SIZE_SCALE;
    this.rotateHandleRadius = 8 * SIZE_SCALE;
    this.colorIndex = colorIndex;
    this.opacity = 1;
    this.isDisappearing = false;
    this.isSelected = false;
    this.removedByPowerup = false;

    // One-way surface support
    this.oneWayEnabled = false;
    this.oneWayFaceIndex = -1;
    this.oneWayAllowedSides = [];

    // Hit feedback
    this.hitScale = 1;
    this.hitHighlight = 0;
  }

  getColors(theme) {
    if (this.isSelected) {
      return {
        fill: theme.shapeSelectedFill,
        stroke: theme.shapeSelected,
        glow: theme.shapeSelectedGlow,
      };
    }
    return {
      fill: theme.shapeFill,
      stroke: theme.shapeStroke,
      glow: theme.shapeGlow,
    };
  }

  getCenter() { return { x: this.x, y: this.y }; }

  getRotateHandlePos() {
    const center = this.getCenter();
    return {
      x: center.x + Math.cos(this.rotation - Math.PI / 2) * this.rotateHandleDistance,
      y: center.y + Math.sin(this.rotation - Math.PI / 2) * this.rotateHandleDistance,
    };
  }

  containsRotateHandle(px, py) {
    const handle = this.getRotateHandlePos();
    return Math.sqrt((px - handle.x) ** 2 + (py - handle.y) ** 2) < this.rotateHandleRadius + 8;
  }

  rotatePoint(point, center, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const dx = point.x - center.x, dy = point.y - center.y;
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
  }

  move(dx, dy, canvasWidth, canvasHeight, bottomLimit) {
    this.x += dx; this.y += dy;
    this.clampToCanvas(canvasWidth, canvasHeight, bottomLimit);
  }

  clampToCanvas(w, h, bottomLimit) {}

  getSegments() { return []; }
  containsPoint(px, py) { return false; }
  is2D() { return true; }

  onHit() {
    this.hitScale = ANIM.shapeHitScale;
    this.hitHighlight = 1;
  }

  drawRotateHandle(ctx, theme) {
    const center = this.getCenter(), handle = this.getRotateHandlePos();
    ctx.beginPath(); ctx.moveTo(center.x, center.y); ctx.lineTo(handle.x, handle.y);
    ctx.strokeStyle = this.isSelected ? theme.shapeSelectedGlow : 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(handle.x, handle.y, this.rotateHandleRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.isSelected ? 'rgba(124, 92, 255, 0.2)' : 'rgba(71, 85, 105, 0.3)';
    ctx.fill();
    ctx.strokeStyle = this.isSelected ? theme.shapeSelectedAccent : theme.textMuted;
    ctx.lineWidth = 2; ctx.stroke();
  }

  drawHitCheck(ctx, x, y, theme) {
    if (this.hasBeenHit) {
      ctx.beginPath();
      ctx.arc(x, y, 7 * SIZE_SCALE, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 7 * SIZE_SCALE);
      grad.addColorStop(0, theme.successLight);
      grad.addColorStop(1, theme.success);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${8 * SIZE_SCALE}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', x, y);
    }
  }

  drawOneWayHighlight(ctx, theme) {
    if (!this.oneWayEnabled) return;

    const segments = this.getSegments();

    let allowedSides = [];
    if (this.oneWayAllowedSides && this.oneWayAllowedSides.length > 0) {
      allowedSides = this.oneWayAllowedSides;
    } else if (this.oneWayFaceIndex >= 0) {
      allowedSides = [this.oneWayFaceIndex];
    }

    if (allowedSides.length === 0) return;

    ctx.strokeStyle = theme.oneWayHighlight;
    ctx.lineWidth = this.isSelected ? 4.5 : 3;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const logicalSideIndex = (seg.sideIndex !== undefined) ? seg.sideIndex : i;

      if (allowedSides.includes(logicalSideIndex)) {
        ctx.beginPath();
        ctx.moveTo(seg.a.x, seg.a.y);
        ctx.lineTo(seg.b.x, seg.b.y);
        ctx.stroke();
      }
    }
  }

  startDisappear() {
    this.isDisappearing = true;
    this.onHit();
  }

  update(dt) {
    if (this.isDisappearing && this.opacity > 0) {
      this.opacity -= dt * 3;
      if (this.opacity < 0) this.opacity = 0;
    }

    if (this.hitScale > 1) {
      this.hitScale += (1 - this.hitScale) * ANIM.shapeHitScaleDecay * dt;
      if (this.hitScale < 1.01) this.hitScale = 1;
    }

    if (this.hitHighlight > 0) {
      this.hitHighlight -= dt / ANIM.shapeHighlightDuration;
      if (this.hitHighlight < 0) this.hitHighlight = 0;
    }
  }

  isVisible() { return this.opacity > 0.01; }

  savePosition() {
    this.savedX = this.x; this.savedY = this.y; this.savedRotation = this.rotation;
  }

  restorePosition() {
    this.x = this.savedX; this.y = this.savedY; this.rotation = this.savedRotation;
    if (!this.removedByPowerup) {
      this.opacity = 1; this.isDisappearing = false; this.hasBeenHit = false;
    }
    this.hitScale = 1; this.hitHighlight = 0;
  }
}
