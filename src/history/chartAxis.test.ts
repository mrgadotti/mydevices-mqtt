import { formatAxisTime, formatTooltipTime, formatValueLabel, windowToMs } from './chartAxis';

const H = 3_600_000;
// Local time, so the expectations are built with the same local constructor.
const at = new Date(2026, 10, 3, 7, 5, 9).getTime();

describe('windowToMs', () => {
  it('converts the window options', () => {
    expect(windowToMs('1h')).toBe(H);
    expect(windowToMs('7d')).toBe(7 * 24 * H);
    expect(windowToMs('30d')).toBe(30 * 24 * H);
  });
  it('falls back to 24h', () => {
    expect(windowToMs('bogus')).toBe(24 * H);
  });
});

describe('formatAxisTime', () => {
  it('uses HH:mm up to 24h', () => {
    expect(formatAxisTime(at, H)).toBe('07:05');
    expect(formatAxisTime(at, 24 * H)).toBe('07:05');
  });
  it('uses dd/MM for longer windows', () => {
    expect(formatAxisTime(at, 7 * 24 * H)).toBe('03/11');
  });
});

describe('formatTooltipTime', () => {
  it('adds seconds only for short windows', () => {
    expect(formatTooltipTime(at, H)).toBe('03/11 07:05:09');
    expect(formatTooltipTime(at, 6 * H)).toBe('03/11 07:05');
  });
});

describe('formatValueLabel', () => {
  it('keeps small numbers precise and compacts big ones', () => {
    expect(formatValueLabel(0)).toBe('0');
    expect(formatValueLabel(3.14159)).toBe('3.14');
    expect(formatValueLabel(23.46)).toBe('23.5');
    expect(formatValueLabel(-120.4)).toBe('-120');
    expect(formatValueLabel(12_500)).toBe('12.5k');
    expect(formatValueLabel(2_500_000)).toBe('2.5M');
    expect(formatValueLabel(NaN)).toBe('');
  });
});
