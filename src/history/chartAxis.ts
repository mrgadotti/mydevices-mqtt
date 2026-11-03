import { WINDOW_MS, DEFAULT_WINDOW } from './HistoryRecorder';

const DAY_MS = 24 * 3_600_000;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Chart window option ("1h", "24h", "7d"...) in milliseconds; unknown values fall back to the default window. */
export function windowToMs(window: string): number {
  return WINDOW_MS[window] ?? WINDOW_MS[DEFAULT_WINDOW];
}

/** X axis label (local time): HH:mm for windows up to 24 h, dd/MM for longer ones. */
export function formatAxisTime(ts: number, windowMs: number): string {
  const d = new Date(ts);
  return windowMs <= DAY_MS ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Tooltip date and time (local): "dd/MM HH:mm", with seconds for windows up to one hour. */
export function formatTooltipTime(ts: number, windowMs: number): string {
  const d = new Date(ts);
  const secs = windowMs <= 3_600_000 ? `:${pad(d.getSeconds())}` : '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}${secs}`;
}

/** Compact number for Y axis labels and the tooltip: at most 2 decimals, k / M suffixes from 10 000. */
export function formatValueLabel(v: number): string {
  if (!Number.isFinite(v)) return '';
  const a = Math.abs(v);
  const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)));
  if (a >= 1_000_000) return `${trim(v / 1_000_000, 1)}M`;
  if (a >= 10_000) return `${trim(v / 1000, 1)}k`;
  if (a >= 100) return trim(v, 0);
  if (a >= 10) return trim(v, 1);
  return trim(v, 2);
}
