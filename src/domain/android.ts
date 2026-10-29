const NAMED: Record<string, number> = {
  black: 0xff000000,
  darkgray: 0xff444444,
  gray: 0xff888888,
  lightgray: 0xffcccccc,
  white: 0xffffffff,
  red: 0xffff0000,
  green: 0xff00ff00,
  blue: 0xff0000ff,
  yellow: 0xffffff00,
  cyan: 0xff00ffff,
  magenta: 0xffff00ff,
  aqua: 0xff00ffff,
  fuchsia: 0xffff00ff,
  darkgrey: 0xff444444,
  grey: 0xff888888,
  lightgrey: 0xffcccccc,
  lime: 0xff00ff00,
  maroon: 0xff800000,
  navy: 0xff000080,
  olive: 0xff808000,
  purple: 0xff800080,
  silver: 0xffc0c0c0,
  teal: 0xff008080,
};

/** Converts an unsigned 32-bit value to the signed int Java would hold. */
export const toInt32 = (n: number): number => n | 0;

/** android.graphics.Color.parseColor; returns a signed ARGB int or null where Android throws. */
export function parseAndroidColor(text: string): number | null {
  if (text.startsWith('#')) {
    const hex = text.slice(1);
    if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
    if (hex.length === 6) return toInt32(0xff000000 + parseInt(hex, 16));
    if (hex.length === 8) return toInt32(parseInt(hex, 16));
    return null;
  }
  const named = NAMED[text.toLowerCase()];
  return named === undefined ? null : toInt32(named);
}

/** String.format("#%06X", color & 0xFFFFFF). */
export function hexRgb(color: number): string {
  return `#${(color & 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`;
}

/** Color as CSS for React Native (rgba), from an Android ARGB int. */
export function cssColor(color: number): string {
  const a = ((color >>> 24) & 0xff) / 255;
  return `rgba(${(color >> 16) & 0xff}, ${(color >> 8) & 0xff}, ${color & 0xff}, ${a})`;
}

/** Android ARGB int from a #RRGGBB string (alpha 0xFF). */
export function argbFromHex(hex: string): number {
  return toInt32(0xff000000 + parseInt(hex.replace('#', ''), 16));
}
