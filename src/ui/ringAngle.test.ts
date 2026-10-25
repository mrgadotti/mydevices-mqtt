import { ringPercent } from './ringAngle';

describe('ringPercent (SeekArc touch to progress, 0 at the top, clockwise)', () => {
  const size = 170;
  const c = size / 2;
  it('maps the four compass points', () => {
    expect(ringPercent(c, 0, size)).toBe(0);
    expect(ringPercent(size, c, size)).toBe(25);
    expect(ringPercent(c, size, size)).toBe(50);
    expect(ringPercent(0, c, size)).toBe(75);
  });
  it('rounds to whole percent and reaches 100 just before the top', () => {
    expect(ringPercent(c - 1, 0, size)).toBe(100);
    expect(ringPercent(size, 0, size)).toBe(13);
  });
  it('is 0 at the exact center', () => {
    expect(ringPercent(c, c, size)).toBe(0);
  });
});
