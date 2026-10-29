const BASES: Record<string, string> = {
  brand: '#24c48e',
  complimentary1: '#5471d3',
  complimentary2: '#01b8f7',
  complimentary3: '#2781e0',
  critical: '#d3435c',
  positive: '#3dae5b',
  warning: '#e8a317',
  neutral: '#8a8d96',
  primary: '#6c5ce7',
};

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
const mix = (hex: string, to: number, amount: number): string =>
  '#' + [0, 1, 2].map((i) => Math.round(channel(hex, i) + (to - channel(hex, i)) * amount).toString(16).padStart(2, '0')).join('');

/** Ten steps, light to dark; step 6 (index 5) is the base color. */
const ramp = (base: string): string[] =>
  Array.from({ length: 10 }, (_, i) => (i < 5 ? mix(base, 255, (5 - i) * 0.17) : i === 5 ? base : mix(base, 0, (i - 5) * 0.2)));

/** Color ramps: ten steps each, light to dark. */
export const PALETTE_RAMPS: Record<string, string[]> = Object.fromEntries(Object.entries(BASES).map(([k, v]) => [k, ramp(v)]));
export const PALETTE_RAMP_ORDER = Object.keys(BASES);
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
