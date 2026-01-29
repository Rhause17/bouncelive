import { describe, it, expect } from 'vitest';
import { createShape } from '../shapeFactory.js';
import { ShapeTypeEnum } from '../constants.js';

const ALL_TYPES = Object.values(ShapeTypeEnum);

describe('Shape factory', () => {
  it('creates all shape types without error', () => {
    ALL_TYPES.forEach(type => {
      const shape = createShape(type, 100, 100, 0);
      expect(shape).toBeDefined();
      expect(shape.x).toBe(100);
      expect(shape.y).toBe(100);
    });
  });
});

describe('Shape common interface', () => {
  ALL_TYPES.forEach(type => {
    describe(type, () => {
      const shape = createShape(type, 150, 150, 0);

      it('has getSegments returning array of {a, b}', () => {
        const segs = shape.getSegments();
        expect(Array.isArray(segs)).toBe(true);
        expect(segs.length).toBeGreaterThan(0);
        segs.forEach(seg => {
          expect(seg.a).toBeDefined();
          expect(seg.b).toBeDefined();
          expect(typeof seg.a.x).toBe('number');
          expect(typeof seg.a.y).toBe('number');
        });
      });

      it('has isVisible returning boolean', () => {
        expect(typeof shape.isVisible()).toBe('boolean');
        expect(shape.isVisible()).toBe(true);
      });

      it('has containsPoint method', () => {
        expect(typeof shape.containsPoint).toBe('function');
      });

      it('has save/restorePosition', () => {
        shape.x = 200;
        shape.y = 200;
        shape.savePosition();
        shape.x = 300;
        shape.y = 300;
        shape.restorePosition();
        expect(shape.x).toBe(200);
        expect(shape.y).toBe(200);
      });

      it('startDisappear reduces opacity over updates', () => {
        const s = createShape(type, 100, 100, 0);
        s.startDisappear();
        for (let i = 0; i < 30; i++) s.update(1 / 60);
        expect(s.opacity).toBeLessThan(1);
      });

      it('has getBoundingBox returning valid AABB', () => {
        const s = createShape(type, 150, 150, 0);
        const box = s.getBoundingBox();
        expect(box).toBeDefined();
        expect(typeof box.x).toBe('number');
        expect(typeof box.y).toBe('number');
        expect(typeof box.width).toBe('number');
        expect(typeof box.height).toBe('number');
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThanOrEqual(0); // LineSegment can have 0 height
      });

      it('getBoundingBox contains shape center', () => {
        const s = createShape(type, 150, 150, 0);
        const box = s.getBoundingBox();
        // Shape center should be within bounding box
        expect(s.x).toBeGreaterThanOrEqual(box.x);
        expect(s.x).toBeLessThanOrEqual(box.x + box.width);
        expect(s.y).toBeGreaterThanOrEqual(box.y);
        expect(s.y).toBeLessThanOrEqual(box.y + box.height);
      });

      it('getBoundingBoxAt returns translated box', () => {
        const s = createShape(type, 150, 150, 0);
        const originalBox = s.getBoundingBox();
        const translatedBox = s.getBoundingBoxAt(250, 250);
        expect(translatedBox.width).toBe(originalBox.width);
        expect(translatedBox.height).toBe(originalBox.height);
        expect(translatedBox.x).toBe(originalBox.x + 100);
        expect(translatedBox.y).toBe(originalBox.y + 100);
      });

      it('getTouchBounds returns minimum 44x44 area', () => {
        const s = createShape(type, 150, 150, 0);
        const touchBounds = s.getTouchBounds();
        expect(touchBounds.width).toBeGreaterThanOrEqual(44);
        expect(touchBounds.height).toBeGreaterThanOrEqual(44);
      });

      it('touchAreaContains returns true for center point', () => {
        const s = createShape(type, 150, 150, 0);
        expect(s.touchAreaContains(150, 150)).toBe(true);
      });

      it('touchAreaContains returns false for far away point', () => {
        const s = createShape(type, 150, 150, 0);
        expect(s.touchAreaContains(500, 500)).toBe(false);
      });
    });
  });
});
