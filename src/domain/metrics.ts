import { parseAndroidColor } from './android';
import { extractJsonPath } from './jsonPath';
import type { ImageMetric, Metric, MultiSwitchMetric, RangeMetric, SwitchMetric, TextMetric } from './types';

export interface ReceiveResult<M extends Metric = Metric> {
  metric: M;
  /** The original's `lastPayloadChanged`: drives whether the tile re-renders. */
  changed: boolean;
  /** Original's `lastJSONExceptionMessage`, empty when there was no error. */
  jsonError: string;
}

const hasPath = (m: Metric): boolean => m.jsonPath.length > 0;

/** The value tiles display: the JSON path value when a path is set, else the raw payload. */
export function currentValue(m: Metric): string | null {
  return hasPath(m) ? m.lastJsonPathValue : m.lastPayload;
}

function receiveBasic<M extends Metric>(m: M, payload: string, nowSec: number): ReceiveResult<M> {
  const changed = payload !== m.lastPayload;
  const next: M = { ...m, enteredIntermediateStateAt: 0, lastActivity: nowSec };
  let jsonError = '';
  if (changed) {
    next.lastPayload = payload;
    if (hasPath(m)) {
      const r = extractJsonPath(payload, m.jsonPath);
      if (r.ok) next.lastJsonPathValue = r.value;
      else {
        next.lastJsonPathValue = '';
        jsonError = r.error;
      }
    }
  }
  return { metric: next, changed, jsonError };
}

function receiveSwitch(m: SwitchMetric, payload: string, nowSec: number): ReceiveResult<SwitchMetric> {
  let extracted: string | null = null;
  let jsonError = '';
  let lastJson = m.lastJsonPathValue;
  if (hasPath(m)) {
    const r = extractJsonPath(payload, m.jsonPath);
    if (r.ok) extracted = r.value;
    else {
      lastJson = '';
      jsonError = r.error;
    }
  }
  const candidate = extracted !== null && extracted.length > 0 ? extracted : payload;
  const matches = candidate.length > 0 && (candidate === m.payloadOn || candidate === m.payloadOff);
  if (!matches) return { metric: { ...m, lastJsonPathValue: lastJson }, changed: false, jsonError };
  const changed = payload !== m.lastPayload;
  const next: SwitchMetric = { ...m, enteredIntermediateStateAt: 0, lastActivity: nowSec };
  if (changed) {
    next.lastPayload = payload;
    next.lastJsonPathValue = extracted;
  }
  return { metric: next, changed, jsonError };
}

function receiveImage(m: ImageMetric, payload: string, nowSec: number): ReceiveResult<ImageMetric> {
  if (m.kind === 1) return { metric: m, changed: false, jsonError: '' };
  if (m.kind === 2) {
    const r = receiveBasic(m, payload, nowSec);
    const url = hasPath(m) ? r.metric.lastJsonPathValue : r.metric.lastPayload;
    return { ...r, metric: { ...r.metric, imageUrl: url ?? '' }, changed: true };
  }
  return {
    metric: { ...m, enteredIntermediateStateAt: 0, lastPayload: '', lastActivity: nowSec },
    changed: true,
    jsonError: '',
  };
}

/** Ports MetricBasicMqtt / MetricSwitch / MetricImage `messageReceived`. Pure: returns a new metric. */
export function applyMessage<M extends Metric>(m: M, payload: string, nowSec: number): ReceiveResult<M> {
  if (m.type === 2) return receiveSwitch(m, payload, nowSec) as unknown as ReceiveResult<M>;
  if (m.type === 5) return receiveImage(m, payload, nowSec) as unknown as ReceiveResult<M>;
  return receiveBasic(m, payload, nowSec);
}

export function isSwitchOn(m: SwitchMetric): boolean {
  if (m.lastPayload === null) return false;
  const v = currentValue(m);
  return v !== null && v === m.payloadOn;
}

/** The payload a tap publishes: off when the current value is "on", else on. */
export function nextSwitchPayload(m: SwitchMetric): string {
  const v = currentValue(m) ?? m.payloadOn;
  return v === m.payloadOn ? m.payloadOff : m.payloadOn;
}

/** Java's Float.parseFloat (decimal forms only); null where Java would throw. */
export function parseJavaFloat(text: string): number | null {
  const s = text.trim();
  if (!/^[+-]?(NaN|Infinity|(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?[fFdD]?)$/.test(s)) return null;
  const n = Number(s.replace(/[fFdD]$/, '').replace(/^\+/, ''));
  return Math.fround(n);
}

export function rangeValue(m: RangeMetric): number {
  const s = currentValue(m);
  if (s === null || s.length === 0) return 0;
  const v = parseJavaFloat(s);
  return v === null || Number.isNaN(v) ? 0 : v;
}

/** MetricRange.getProgress: a percentage 0..100. */
export function rangeProgress(m: RangeMetric): number {
  const value = rangeValue(m);
  if (value < m.minValue) return 0;
  if (value > m.maxValue) return 100;
  return Math.fround((value - m.minValue) / Math.fround((m.maxValue - m.minValue) / 100));
}

/** Java String.format("%.Nf", float) in Locale.ROOT: half-up rounding of the float's decimal expansion. */
export function formatFixed(value: number, precision: number): string {
  const p = Math.max(0, Math.min(20, Math.trunc(precision)));
  return Math.fround(value).toFixed(p);
}

/** MetricRange.getStringValue. */
export function rangeLabel(m: RangeMetric): string {
  const shown = m.displayPayloadValue ? rangeValue(m) : rangeProgress(m);
  return `${m.prefix}${formatFixed(shown, m.decimalPrecision)}${m.postfix}`;
}

export function textDisplay(m: TextMetric): string {
  return `${m.prefix}${currentValue(m) ?? ''}${m.postfix}`;
}

export function multiLabel(m: MultiSwitchMetric): string {
  const v = currentValue(m) ?? '';
  const item = m.items.find((i) => i.payload === v);
  return item ? item.label : v;
}

const isNumericString = (s: string): boolean => parseJavaFloat(s) !== null;

function parseJavaInt(s: string): number | null {
  if (!/^[+-]?\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= -2147483648 && n <= 2147483647 ? n : null;
}

/** Color tile logic from MetricsAdapter: numeric payloads are ints formatted as #%06X, others use Color.parseColor. */
export function colorDisplay(m: Metric): { color: number; invalid: boolean } {
  let str = currentValue(m);
  if (str === null) return { color: -1, invalid: false };
  let invalid = false;
  if (isNumericString(str)) {
    const n = parseJavaInt(str);
    if (n === null) invalid = true;
    else str = `#${(n >>> 0).toString(16).toUpperCase().padStart(6, '0')}`;
  }
  const parsed = parseAndroidColor(str);
  if (parsed === null) return { color: -1, invalid: true };
  return { color: parsed, invalid };
}

export const pubTopic = (m: Metric): string => (m.topicPub.length > 0 ? m.topicPub : m.topic);

export const publishQos = (m: Metric): 0 | 1 => (m.qos <= 1 ? (m.qos as 0 | 1) : 1);

export function startPending<M extends Metric>(m: M, nowSec: number): M {
  return { ...m, enteredIntermediateStateAt: nowSec };
}

/** Port of MetricBasicMqtt.isInIntermediateState. */
export function isPending(m: Metric, nowSec: number): boolean {
  if (m.enablePub && !m.updateLastPayloadOnPub && m.enableIntermediateState) {
    return (
      (m.intermediateStateTimeout === 0 && m.enteredIntermediateStateAt > 0) ||
      nowSec - m.enteredIntermediateStateAt <= m.intermediateStateTimeout
    );
  }
  return false;
}

/** What the original does in its publish success callback, for every tile sharing the published topic. */
export function recordPublished(metrics: Metric[], topic: string, payload: string, nowSec: number): Metric[] {
  return metrics.map((m) => {
    const t = pubTopic(m);
    if (t.length === 0 || t !== topic) return m;
    if (m.type === 2 && payload !== m.payloadOn && payload !== m.payloadOff) return m;
    let next: Metric = m;
    if (m.updateLastPayloadOnPub) next = { ...next, lastPayload: payload, lastActivity: nowSec };
    return { ...next, enteredIntermediateStateAt: nowSec };
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ago = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? '' : 's'} ago`;

/** DateUtils.getRelativeTimeSpanString(then, now, SECOND_IN_MILLIS), in English. Empty when never. */
export function relativeTimeSpan(thenSec: number, nowSec: number): string {
  if (thenSec === 0) return '';
  const d = nowSec - thenSec;
  if (d < 60) return ago(Math.max(0, d), 'second');
  if (d < 3600) return ago(Math.floor(d / 60), 'minute');
  if (d < 86400) return ago(Math.floor(d / 3600), 'hour');
  if (d < 7 * 86400) return ago(Math.floor(d / 86400), 'day');
  const then = new Date(thenSec * 1000);
  const sameYear = then.getFullYear() === new Date(nowSec * 1000).getFullYear();
  return `${MONTHS[then.getMonth()]} ${then.getDate()}${sameYear ? '' : `, ${then.getFullYear()}`}`;
}
