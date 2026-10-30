import { useSyncExternalStore } from 'react';
import { appendLog, DEFAULT_LOG_LINES, logCapacity, trimLog, truncatePayload, type LogLine } from '../../domain/logBuffer';
import { mqttTopicMatches } from '../../domain/topicFilter';
import type { Metric } from '../../domain/types';
import { widgetKindOf } from '../../domain/widgets';
import { opt } from '../../domain/widgetLogic';

/**
 * Buffers of the log widgets, by metric id. They live in memory for the app session only (not persisted) and are
 * filled by the dashboard session, so they only record while that dashboard is open (no background logging).
 */
const buffers = new Map<string, LogLine[]>();
const listeners = new Set<() => void>();
const EMPTY: LogLine[] = [];
let nextId = 1;
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

/** Message bursts notify the views once per 100 ms. */
function notify(): void {
  if (notifyTimer) return;
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    for (const l of [...listeners]) l();
  }, 100);
}

export const logCapacityOf = (m: Metric): number => logCapacity(opt(m.opts, 'maxLines', DEFAULT_LOG_LINES));

/**
 * The generic, wildcard-aware message tap: appends the message to every log widget of `metrics` whose topic filter
 * matches the concrete `topic`. Returns how many widgets took it.
 */
export function feedLogs(metrics: Metric[], topic: string, payload: string, qos: number, retained: boolean, nowMs: number): number {
  let hits = 0;
  for (const m of metrics) {
    if (m.topic.length === 0 || widgetKindOf(m) !== 'log' || !mqttTopicMatches(m.topic, topic)) continue;
    const line: LogLine = { id: nextId++, time: nowMs, topic, payload: truncatePayload(payload), qos, retained };
    buffers.set(m.id, appendLog(buffers.get(m.id) ?? EMPTY, line, logCapacityOf(m)));
    hits++;
  }
  if (hits > 0) notify();
  return hits;
}

export function clearLog(metricId: string): void {
  buffers.set(metricId, EMPTY);
  for (const l of [...listeners]) l();
}

/** Applies a changed "max lines" option to what is already buffered. */
function fit(metric: Metric): LogLine[] {
  const buf = buffers.get(metric.id) ?? EMPTY;
  const trimmed = trimLog(buf, logCapacityOf(metric));
  if (trimmed !== buf) buffers.set(metric.id, trimmed);
  return trimmed;
}

export function getLog(metric: Metric): LogLine[] {
  return fit(metric);
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Lines received by a log widget (newest last). */
export function useLogLines(metric: Metric): LogLine[] {
  return useSyncExternalStore(subscribe, () => fit(metric));
}

/** Test helper. */
export function resetLogs(): void {
  buffers.clear();
  if (notifyTimer) clearTimeout(notifyTimer);
  notifyTimer = null;
}
