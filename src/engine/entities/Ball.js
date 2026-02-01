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

    // Impact rings
    this.impactRings = [];

    // Time for glow animation
    this.time = 0;
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
    this.impactRings = [];
    this.time = 0;
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
    // Enhanced squash/stretch (1.3x more squash)
    const squashAmount = ANIM.squashAmount * 1.3;
    const squash = 1 - squashAmount * intensity;
    const stretch = 1 + squashAmount * 0.5 * intensity;
    this.squashX = squash;
    this.squashY = stretch;
    this.squashAngle = Math.atan2(normalY, normalX);

    // Spawn impact ring if speed is high enough
    if (impactSpeed > 100 && this.impactRings.length < 4) {
      this.impactRings.push({
        x: this.x,
        y: this.y,
        radius: this.radius,
        maxRadius: this.radius * 3,
        progress: 0,
        color: impactSpeed > 400 ? '#FF4444' : '#00F5FF',
      });
    }
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

    // Fade out trail points and remove dead ones in-place (avoid allocation)
    let writeIdx = 0;
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].life -= dt * ANIM.trailFadeSpeed;
      this.trail[i].size *= 0.97;
      if (this.trail[i].life > 0) {
        this.trail[writeIdx++] = this.trail[i];
      }
    }
    this.trail.length = writeIdx;

    // Decay squash/stretch (0.8x slower decay for enhanced effect)
    const decayRate = ANIM.squashDecay * 0.8;
    this.squashX += (1 - this.squashX) * decayRate * dt;
    this.squashY += (1 - this.squashY) * decayRate * dt;

    // Update time for glow animation
    this.time += dt;

    // Update impact rings
    let ringWriteIdx = 0;
    for (let i = 0; i < this.impactRings.length; i++) {
      const ring = this.impactRings[i];
      ring.progress += dt * 3; // Ring expands over ~0.33s
      ring.radius = ring.maxRadius * ring.progress;
      if (ring.progress < 1) {
        this.impactRings[ringWriteIdx++] = ring;
      }
    }
    this.impactRings.length = ringWriteIdx;
  }

  drawTrail(ctx, theme) {
    if (this.trail.length < 2) return;

    const speed = Utils.length({ x: this.vx, y: this.vy });
    const isHighSpeed = speed > ANIM.trailHighSpeedThreshold;

    // Draw trail without sorting - order doesn't affect visual result for circles
    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
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

    // Draw impact rings (behind ball)
    for (const ring of this.impactRings) {
      const alpha = (1 - ring.progress) * 0.6;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2 * (1 - ring.progress);
      ctx.globalAlpha = alpha;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.save();

    if (this.vanishing) {
      const progress = Math.min(1, this.vanishProgress);
      const scale = 1 - progress;
      const alpha = 1 - progress;

      ctx.globalAlpha = alpha;
      ctx.translate(this.vanishX, this.vanishY);
      ctx.scale(scale, scale);
      ctx.translate(-this.vanishX, -this.vanishY);

      // Solid color for performance (gradient was expensive on mobile)
      ctx.beginPath();
      ctx.arc(this.vanishX, this.vanishY, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = theme.ballFillEnd;
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

    // Breathing glow pulse (no shadowBlur for performance)
    const glowAlpha = 0.4 + Math.sin(this.time * 2.5) * 0.2; // 0.2-0.6 range
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = theme.ballGlow || 'rgba(255, 255, 100, 0.15)';
    ctx.globalAlpha = glowAlpha * 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Shadow
    ctx.beginPath();
    ctx.arc(this.x + 2, this.y + 3, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fill();

    // Solid color for performance (gradient was expensive on mobile)
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = theme.ballFillEnd;
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
