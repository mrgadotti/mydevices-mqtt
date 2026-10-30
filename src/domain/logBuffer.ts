import { pushBounded } from './widgetLogic';

/** One message shown by the log widget. `time` is epoch milliseconds. */
export interface LogLine {
  id: number;
  time: number;
  topic: string;
  payload: string;
  qos: number;
  retained: boolean;
}

export const DEFAULT_LOG_LINES = 500;
export const MIN_LOG_LINES = 10;
export const MAX_LOG_LINES = 5000;
/** Longer payloads are cut so a few huge messages cannot fill the memory or the screen. */
export const MAX_LOG_PAYLOAD = 2000;

/** The configured ring size, clamped to a sane range. */
export function logCapacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LOG_LINES;
  return Math.min(Math.max(Math.round(value), MIN_LOG_LINES), MAX_LOG_LINES);
}

/** Appends a line, dropping the oldest ones beyond `cap` (a ring buffer, newest last). */
export function appendLog(buf: LogLine[], line: LogLine, cap: number): LogLine[] {
  return pushBounded(buf, line, logCapacity(cap));
}

/** Applies a (possibly smaller) capacity to an existing buffer. */
export function trimLog(buf: LogLine[], cap: number): LogLine[] {
  const c = logCapacity(cap);
  return buf.length > c ? buf.slice(buf.length - c) : buf;
}

export function truncatePayload(text: string): string {
  return text.length > MAX_LOG_PAYLOAD ? `${text.slice(0, MAX_LOG_PAYLOAD)}...` : text;
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');

/** HH:MM:SS.mmm in local time. */
export function formatLogTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}.${pad(d.getMilliseconds(), 3)}`;
}

/** Plain-text form of a line: `HH:MM:SS.mmm topic payload [QoS n] [R]`. */
export function formatLogLine(l: LogLine): string {
  return `${formatLogTime(l.time)} ${l.topic} ${l.payload} [QoS ${l.qos}]${l.retained ? ' [R]' : ''}`;
}
