import { arcPath, fitFont, gridDotsPath, polar } from './geometry';

describe('geometry', () => {
  it('polar: 0 degrees is 3 o\'clock, 90 is 6 o\'clock', () => {
    const e = polar(10, 10, 5, 0);
    expect(e.x).toBeCloseTo(15);
    expect(e.y).toBeCloseTo(10);
    const s = polar(10, 10, 5, 90);
    expect(s.x).toBeCloseTo(10);
    expect(s.y).toBeCloseTo(15);
  });
  it('arcPath: large-arc flag is set above 180 degrees', () => {
    expect(arcPath(50, 50, 40, 135, 270)).toContain('0 0 1');
    expect(arcPath(50, 50, 40, 135, 405)).toContain('0 1 1');
  });
  it('arcPath: zero sweep stays a point', () => {
    expect(arcPath(50, 50, 40, 135, 135)).toMatch(/^M [\d.]+ [\d.]+ A/);
  });
  it('fitFont clamps', () => {
    expect(fitFont(10)).toBe(12);
    expect(fitFont(60)).toBe(30);
    expect(fitFont(400)).toBe(48);
  });
  it('gridDotsPath has one segment per grid corner', () => {
    const d = gridDotsPath(2, 10, 3);
    expect(d.split('M').length - 1).toBe(3 * 25);
    expect(d.startsWith('M3 0h0M13 0h0')).toBe(true);
  });
});
