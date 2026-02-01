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
  }

  reset() {
    this.lidOpen = false;
    this.lidOpenProgress = 0;
    this.targetLidOpen = false;
    this.pulseScale = 1;
    this.pulseTime = 0;
  }

  openLid() {
    this.targetLidOpen = true;
    this.lidOpen = true;
  }

  triggerWinPulse() {
    this.pulseScale = ANIM.successPulseScale;
    this.pulseTime = ANIM.basketPulseDuration;
  }

  update(dt) {
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

    // Inner fill
    ctx.beginPath();
    ctx.moveTo(this.x - hw, this.y);
    ctx.lineTo(this.x - hw, this.y + this.depth);
    ctx.lineTo(this.x + hw, this.y + this.depth);
    ctx.lineTo(this.x + hw, this.y);
    ctx.closePath();
    ctx.fillStyle = theme.basketFill;
    ctx.fill();

    // Shadow
    ctx.beginPath();
    ctx.moveTo(this.x - hw + 2, this.y + 3);
    ctx.lineTo(this.x - hw + 2, this.y + this.depth + 3);
    ctx.lineTo(this.x + hw + 2, this.y + this.depth + 3);
    ctx.lineTo(this.x + hw + 2, this.y + 3);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(this.x - hw, this.y);
    ctx.lineTo(this.x - hw, this.y + this.depth);
    ctx.lineTo(this.x + hw, this.y + this.depth);
    ctx.lineTo(this.x + hw, this.y);
    ctx.strokeStyle = theme.basketStroke;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Inner highlight
    ctx.beginPath();
    ctx.moveTo(this.x - hw + 3, this.y + 3);
    ctx.lineTo(this.x - hw + 3, this.y + this.depth - 3);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Lid
    if (this.lidOpenProgress < 1) {
      const lidY = this.y - this.lidOpenProgress * 15;
      const lidAlpha = 1 - this.lidOpenProgress;

      ctx.globalAlpha = lidAlpha;
      ctx.shadowColor = theme.basketLidGlow;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(this.x - hw, lidY);
      ctx.lineTo(this.x + hw, lidY);
      ctx.strokeStyle = theme.basketLid;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
