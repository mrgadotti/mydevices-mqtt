import { colors, gridColumns, mainTextSizeSp, tileMetrics } from './theme';

describe('tileMetrics (from the original layout xml)', () => {
  it('medium tile: 155x150 dp, icon 75, spinner 115, name 38 high', () => {
    expect(tileMetrics(0)).toMatchObject({ width: 155, height: 150, nameHeight: 38, icon: 75, spinner: 115, bottomSp: 12, textAreaHeight: 80 });
  });
  it('small tile: 105x100 dp, 10 sp labels, icon 52, spinner 65', () => {
    expect(tileMetrics(-1)).toMatchObject({ width: 105, height: 100, nameHeight: 25, nameSp: 10, icon: 52, spinner: 65, bottomSp: 10, textAreaHeight: 60 });
  });
  it('large tile: 205x200 dp, 16 sp name, icon 120, spinner 150, arc 120', () => {
    expect(tileMetrics(1)).toMatchObject({ width: 205, height: 200, nameSp: 16, icon: 120, spinner: 150, bottomSp: 14, textAreaHeight: 125 });
    expect(tileMetrics(1).arc).toEqual({ size: 120, stroke: 16 });
  });
  it('range arc sizes', () => {
    expect(tileMetrics(0).arc).toEqual({ size: 75, stroke: 10 });
    expect(tileMetrics(-1).arc).toEqual({ size: 55, stroke: 5 });
  });
});

describe('mainTextSizeSp (MetricsAdapter switch on tileWidth)', () => {
  it('maps text size by tile size', () => {
    expect([mainTextSizeSp(-1, 'SMALL'), mainTextSizeSp(-1, 'MEDIUM'), mainTextSizeSp(-1, 'LARGE')]).toEqual([12, 22, 32]);
    expect([mainTextSizeSp(0, 'SMALL'), mainTextSizeSp(0, 'MEDIUM'), mainTextSizeSp(0, 'LARGE')]).toEqual([15, 25, 35]);
    expect([mainTextSizeSp(1, 'SMALL'), mainTextSizeSp(1, 'MEDIUM'), mainTextSizeSp(1, 'LARGE')]).toEqual([40, 50, 60]);
  });
});

describe('colors', () => {
  it('are the original palette', () => {
    expect(colors).toMatchObject({ windowBackground: '#080808', tile: '#181818', accent: '#40afff', icon: '#c0c0c0', blink: '#707070' });
  });
});

describe('gridColumns (handleRotation)', () => {
  const b = (o = {}) => ({ colsCount: 0, colsCountHorizontal: 0, tileWidth: 0 as const, ...o });
  it('auto: floor(width / (tile + 15))', () => {
    expect(gridColumns(b(), 360, false)).toBe(2);
    expect(gridColumns(b({ tileWidth: -1 }), 360, false)).toBe(3);
    expect(gridColumns(b({ tileWidth: 1 }), 360, false)).toBe(1);
    expect(gridColumns(b(), 760, true)).toBe(4);
  });
  it('is never below 1', () => {
    expect(gridColumns(b({ tileWidth: 1 }), 100, false)).toBe(1);
  });
  it('uses the fixed count for the matching orientation only', () => {
    expect(gridColumns(b({ colsCount: 3 }), 360, false)).toBe(3);
    expect(gridColumns(b({ colsCount: 3 }), 760, true)).toBe(4);
    expect(gridColumns(b({ colsCountHorizontal: 5 }), 760, true)).toBe(5);
    expect(gridColumns(b({ colsCountHorizontal: 5 }), 360, false)).toBe(2);
  });
});
