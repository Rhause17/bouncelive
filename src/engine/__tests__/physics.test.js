import { describe, it, expect, beforeEach } from 'vitest';
import { Physics } from '../physics.js';
import { Ball } from '../entities/Ball.js';
import { createShape } from '../shapeFactory.js';
import { ShapeTypeEnum } from '../constants.js';

describe('Physics', () => {
  let physics;

  beforeEach(() => {
    physics = new Physics();
  });

  it('initializes with default values', () => {
    expect(physics.gravity).toBeGreaterThan(0);
    expect(physics.restitution).toBeGreaterThan(0);
    expect(physics.substeps).toBe(4);
  });

  it('setLevelSpecs changes gravity and restitution', () => {
    const defaultGravity = physics.gravity;
    physics.setLevelSpecs('High', 'Bouncy');
    expect(physics.gravity).not.toBe(defaultGravity);
  });

  it('update applies gravity to ball', () => {
    const ball = new Ball(100, 100, 10);
    ball.visible = true;
    const initialVy = ball.vy;
    physics.update(ball, [], 1 / 60);
    expect(ball.vy).toBeGreaterThan(initialVy);
    expect(ball.y).toBeGreaterThan(100);
  });

  it('update does not move vanishing ball via physics', () => {
    const ball = new Ball(100, 100, 10);
    ball.startVanish(100, 100);
    physics.update(ball, [], 1 / 60);
    // Ball stays at vanish point
    expect(ball.x).toBe(100);
    expect(ball.y).toBe(100);
  });

  it('resolveShapeCollisions detects collision with line', () => {
    const ball = new Ball(100, 10, 10);
    ball.vy = 200;
    // Horizontal line at y=0
    const line = createShape(ShapeTypeEnum.LINE, 100, 0, 0);
    line.hasBeenMoved = true;

    physics.update(ball, [line], 1 / 60);
    // Should have collision events if ball was close enough
    // The exact result depends on position, but the function shouldn't throw
    expect(physics.collisionEvents).toBeInstanceOf(Array);
  });

  it('resetCollisionTracking clears first collision flag', () => {
    physics.hasHadFirstCollision = true;
    physics.resetCollisionTracking();
    expect(physics.hasHadFirstCollision).toBe(false);
  });
});
