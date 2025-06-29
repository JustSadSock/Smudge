import { hexToRGBA, distance, angle } from '../src/utils.js';

describe('utils', () => {
  test('hexToRGBA converts hex to rgba string', () => {
    expect(hexToRGBA('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)');
  });

  test('hexToRGBA supports 3-digit hex', () => {
    expect(hexToRGBA('#fff', 1)).toBe('rgba(255,255,255,1)');
  });

  test('distance calculates euclidean distance', () => {
    const a = {x: 0, y: 0};
    const b = {x: 3, y: 4};
    expect(distance(a, b)).toBeCloseTo(5);
  });

  test('angle calculates angle between two points', () => {
    const a = {x: 0, y: 0};
    const b = {x: 0, y: 1};
    expect(angle(a, b)).toBeCloseTo(Math.PI / 2);
  });
});
