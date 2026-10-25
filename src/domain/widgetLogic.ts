/** Pure helpers of the widget views: stepping, joystick, color picking, chart and terminal buffers. */

/** Next value of a step control; past a limit it clamps, or wraps to the other end when `loop` is set. */
export function stepValue(current: number, dir: 1 | -1, step: number, min: number, max: number, loop: boolean): number {
  const next = current + dir * step;
  if (next > max) return loop ? min : max;
  if (next < min) return loop ? max : min;
  return next;
}

/** Joystick position (each axis -1..1) as the published payload: "x,y" scaled to the min..max range, rounded. */
export function joystickPayload(x: number, y: number, min: number, max: number): string {
  const scale = (v: number) => Math.round(min + ((Math.min(Math.max(v, -1), 1) + 1) / 2) * (max - min));
  return `${scale(x)},${scale(y)}`;
}

/** Parses "x,y" back into -1..1 axes (0,0 when it does not parse). */
export function joystickPosition(payload: string | null, min: number, max: number): { x: number; y: number } {
  const m = payload ? /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(payload) : null;
  if (!m || max <= min) return { x: 0, y: 0 };
  const back = (v: number) => Math.min(Math.max(((v - min) / (max - min)) * 2 - 1, -1), 1);
  return { x: back(Number(m[1])), y: back(Number(m[2])) };
}

const hex2 = (n: number) => Math.round(Math.min(Math.max(n, 0), 255)).toString(16).toUpperCase().padStart(2, '0');

/** HSV (h 0..360, s and v 0..1) to "#RRGGBB". */
export function hsvToHex(h: number, s: number, v: number): string {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
  return `#${hex2((r + m) * 255)}${hex2((g + m) * 255)}${hex2((b + m) * 255)}`;
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return { h: 0, s: 0, v: 1 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: max === 0 ? 0 : d / max, v: max };
}

/** Appends to a bounded buffer (oldest dropped first). */
export function pushBounded<T>(buf: T[], item: T, cap: number): T[] {
  const next = [...buf, item];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/** SVG polyline path of a series scaled into w x h (flat series draw a middle line). */
export function chartPath(values: number[], w: number, h: number): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const dx = values.length > 1 ? w / (values.length - 1) : 0;
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * dx).toFixed(1)} ${(span === 0 ? h / 2 : h - ((v - min) / span) * h).toFixed(1)}`)
    .join(' ');
}

/** Option lookup with a typed default. */
export function opt<T extends string | number | boolean>(opts: Record<string, string | number | boolean> | undefined, key: string, fallback: T): T {
  const v = opts?.[key];
  return typeof v === typeof fallback ? (v as T) : fallback;
}
