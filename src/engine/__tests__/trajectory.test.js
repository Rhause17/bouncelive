import { describe, it, expect } from 'vitest';
import { predictTrajectory } from '../trajectory.js';
import { Physics } from '../physics.js';
import { Basket } from '../entities/Basket.js';

describe('predictTrajectory', () => {
  const physics = new Physics();

  it('returns trajectory object with expected shape', () => {
    const result = predictTrajectory(
      physics, [], null,
      150, 100, false, 300, 600,
    );
    expect(result).toHaveProperty('hitPoint');
    expect(result).toHaveProperty('reboundPoints');
    expect(result).toHaveProperty('hitShape');
    expect(result).toHaveProperty('maxSteps');
    expect(result.reboundPoints.length).toBeGreaterThanOrEqual(2);
  });

  it('returns more points when extended', () => {
    const normal = predictTrajectory(physics, [], null, 150, 100, false, 300, 600);
    const extended = predictTrajectory(physics, [], null, 150, 100, true, 300, 600);
    expect(extended.reboundPoints.length).toBeGreaterThanOrEqual(normal.reboundPoints.length);
  });

  it('detects no shape hit when field is empty', () => {
    const result = predictTrajectory(physics, [], null, 150, 100, false, 300, 600);
    expect(result.hitShape).toBe(false);
  });

  it('stops early when ball hits basket with no bounces', () => {
    const basket = new Basket(150, 300, 35);
    const result = predictTrajectory(physics, [], basket, 150, 100, false, 300, 600);
    expect(result.hitShape).toBe(false);
    expect(result.hitPoint).toBeNull();
  });
});
