import { parseAndroidColor } from '../domain/android';
import type { TileDisplay } from '../domain/display';
import type { Metric } from '../domain/types';
import { runScript } from './engine';

/** The `app` object scripts get (AppScriptable). */
export interface ScriptApp {
  /** `openUri(uri)` or, `openUri(action, uri)`. */
  openUri(first: string, second?: string): void;
  publish(topic: string, payload: string, retained: boolean, qos: number): void;
}

export interface HookEnv {
  app: ScriptApp;
  /** `event.data`: runtime user data per tile id, shared by the hooks of that tile, never persisted. */
  data: Map<string, unknown>;
}

const INVALID_COLOR = 'Invalid color format';

/** jsEvalBooleanExpression with the `val` and `secs` constants. */
export function evalBlink(expression: string, val: string | null, secs: number): { value: boolean } | { error: string } {
  if (expression.trim().length === 0) return { value: false };
  const r = runScript(expression, { val, secs });
  return r.ok ? { value: Boolean(r.result) } : { error: r.error };
}

/** MetricMqttScriptableOnReceive: the script may replace `event.payload`. */
export function runOnReceive(m: Metric, topic: string, payload: string, env: HookEnv): { payload: string; error: string } {
  if (m.jsOnReceive.trim().length === 0) return { payload, error: '' };
  const event = { payload, topic, data: env.data.get(m.id), metric: { ...m }, activity: null };
  const r = runScript(m.jsOnReceive, { event, app: env.app });
  env.data.set(m.id, event.data);
  if (!r.ok) return { payload, error: r.error };
  return { payload: String(event.payload), error: '' };
}

/** MetricScriptableOnClick: `event.preventDefault` cancels the tile's own tap action. */
export function runOnTap(m: Metric, env: HookEnv): { preventDefault: boolean; error: string } {
  if (m.jsOnTap.trim().length === 0) return { preventDefault: false, error: '' };
  const event = { preventDefault: false, data: env.data.get(m.id), metric: { ...m }, tile: null, activity: null };
  const r = runScript(m.jsOnTap, { event, app: env.app });
  env.data.set(m.id, event.data);
  if (!r.ok) return { preventDefault: false, error: r.error };
  return { preventDefault: Boolean(event.preventDefault), error: '' };
}

/** The Metric*ScriptableOnDisplay objects: the script edits display values before they are drawn. */
export function runOnDisplay(m: Metric, display: TileDisplay, nowSec: number, env: HookEnv): { display: TileDisplay; error: string } {
  if (m.jsOnDisplay.trim().length === 0) return { display, error: '' };
  const secs = nowSec - m.lastActivity;
  const ev: Record<string, unknown> = {
    name: display.name,
    blink: display.blink,
    lastActivityString: display.bottom,
    data: env.data.get(m.id),
    metric: { ...m },
    tile: null,
    activity: null,
    secondsSinceLastActivity: secs,
    lastPayload: m.lastPayload ?? '',
    getLastPayload: () => m.lastPayload ?? '',
    getSecondsSinceLastActivity: () => secs,
  };
  switch (display.kind) {
    case 'text':
    case 'multi':
      ev.text = display.text;
      ev.textColor = display.color;
      break;
    case 'switch':
      ev.on = display.on;
      ev.iconColor = display.color;
      break;
    case 'range':
      ev.text = display.text;
      ev.progress = display.progress;
      ev.progressColor = display.color;
      break;
    case 'image':
      ev.url = display.url;
      break;
    case 'color':
      ev.color = display.color;
      break;
  }
  const r = runScript(m.jsOnDisplay, { event: ev, app: env.app });
  env.data.set(m.id, ev.data);
  if (!r.ok) return { display: { ...display, error: r.error }, error: r.error };

  const next: TileDisplay = { ...display, name: String(ev.name), blink: Boolean(ev.blink), bottom: String(ev.lastActivityString) };
  const color = (value: unknown): boolean => {
    const s = String(value);
    if (parseAndroidColor(s) === null) {
      next.error = INVALID_COLOR;
      return false;
    }
    next.color = s.startsWith('#') ? `#${s.slice(1).toUpperCase()}` : s;
    return true;
  };
  switch (display.kind) {
    case 'text':
    case 'multi':
      next.text = String(ev.text);
      color(ev.textColor);
      break;
    case 'switch':
      next.on = Boolean(ev.on);
      color(ev.iconColor);
      break;
    case 'range':
      next.text = String(ev.text);
      next.progress = Number(ev.progress);
      color(ev.progressColor);
      break;
    case 'image':
      next.url = String(ev.url);
      break;
    case 'color':
      color(ev.color);
      break;
  }
  return { display: next, error: next.error };
}
