import { PALETTE_BRAND, PALETTE_RAMPS, PALETTE_RAMP_ORDER, recentColors, rememberColor } from './paletteColors';

it('has the ten-step ramps with the brand color at step 6', () => {
  for (const r of PALETTE_RAMP_ORDER) expect(PALETTE_RAMPS[r]).toHaveLength(10);
  expect(PALETTE_BRAND).toBe('#24c48e');
  expect(PALETTE_RAMPS.critical[5]).toBe('#d3435c');
  expect(PALETTE_RAMPS.critical[0]).not.toBe(PALETTE_RAMPS.critical[9]);
});

it('remembers the last 7 colors, newest first, without duplicates', () => {
  for (const c of ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006', '#000007', '#000008']) rememberColor(c);
  rememberColor('#000005');
  expect(recentColors()).toHaveLength(7);
  expect(recentColors()[0]).toBe('#000005');
  expect(recentColors().filter((c) => c === '#000005')).toHaveLength(1);
});
