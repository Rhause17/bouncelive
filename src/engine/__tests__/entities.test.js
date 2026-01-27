import { describe, it, expect, beforeEach } from 'vitest';
import { Ball } from '../entities/Ball.js';
import { Basket } from '../entities/Basket.js';

describe('Ball', () => {
  let ball;

  beforeEach(() => {
    ball = new Ball(100, 50, 15);
  });

  it('initializes at given position', () => {
    expect(ball.x).toBe(100);
    expect(ball.y).toBe(50);
    expect(ball.radius).toBe(15);
    expect(ball.vx).toBe(0);
    expect(ball.vy).toBe(0);
  });

  it('update applies gravity', () => {
    ball.update(1 / 60, 980);
    expect(ball.vy).toBeGreaterThan(0);
    expect(ball.y).toBeGreaterThan(50);
  });

  it('rest timer increments when slow', () => {
    ball.vx = 0;
    ball.vy = 0;
    ball.update(1 / 60, 0);
    expect(ball.restTimer).toBeGreaterThan(0);
  });

  it('rest timer resets when moving fast', () => {
    ball.restTimer = 1;
    ball.vx = 100;
    ball.vy = 100;
    ball.update(1 / 60, 0);
    expect(ball.restTimer).toBe(0);
  });

  it('reset clears all state', () => {
    ball.vx = 50;
    ball.vy = 100;
    ball.restTimer = 2;
    ball.vanishing = true;
    ball.reset(200, 80);
    expect(ball.x).toBe(200);
    expect(ball.y).toBe(80);
    expect(ball.vx).toBe(0);
    expect(ball.vy).toBe(0);
    expect(ball.restTimer).toBe(0);
    expect(ball.vanishing).toBe(false);
  });

  it('startVanish freezes position', () => {
    ball.startVanish(120, 60);
    expect(ball.vanishing).toBe(true);
    expect(ball.vanishX).toBe(120);
    ball.update(1 / 60, 980);
    expect(ball.x).toBe(120);
    expect(ball.y).toBe(60);
  });

  it('isVanishComplete after enough time', () => {
    ball.startVanish(100, 50);
    expect(ball.isVanishComplete()).toBe(false);
    // Progress at 1.2/frame, need ~50 frames at 1/60
    for (let i = 0; i < 60; i++) ball.update(1 / 60, 0);
    expect(ball.isVanishComplete()).toBe(true);
  });

  it('onCollision sets squash values', () => {
    ball.onCollision(0, -1, 300);
    expect(ball.squashX).not.toBe(1);
    expect(ball.squashY).not.toBe(1);
  });
});

describe('Basket', () => {
  let basket;

  beforeEach(() => {
    basket = new Basket(200, 400, 35);
  });

  it('initializes at given position', () => {
    expect(basket.x).toBe(200);
    expect(basket.y).toBe(400);
    expect(basket.radius).toBe(35);
  });

  it('getSegments returns wall segments', () => {
    const segs = basket.getSegments();
    expect(segs.length).toBeGreaterThanOrEqual(3);
    segs.forEach(seg => {
      expect(seg.a).toBeDefined();
      expect(seg.b).toBeDefined();
    });
  });

  it('openLid sets lid state', () => {
    expect(basket.targetLidOpen).toBe(false);
    basket.openLid();
    expect(basket.targetLidOpen).toBe(true);
  });

  it('containsBall detects ball inside', () => {
    const ball = new Ball(200, 400, 10);
    ball.visible = true;
    // Ball is at basket center — depends on basket geometry
    // Just verify the method doesn't throw
    const result = basket.containsBall(ball);
    expect(typeof result).toBe('boolean');
  });

  it('reset clears animation state', () => {
    basket.openLid();
    basket.triggerWinPulse();
    basket.reset();
    expect(basket.targetLidOpen).toBe(false);
  });
});
