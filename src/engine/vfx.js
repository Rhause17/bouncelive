import { ANIM } from './constants.js';
import { Utils } from './utils.js';

export class VFXManager {
  constructor() {
    this.particles = [];
    this.confetti = [];
    this.screenShake = { x: 0, y: 0, time: 0 };
    this.swoosh = { active: false, time: 0 };
  }

  reset() {
    this.particles = [];
    this.confetti = [];
    this.screenShake = { x: 0, y: 0, time: 0 };
    this.swoosh = { active: false, time: 0 };
  }

  spawnCollisionParticles(x, y, normalX, normalY, speed, theme) {
    const count = Math.floor(Utils.randomRange(ANIM.particleCountMin, ANIM.particleCountMax));
    const baseAngle = Math.atan2(normalY, normalX);

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + Utils.randomRange(-Math.PI * 0.6, Math.PI * 0.6);
      const spd = Utils.randomRange(ANIM.particleSpeedMin, ANIM.particleSpeedMax) * (0.5 + speed / 600);
      const life = Utils.randomRange(ANIM.particleLifetimeMin, ANIM.particleLifetimeMax);
      const size = Utils.randomRange(ANIM.particleSizeMin, ANIM.particleSizeMax);
      const color = theme.particleColors[Math.floor(Math.random() * theme.particleColors.length)];

      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life, maxLife: life,
        size, color,
        gravity: 300,
      });
    }
  }

  spawnConfetti(x, y, theme) {
    for (let i = 0; i < ANIM.confettiCount; i++) {
      const angle = Utils.randomRange(0, Math.PI * 2);
      const spd = Utils.randomRange(100, 300);
      const color = theme.confettiColors[Math.floor(Math.random() * theme.confettiColors.length)];
      const isRect = Math.random() > 0.5;

      this.confetti.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 150,
        life: ANIM.confettiLifetime,
        maxLife: ANIM.confettiLifetime,
        size: Utils.randomRange(4, 8),
        color, rotation: Math.random() * Math.PI * 2,
        rotationSpeed: Utils.randomRange(-10, 10),
        isRect, gravity: 400,
      });
    }
  }

  triggerShake(intensity) {
    const clampedIntensity = Math.min(intensity, ANIM.shakeIntensity);
    this.screenShake.time = ANIM.shakeDuration;
    this.screenShake.intensity = clampedIntensity;
  }

  triggerSwoosh() {
    this.swoosh.active = true;
    this.swoosh.time = ANIM.swooshDuration;
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.vy += c.gravity * dt;
      c.vx *= 0.99;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rotation += c.rotationSpeed * dt;
      c.life -= dt;
      if (c.life <= 0) {
        this.confetti.splice(i, 1);
      }
    }

    if (this.screenShake.time > 0) {
      this.screenShake.time -= dt;
      const t = this.screenShake.time / ANIM.shakeDuration;
      const intensity = this.screenShake.intensity * t;
      this.screenShake.x = (Math.random() - 0.5) * 2 * intensity;
      this.screenShake.y = (Math.random() - 0.5) * 2 * intensity;
    } else {
      this.screenShake.x = 0;
      this.screenShake.y = 0;
    }

    if (this.swoosh.active) {
      this.swoosh.time -= dt;
      if (this.swoosh.time <= 0) {
        this.swoosh.active = false;
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const size = p.size * (0.5 + alpha * 0.5);

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }

    for (const c of this.confetti) {
      const alpha = Math.min(1, c.life / (c.maxLife * 0.3));

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = c.color;

      if (c.isRect) {
        ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  getSwooshAlpha() {
    if (!this.swoosh.active) return 0;
    const t = this.swoosh.time / ANIM.swooshDuration;
    return t > 0.5 ? (1 - t) * 2 : t * 2;
  }
}
