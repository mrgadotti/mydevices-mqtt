import { argbFromHex, cssColor, hexRgb, parseAndroidColor } from './android';

describe('parseAndroidColor', () => {
  it('parses #RRGGBB with opaque alpha as a signed int', () => {
    expect(parseAndroidColor('#ffffff')).toBe(-1);
    expect(parseAndroidColor('#000000')).toBe(-16777216);
    expect(parseAndroidColor('#40AFFF')).toBe(-12537857);
  });
  it('parses #AARRGGBB', () => {
    expect(parseAndroidColor('#80ff0000')).toBe(-2130771968);
  });
  it('parses the names Android knows, case-insensitively', () => {
    expect(parseAndroidColor('red')).toBe(-65536);
    expect(parseAndroidColor('Silver')).toBe(-4144960);
  });
  it('rejects anything else', () => {
    expect(parseAndroidColor('')).toBeNull();
    expect(parseAndroidColor('#fff')).toBeNull();
    expect(parseAndroidColor('#gggggg')).toBeNull();
    expect(parseAndroidColor('banana')).toBeNull();
    expect(parseAndroidColor('ff8800')).toBeNull();
  });
});

describe('color formatting', () => {
  it('formats #%06X ignoring alpha', () => {
    expect(hexRgb(-1)).toBe('#FFFFFF');
    expect(hexRgb(-12537857)).toBe('#40AFFF');
    expect(hexRgb(0)).toBe('#000000');
  });
  it('builds css and ARGB ints', () => {
    expect(cssColor(-1)).toBe('rgba(255, 255, 255, 1)');
    expect(argbFromHex('#40afff')).toBe(-12537857);
  });
});
