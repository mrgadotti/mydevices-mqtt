import palette from './icons/palette.json';

/** Color ramps: ten steps each, light to dark. */
export const PALETTE_RAMPS = palette as Record<string, string[]>;
export const PALETTE_RAMP_ORDER = ['brand', 'complimentary1', 'complimentary2', 'complimentary3', 'critical', 'positive', 'warning', 'neutral', 'primary'];
export const PALETTE_BRAND = PALETTE_RAMPS.brand[5];

const recent: string[] = [];
/** "Last selected colors" row of the color picker (7 entries, newest first); kept for the running session. */
export const recentColors = (): string[] => recent;
export function rememberColor(hex: string): void {
  const c = hex.toLowerCase();
  const i = recent.indexOf(c);
  if (i >= 0) recent.splice(i, 1);
  recent.unshift(c);
  recent.length = Math.min(recent.length, 7);
}
