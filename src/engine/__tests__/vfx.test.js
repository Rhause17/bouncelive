import { describe, it, expect, beforeEach } from 'vitest';
import { VFXManager } from '../vfx.js';

const mockTheme = {
  particleColors: ['#FFF', '#F00'],
  confettiColors: ['#0F0', '#00F'],
};

describe('VFXManager', () => {
  let vfx;

  beforeEach(() => {
    vfx = new VFXManager();
  });

  it('starts empty', () => {
    expect(vfx.particles).toHaveLength(0);
    expect(vfx.confetti).toHaveLength(0);
  });

  it('spawnCollisionParticles adds particles', () => {
    vfx.spawnCollisionParticles(100, 100, 0, -1, 200, mockTheme);
    expect(vfx.particles.length).toBeGreaterThan(0);
  });

  it('spawnConfetti adds confetti', () => {
    vfx.spawnConfetti(100, 100, mockTheme);
    expect(vfx.confetti.length).toBeGreaterThan(0);
  });

  it('update decays particles', () => {
    vfx.spawnCollisionParticles(100, 100, 0, -1, 200, mockTheme);
    const initial = vfx.particles.length;
    for (let i = 0; i < 120; i++) vfx.update(1 / 60);
    expect(vfx.particles.length).toBeLessThan(initial);
  });

  it('triggerShake sets shake state', () => {
    vfx.triggerShake(5);
    expect(vfx.screenShake.time).toBeGreaterThan(0);
  });

  it('reset clears everything', () => {
    vfx.spawnCollisionParticles(100, 100, 0, -1, 200, mockTheme);
    vfx.triggerShake(5);
    vfx.reset();
    expect(vfx.particles).toHaveLength(0);
    expect(vfx.screenShake.time).toBe(0);
  });

  it('triggerSwoosh activates swoosh', () => {
    vfx.triggerSwoosh();
    expect(vfx.swoosh.active).toBe(true);
    // Advance a bit so alpha is non-zero (at t=duration it's 0)
    vfx.update(0.1);
    expect(vfx.swoosh.active).toBe(true);
    expect(vfx.getSwooshAlpha()).toBeGreaterThan(0);
  });
});
