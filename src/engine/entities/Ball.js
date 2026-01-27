import { SIZE_SCALE, ANIM } from '../constants.js';
import { Utils } from '../utils.js';

export class Ball {
  constructor(x, y, radius = 15 * SIZE_SCALE) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vx = 0;
    this.vy = 0;
    this.restTimer = 0;
    this.visible = true;

    // Vanish animation state
    this.vanishing = false;
    this.vanishProgress = 0;
    this.vanishX = 0;
    this.vanishY = 0;

    // Trail system - circular buffer
    this.trail = [];
    this.trailIndex = 0;
    this.lastTrailX = x;
    this.lastTrailY = y;

    // Squash/stretch
    this.squashX = 1;
    this.squashY = 1;
    this.squashAngle = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.restTimer = 0;
    this.visible = true;
    this.vanishing = false;
    this.vanishProgress = 0;
    this.trail = [];
    this.trailIndex = 0;
    this.lastTrailX = x;
    this.lastTrailY = y;
    this.squashX = 1;
    this.squashY = 1;
    this.squashAngle = 0;
  }

  startVanish(x, y) {
    if (this.vanishing) return;
    this.vanishing = true;
    this.vanishProgress = 0;
    this.vanishX = x;
    this.vanishY = y;
    this.vx = 0;
    this.vy = 0;
  }

  isVanishComplete() {
    return this.vanishing && this.vanishProgress >= 1;
  }

  onCollision(normalX, normalY, impactSpeed) {
    const intensity = Math.min(1, impactSpeed / 600);
    const squash = 1 - ANIM.squashAmount * intensity;
    const stretch = 1 + ANIM.squashAmount * 0.5 * intensity;
    this.squashX = squash;
    this.squashY = stretch;
    this.squashAngle = Math.atan2(normalY, normalX);
  }

  update(dt, gravity) {
    if (this.vanishing) {
      this.vanishProgress += dt * 1.2;
      this.x = this.vanishX;
      this.y = this.vanishY;
      return;
    }

    this.vy += gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const speed = Utils.length({ x: this.vx, y: this.vy });
    this.restTimer = speed < 5 ? this.restTimer + dt : 0;

    // Update trail
    const dx = this.x - this.lastTrailX;
    const dy = this.y - this.lastTrailY;
    const distMoved = Math.sqrt(dx * dx + dy * dy);

    if (distMoved >= ANIM.trailMinDistance && speed > ANIM.trailSpeedThreshold) {
      const point = {
        x: this.x,
        y: this.y,
        life: 1.0,
        speed: speed,
        size: this.radius * 0.8,
      };

      if (this.trail.length < ANIM.trailMaxPoints) {
        this.trail.push(point);
      } else {
        this.trail[this.trailIndex] = point;
        this.trailIndex = (this.trailIndex + 1) % ANIM.trailMaxPoints;
      }

      this.lastTrailX = this.x;
      this.lastTrailY = this.y;
    }

    // Fade out trail points
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].life -= dt * ANIM.trailFadeSpeed;
      this.trail[i].size *= 0.97;
    }

    this.trail = this.trail.filter(p => p.life > 0);

    // Decay squash/stretch
    this.squashX += (1 - this.squashX) * ANIM.squashDecay * dt;
    this.squashY += (1 - this.squashY) * ANIM.squashDecay * dt;
  }

  drawTrail(ctx, theme) {
    if (this.trail.length < 2) return;

    const speed = Utils.length({ x: this.vx, y: this.vy });
    const isHighSpeed = speed > ANIM.trailHighSpeedThreshold;

    const sortedTrail = [...this.trail].sort((a, b) => a.life - b.life);

    for (let i = 0; i < sortedTrail.length; i++) {
      const point = sortedTrail[i];
      const alpha = point.life * 0.6;
      if (alpha <= 0.01) continue;

      const size = Math.max(2, point.size * point.life);
      const color = (isHighSpeed || point.speed > ANIM.trailHighSpeedThreshold)
        ? theme.trailColorFast
        : theme.trailColor;

      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();

      if (isHighSpeed && point.life > 0.5) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = theme.trailGlow;
        ctx.globalAlpha = alpha * 0.3;
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }

  draw(ctx, theme) {
    if (!this.visible) return;

    this.drawTrail(ctx, theme);

    ctx.save();

    if (this.vanishing) {
      const progress = Math.min(1, this.vanishProgress);
      const scale = 1 - progress;
      const alpha = 1 - progress;

      ctx.globalAlpha = alpha;
      ctx.translate(this.vanishX, this.vanishY);
      ctx.scale(scale, scale);
      ctx.translate(-this.vanishX, -this.vanishY);

      const gradient = ctx.createRadialGradient(
        this.vanishX - this.radius * 0.3, this.vanishY - this.radius * 0.3, 0,
        this.vanishX, this.vanishY, this.radius,
      );
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.3, theme.ballFillStart);
      gradient.addColorStop(0.8, theme.ballFillEnd);
      gradient.addColorStop(1, theme.ballStroke);

      ctx.beginPath();
      ctx.arc(this.vanishX, this.vanishY, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      if (progress < 0.5) {
        const puffAlpha = (0.5 - progress) * 2;
        const puffRadius = this.radius * (1 + progress * 3);
        ctx.beginPath();
        ctx.arc(this.vanishX, this.vanishY, puffRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 150, ${puffAlpha * 0.4})`;
        ctx.fill();
      }

      ctx.restore();
      return;
    }

    // Squash/stretch transform
    ctx.translate(this.x, this.y);
    ctx.rotate(this.squashAngle);
    ctx.scale(this.squashX, this.squashY);
    ctx.translate(-this.x, -this.y);

    // Shadow
    ctx.beginPath();
    ctx.arc(this.x + 2, this.y + 3, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fill();

    // Ball gradient
    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
      this.x, this.y, this.radius,
    );
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.3, theme.ballFillStart);
    gradient.addColorStop(0.8, theme.ballFillEnd);
    gradient.addColorStop(1, theme.ballStroke);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Rim
    ctx.strokeStyle = theme.ballStroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    ctx.restore();
  }
}
