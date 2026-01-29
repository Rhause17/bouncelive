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
    // Position handle at top center of bounding box + 15px above
    const box = this.getBoundingBox();
    const HANDLE_OFFSET = 15;
    return {
      x: box.x + box.width / 2,
      y: box.y - HANDLE_OFFSET,
    };
  }

  containsRotateHandle(px, py) {
    const handle = this.getRotateHandlePos();
    // Handle hit area: visual radius + 8px padding, minimum 18px diameter
    const visualRadius = this.isSelected ? 10 : 6;
    const hitRadius = Math.max(9, visualRadius + 8); // min 18px diameter = 9px radius
    return Math.sqrt((px - handle.x) ** 2 + (py - handle.y) ** 2) < hitRadius;
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

  /**
   * Returns the axis-aligned bounding box (AABB) of the shape.
   * Includes rotation - recalculated from world-space vertices.
   * @returns {{ x: number, y: number, width: number, height: number }}
   */
  getBoundingBox() {
    // Default implementation uses getVertices() if available
    if (typeof this.getVertices === 'function') {
      const vertices = this.getVertices();
      if (vertices.length === 0) {
        return { x: this.x, y: this.y, width: 0, height: 0 };
      }

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      for (const v of vertices) {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
      }

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    // Fallback for shapes without getVertices
    return { x: this.x, y: this.y, width: 0, height: 0 };
  }

  /**
   * Returns bounding box as if shape was at a different position.
   * Useful for overlap checking during drag preview.
   */
  getBoundingBoxAt(newX, newY) {
    const box = this.getBoundingBox();
    const dx = newX - this.x;
    const dy = newY - this.y;
    return {
      x: box.x + dx,
      y: box.y + dy,
      width: box.width,
      height: box.height,
    };
  }

  /**
   * Returns expanded bounding box for touch targeting.
   * Ensures minimum 44x44px touch area (Apple HIG standard).
   * @returns {{ x: number, y: number, width: number, height: number }}
   */
  getTouchBounds() {
    const MIN_TOUCH_SIZE = 44;
    const box = this.getBoundingBox();

    let { x, y, width, height } = box;

    // Expand width to minimum if needed (centered)
    if (width < MIN_TOUCH_SIZE) {
      const expandX = (MIN_TOUCH_SIZE - width) / 2;
      x -= expandX;
      width = MIN_TOUCH_SIZE;
    }

    // Expand height to minimum if needed (centered)
    if (height < MIN_TOUCH_SIZE) {
      const expandY = (MIN_TOUCH_SIZE - height) / 2;
      y -= expandY;
      height = MIN_TOUCH_SIZE;
    }

    return { x, y, width, height };
  }

  /**
   * Checks if a point is within the expanded touch area.
   * Uses getTouchBounds() for minimum 44x44px touch target.
   * @param {number} px - Point x coordinate
   * @param {number} py - Point y coordinate
   * @returns {boolean}
   */
  touchAreaContains(px, py) {
    const bounds = this.getTouchBounds();
    return px >= bounds.x &&
           px <= bounds.x + bounds.width &&
           py >= bounds.y &&
           py <= bounds.y + bounds.height;
  }

  /**
   * Checks if this shape's bounding box overlaps with another shape's bounding box.
   * Includes a minimum gap requirement.
   * @param {Shape} other - The other shape to check against
   * @param {number} gap - Minimum gap required between shapes (default 5px)
   * @returns {boolean} - True if shapes overlap (including gap violation)
   */
  overlapsWithShape(other, gap = 5) {
    if (other === this) return false;

    const boxA = this.getBoundingBox();
    const boxB = other.getBoundingBox();

    // Check if boxes overlap (including gap)
    return !(
      boxA.x + boxA.width + gap < boxB.x ||
      boxA.x > boxB.x + boxB.width + gap ||
      boxA.y + boxA.height + gap < boxB.y ||
      boxA.y > boxB.y + boxB.height + gap
    );
  }

  /**
   * Checks if shape at a hypothetical position would overlap with another shape.
   * @param {number} newX - Hypothetical x position
   * @param {number} newY - Hypothetical y position
   * @param {Shape} other - The other shape to check against
   * @param {number} gap - Minimum gap required (default 5px)
   * @returns {boolean}
   */
  wouldOverlapAt(newX, newY, other, gap = 5) {
    if (other === this) return false;

    const boxA = this.getBoundingBoxAt(newX, newY);
    const boxB = other.getBoundingBox();

    return !(
      boxA.x + boxA.width + gap < boxB.x ||
      boxA.x > boxB.x + boxB.width + gap ||
      boxA.y + boxA.height + gap < boxB.y ||
      boxA.y > boxB.y + boxB.height + gap
    );
  }

  /**
   * Checks if shape can be placed at a position without overlapping any other shapes.
   * @param {number} newX - Target x position
   * @param {number} newY - Target y position
   * @param {Shape[]} allShapes - Array of all shapes to check against
   * @param {number} gap - Minimum gap required (default 5px)
   * @returns {boolean}
   */
  canPlaceAt(newX, newY, allShapes, gap = 5) {
    for (const other of allShapes) {
      if (this.wouldOverlapAt(newX, newY, other, gap)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if current position overlaps with any other shape.
   * @param {Shape[]} allShapes - Array of all shapes to check against
   * @param {number} gap - Minimum gap required (default 5px)
   * @returns {boolean}
   */
  hasOverlap(allShapes, gap = 5) {
    for (const other of allShapes) {
      if (this.overlapsWithShape(other, gap)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if rotating to a new angle would cause overlap.
   * Temporarily changes rotation to test, then restores.
   * @param {number} newRotation - The rotation angle to test
   * @param {Shape[]} allShapes - Array of all shapes to check against
   * @param {number} gap - Minimum gap required (default 5px)
   * @returns {boolean} - True if rotation would cause overlap
   */
  wouldOverlapAtRotation(newRotation, allShapes, gap = 5) {
    const originalRotation = this.rotation;
    this.rotation = newRotation;
    const hasOverlap = this.hasOverlap(allShapes, gap);
    this.rotation = originalRotation;
    return hasOverlap;
  }

  /**
   * Saves current position as drag start position.
   * Called when drag begins.
   */
  saveDragStart() {
    this.dragStartX = this.x;
    this.dragStartY = this.y;
  }

  /**
   * Returns shape to drag start position.
   * Called when drag ends in invalid position.
   */
  returnToDragStart() {
    this.x = this.dragStartX;
    this.y = this.dragStartY;
  }

  onHit() {
    this.hitScale = ANIM.shapeHitScale;
    this.hitHighlight = 1;
  }

  drawRotateHandle(ctx, theme) {
    const box = this.getBoundingBox();
    const handle = this.getRotateHandlePos();

    // Handle appearance based on selection state
    // Selected: bright (100% opacity), larger (10px radius)
    // Not selected: dimmed (40% opacity), smaller (6px radius)
    const radius = this.isSelected ? 10 : 6;
    const opacity = this.isSelected ? 1.0 : 0.4;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Draw connecting line from box top center to handle
    const boxTopCenter = { x: box.x + box.width / 2, y: box.y };
    ctx.beginPath();
    ctx.moveTo(boxTopCenter.x, boxTopCenter.y);
    ctx.lineTo(handle.x, handle.y);
    ctx.strokeStyle = this.isSelected ? theme.shapeSelectedGlow : 'rgba(148, 163, 184, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw handle circle
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = this.isSelected ? 'rgba(124, 92, 255, 0.3)' : 'rgba(71, 85, 105, 0.4)';
    ctx.fill();
    ctx.strokeStyle = this.isSelected ? theme.shapeSelectedAccent : theme.textMuted;
    ctx.lineWidth = this.isSelected ? 2.5 : 1.5;
    ctx.stroke();

    ctx.restore();
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
