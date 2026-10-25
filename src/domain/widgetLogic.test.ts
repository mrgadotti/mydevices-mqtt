import { chartPath, hexToHsv, hsvToHex, joystickPayload, joystickPosition, opt, pushBounded, stepValue } from './widgetLogic';

describe('stepValue', () => {
  it('steps and clamps', () => {
    expect(stepValue(5, 1, 2, 0, 10, false)).toBe(7);
    expect(stepValue(9, 1, 2, 0, 10, false)).toBe(10);
    expect(stepValue(1, -1, 2, 0, 10, false)).toBe(0);
  });
  it('loops past the limits', () => {
    expect(stepValue(9, 1, 2, 0, 10, true)).toBe(0);
    expect(stepValue(1, -1, 2, 0, 10, true)).toBe(10);
  });
});

describe('joystick', () => {
  it('scales -1..1 into the range', () => {
    expect(joystickPayload(0, 0, 0, 255)).toBe('128,128');
    expect(joystickPayload(-1, 1, 0, 255)).toBe('0,255');
    expect(joystickPayload(5, -5, -100, 100)).toBe('100,-100');
  });
  it('parses a payload back and falls back to the center', () => {
    expect(joystickPosition('0,255', 0, 255)).toEqual({ x: -1, y: 1 });
    expect(joystickPosition('oops', 0, 255)).toEqual({ x: 0, y: 0 });
    expect(joystickPosition(null, 0, 255)).toEqual({ x: 0, y: 0 });
  });
});

describe('colors', () => {
  it('converts hsv to hex', () => {
    expect(hsvToHex(0, 1, 1)).toBe('#FF0000');
    expect(hsvToHex(120, 1, 1)).toBe('#00FF00');
    expect(hsvToHex(240, 1, 0.5)).toBe('#000080');
    expect(hsvToHex(0, 0, 1)).toBe('#FFFFFF');
  });
  it('round-trips and tolerates bad input', () => {
    const c = hexToHsv('#24C48E');
    expect(hsvToHex(c.h, c.s, c.v)).toBe('#24C48E');
    expect(hexToHsv('nope')).toEqual({ h: 0, s: 0, v: 1 });
  });
});

describe('buffers', () => {
  it('keeps the newest items', () => {
    expect(pushBounded([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
  });
  it('draws a path and a flat line', () => {
    expect(chartPath([], 100, 50)).toBe('');
    expect(chartPath([0, 10], 100, 50)).toBe('M 0.0 50.0 L 100.0 0.0');
    expect(chartPath([5, 5], 100, 50)).toBe('M 0.0 25.0 L 100.0 25.0');
  });
});

describe('opt', () => {
  it('returns the typed value or the fallback', () => {
    expect(opt({ step: 2 }, 'step', 1)).toBe(2);
    expect(opt({ step: 'x' }, 'step', 1)).toBe(1);
    expect(opt(undefined, 'style', 'solid')).toBe('solid');
  });
});
