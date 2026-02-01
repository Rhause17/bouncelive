import { SIZE_SCALE, ANIM } from '../constants.js';

export class Basket {
  constructor(x, y, radius = 35 * SIZE_SCALE) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.depth = 15 * SIZE_SCALE * 2;
    this.lidOpen = false;

    this.lidOpenProgress = 0;
    this.targetLidOpen = false;
    this.pulseScale = 1;
    this.pulseTime = 0;

    // Animation time for glow pulse
    this.time = 0;
    // Ball proximity (0-1) for color shift effect
    this.ballProximity = 0;
  }

  reset() {
    this.lidOpen = false;
    this.lidOpenProgress = 0;
    this.targetLidOpen = false;
    this.pulseScale = 1;
    this.pulseTime = 0;
    this.time = 0;
    this.ballProximity = 0;
  }

  openLid() {
    this.targetLidOpen = true;
    this.lidOpen = true;
  }

  triggerWinPulse() {
    this.pulseScale = ANIM.successPulseScale;
    this.pulseTime = ANIM.basketPulseDuration;
  }

  /**
   * Update ball proximity for color shift effect.
   * @param {number} distance - Distance from ball to basket center
   */
  updateBallProximity(distance) {
    const maxDist = 200;
    this.ballProximity = Math.max(0, 1 - distance / maxDist);
  }

  /**
   * Get stroke color based on ball proximity (green → gold)
   */
  getProximityColor(theme) {
    if (this.ballProximity <= 0) return theme.basketStroke;

    // Interpolate from green (#00FF7F) to gold (#FFD700)
    const t = this.ballProximity;
    const r = Math.round(0 + t * 255);
    const g = Math.round(255 - t * 40);
    const b = Math.round(127 - t * 127);
    return `rgb(${r}, ${g}, ${b})`;
  }

  update(dt) {
    // Update animation time
    this.time += dt;

    if (this.targetLidOpen && this.lidOpenProgress < 1) {
      this.lidOpenProgress += dt * ANIM.lidOpenSpeed;
      if (this.lidOpenProgress > 1) {
        this.lidOpenProgress = 1 + (this.lidOpenProgress - 1) * ANIM.lidBounce;
      }
      if (this.lidOpenProgress > 1.1) this.lidOpenProgress = 1;
    }

    if (this.pulseTime > 0) {
      this.pulseTime -= dt;
      const t = this.pulseTime / ANIM.basketPulseDuration;
      this.pulseScale = 1 + (ANIM.successPulseScale - 1) * t;
    } else {
      this.pulseScale = 1;
    }
  }

  containsBall(ball, tolerance = 5) {
    if (!this.lidOpen) return false;
    const hw = this.radius;
    return ball.x > this.x - hw + ball.radius && ball.x < this.x + hw - ball.radius &&
           ball.y > this.y && ball.y < this.y + this.depth - ball.radius + tolerance;
  }

  getSegments() {
    const hw = this.radius;
    const segments = [
      { a: { x: this.x - hw, y: this.y }, b: { x: this.x - hw, y: this.y + this.depth } },
      { a: { x: this.x + hw, y: this.y }, b: { x: this.x + hw, y: this.y + this.depth } },
      { a: { x: this.x - hw, y: this.y + this.depth }, b: { x: this.x + hw, y: this.y + this.depth } },
    ];
    if (!this.lidOpen) {
      segments.push({ a: { x: this.x - hw, y: this.y }, b: { x: this.x + hw, y: this.y } });
    }
    return segments;
  }

  draw(ctx, theme) {
    const hw = this.radius;

    ctx.save();

    if (this.pulseScale !== 1) {
      ctx.translate(this.x, this.y + this.depth / 2);
      ctx.scale(this.pulseScale, this.pulseScale);
      ctx.translate(-this.x, -(this.y + this.depth / 2));
    }

    // Inner fill with depth gradient (lighter at top, darker at bottom)
    const depthGradient = ctx.createLinearGradient(
      this.x, this.y,
      this.x, this.y + this.depth
    );
    depthGradient.addColorStop(0, 'rgba(0, 255, 127, 0.2)');
    depthGradient.addColorStop(1, 'rgba(0, 255, 127, 0.08)');

    ctx.beginPath();
    ctx.moveTo(this.x - hw, this.y);
    ctx.lineTo(this.x - hw, this.y + this.depth);
    ctx.lineTo(this.x + hw, this.y + this.depth);
    ctx.lineTo(this.x + hw, this.y);
    ctx.closePath();
    ctx.fillStyle = depthGradient;
    ctx.fill();

    // NET PATTERN - single batched path for performance
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x - hw + 2, this.y + 2, hw * 2 - 4, this.depth - 4);
    ctx.clip();

    ctx.strokeStyle = theme.basketStroke;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;

    const spacing = 16; // Increased spacing for fewer lines
    const startX = this.x - hw;
    const endX = this.x + hw;
    const startY = this.y;
    const endY = this.y + this.depth;

    // Batch all lines into single path, single stroke call
    ctx.beginPath();
    for (let i = -this.depth; i < hw * 2 + this.depth; i += spacing) {
      ctx.moveTo(startX + i, startY);
      ctx.lineTo(startX + i + this.depth, endY);
      ctx.moveTo(endX - i, startY);
      ctx.lineTo(endX - i - this.depth, endY);
    }
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();

    // Shadow
    ctx.beginPath();
    ctx.moveTo(this.x - hw + 2, this.y + 3);
    ctx.lineTo(this.x - hw + 2, this.y + this.depth + 3);
    ctx.lineTo(this.x + hw + 2, this.y + this.depth + 3);
    ctx.lineTo(this.x + hw + 2, this.y + 3);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Get stroke color (shifts green→gold based on ball proximity)
    const strokeColor = this.getProximityColor(theme);

    // Pulsing glow effect (no shadowBlur - use multiple strokes)
    const glowIntensity = 0.4 + Math.sin(this.time * 3) * 0.2; // 0.2-0.6 range

    // Outer glow layer
    ctx.beginPath();
    ctx.moveTo(this.x - hw, this.y);
    ctx.lineTo(this.x - hw, this.y + this.depth);
    ctx.lineTo(this.x + hw, this.y + this.depth);
    ctx.lineTo(this.x + hw, this.y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = glowIntensity * 0.3;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Body outline (U-shape)
    ctx.beginPath();
    ctx.moveTo(this.x - hw, this.y);
    ctx.lineTo(this.x - hw, this.y + this.depth);
    ctx.lineTo(this.x + hw, this.y + this.depth);
    ctx.lineTo(this.x + hw, this.y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // TOP BARRIER - single line that opens from center outward
    const barrierColor = this.lidOpen ? theme.basketStroke : theme.basketLid;
    const barrierGlow = this.lidOpen ? theme.basketStroke : theme.basketLidGlow;

    // Opening animation: line splits from center and moves outward
    const openAmount = this.lidOpenProgress; // 0 = closed, 1 = fully open
    const halfWidth = hw + 4;
    const gapHalf = openAmount * halfWidth; // Gap grows from center

    ctx.shadowColor = barrierGlow;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = barrierColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    if (openAmount < 1) {
      // Draw left segment (from left edge to center-gap)
      if (this.x - halfWidth < this.x - gapHalf) {
        ctx.beginPath();
        ctx.moveTo(this.x - halfWidth, this.y);
        ctx.lineTo(this.x - gapHalf, this.y);
        ctx.stroke();
      }

      // Draw right segment (from center+gap to right edge)
      if (this.x + gapHalf < this.x + halfWidth) {
        ctx.beginPath();
        ctx.moveTo(this.x + gapHalf, this.y);
        ctx.lineTo(this.x + halfWidth, this.y);
        ctx.stroke();
      }
    }
    // When fully open (openAmount >= 1), don't draw the barrier at all

    ctx.shadowBlur = 0;

    ctx.restore();
  }
}
