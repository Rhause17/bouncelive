import { describe, it, expect } from 'vitest';
import { Utils } from '../utils.js';

describe('Utils - Vector math', () => {
  it('dot product', () => {
    expect(Utils.dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
    expect(Utils.dot({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe(11);
  });

  it('length', () => {
    expect(Utils.length({ x: 3, y: 4 })).toBe(5);
    expect(Utils.length({ x: 0, y: 0 })).toBe(0);
  });

  it('normalize', () => {
    const n = Utils.normalize({ x: 3, y: 4 });
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
  });

  it('normalize zero vector', () => {
    const n = Utils.normalize({ x: 0, y: 0 });
    expect(n.x).toBe(0);
    expect(n.y).toBe(0);
  });

  it('subtract', () => {
    const r = Utils.subtract({ x: 5, y: 3 }, { x: 2, y: 1 });
    expect(r).toEqual({ x: 3, y: 2 });
  });

  it('add', () => {
    const r = Utils.add({ x: 1, y: 2 }, { x: 3, y: 4 });
    expect(r).toEqual({ x: 4, y: 6 });
  });

  it('scale', () => {
    const r = Utils.scale({ x: 2, y: 3 }, 4);
    expect(r).toEqual({ x: 8, y: 12 });
  });

  it('clamp', () => {
    expect(Utils.clamp(5, 0, 10)).toBe(5);
    expect(Utils.clamp(-1, 0, 10)).toBe(0);
    expect(Utils.clamp(15, 0, 10)).toBe(10);
  });
});

describe('Utils - Collision math', () => {
  it('pointToSegment on segment', () => {
    const result = Utils.pointToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(result.dist).toBe(5);
    expect(result.closest).toEqual({ x: 5, y: 0 });
  });

  it('pointToSegment off endpoint', () => {
    const result = Utils.pointToSegment({ x: -5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(result.closest).toEqual({ x: 0, y: 0 });
    expect(result.dist).toBe(5);
  });

  it('segmentNormal', () => {
    const n = Utils.segmentNormal({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(n.x).toBeCloseTo(0);
    expect(n.y).toBeCloseTo(1);
  });

  it('resolveSegmentCollision detects overlap', () => {
    const seg = { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } };
    const result = Utils.resolveSegmentCollision({ x: 5, y: 3 }, 5, seg);
    expect(result).not.toBeNull();
    expect(result.penetration).toBeCloseTo(2);
  });

  it('resolveSegmentCollision returns null for no overlap', () => {
    const seg = { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } };
    const result = Utils.resolveSegmentCollision({ x: 5, y: 20 }, 5, seg);
    expect(result).toBeNull();
  });

  it('reflectVelocity bounces off horizontal surface', () => {
    const result = Utils.reflectVelocity({ x: 0, y: 100 }, { x: 0, y: -1 }, 0.75, 0.9);
    expect(result).not.toBeNull();
    expect(result.vel.y).toBeLessThan(0); // Bounced upward
  });
});

describe('Utils - roundRect', () => {
  it('calls canvas path methods without error', () => {
    const calls = [];
    const ctx = {
      beginPath: () => calls.push('beginPath'),
      moveTo: () => calls.push('moveTo'),
      lineTo: () => calls.push('lineTo'),
      arcTo: () => calls.push('arcTo'),
      quadraticCurveTo: () => calls.push('quadraticCurveTo'),
      closePath: () => calls.push('closePath'),
    };
    Utils.roundRect(ctx, 0, 0, 100, 50, 10);
    expect(calls[0]).toBe('beginPath');
    expect(calls[calls.length - 1]).toBe('closePath');
  });
});
