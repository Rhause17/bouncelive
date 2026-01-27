import { ShapeTypeEnum } from './constants.js';
import {
  Triangle, LineSegment, HalfCircle, Diamond, Octagon,
  Trapezoid, Arrowhead, Boomerang, HalfPipe, SawtoothRamp,
} from './shapes/index.js';

/**
 * Creates a Shape instance from a ShapeTypeEnum value.
 * @param {string} shapeType - One of ShapeTypeEnum values
 * @param {number} x - Center x position
 * @param {number} y - Center y position
 * @param {number} colorIndex - Color palette index
 * @returns {Shape}
 */
export function createShape(shapeType, x, y, colorIndex = 0) {
  switch (shapeType) {
    case ShapeTypeEnum.TRIANGLE_LEFT:
      return new Triangle(x, y, 70, 70, 'left', colorIndex);
    case ShapeTypeEnum.TRIANGLE_RIGHT:
      return new Triangle(x, y, 70, 70, 'right', colorIndex);
    case ShapeTypeEnum.LINE:
      return new LineSegment(x, y, 70 * Math.SQRT2, Math.PI / 4, colorIndex);
    case ShapeTypeEnum.HALF_CIRCLE:
      return new HalfCircle(x, y, 40, colorIndex);
    case ShapeTypeEnum.DIAMOND:
      return new Diamond(x, y, 50, 70, colorIndex);
    case ShapeTypeEnum.OCTAGON:
      return new Octagon(x, y, 35, colorIndex);
    case ShapeTypeEnum.TRAPEZOID:
      return new Trapezoid(x, y, 40, 70, 50, colorIndex);
    case ShapeTypeEnum.ARROWHEAD:
      return new Arrowhead(x, y, 63, 75, colorIndex);
    case ShapeTypeEnum.BOOMERANG:
      return new Boomerang(x, y, 76, 15, 70, colorIndex);
    case ShapeTypeEnum.HALF_PIPE:
      return new HalfPipe(x, y, 75, 56, 12, colorIndex);
    case ShapeTypeEnum.SAWTOOTH_RAMP:
      return new SawtoothRamp(x, y, 70, 50, 6, colorIndex);
    default:
      throw new Error(`Unknown shape type: ${shapeType}`);
  }
}
