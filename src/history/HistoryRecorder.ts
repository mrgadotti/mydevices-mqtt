import { extractJsonPath } from '../domain/jsonPath';
import { parseJavaFloat } from '../domain/metrics';
import type { Metric } from '../domain/types';
import { widgetKindOf } from '../domain/widgets';
import { opt } from '../domain/widgetLogic';
import type { HistoryDb } from './HistoryDb';

export const WINDOW_MS: Record<string, number> = {
  '1h': 3_600_000,
  '6h': 6 * 3_600_000,
  '24h': 24 * 3_600_000,
  '7d': 7 * 24 * 3_600_000,
  '30d': 30 * 24 * 3_600_000,
};
export const DEFAULT_WINDOW = '24h';
export const DEFAULT_MIN_INTERVAL_S = 10;
/** Old samples are removed at most this often per metric. */
export const PRUNE_EVERY_MS = 5 * 60_000;

export const isHistoryMetric = (m: Metric): boolean => widgetKindOf(m) === 'historyChart';

/** Retention / chart window of a history metric in ms. */
export function windowMs(m: Metric): number {
  return WINDOW_MS[opt(m.opts, 'window', DEFAULT_WINDOW)] ?? WINDOW_MS[DEFAULT_WINDOW];
}

/** The number a payload contributes to a history chart (through the metric's JSON path when set), or null. */
export function sampleValue(m: Metric, payload: string): number | null {
  let text = payload;
  if (m.jsonPath.length > 0) {
    const r = extractJsonPath(payload, m.jsonPath);
    if (!r.ok) return null;
    text = r.value;
  }
  const n = parseJavaFloat(text);
  return n === null || !Number.isFinite(n) ? null : n;
}

/**
 * Records the numeric payloads of every `historyChart` metric into a HistoryDb. Lives outside the UI, so any
 * message source (dashboard session, foreground service) can feed it; sources receiving the same message are
 * deduplicated by the minimum interval.
 */
export class HistoryRecorder {
  private readonly lastRecorded = new Map<string, number>();
  private readonly lastPrune = new Map<string, number>();

  constructor(
    private readonly db: HistoryDb,
    private readonly now: () => number = Date.now,
  ) {}

  /** Feeds a received message. `metrics` is any metric list; only history metrics on `topic` record. */
  async handleMessage(metrics: readonly Metric[], topic: string, payload: string): Promise<void> {
    const ts = this.now();
    for (const m of metrics) {
      if (m.topic.length === 0 || m.topic !== topic || !isHistoryMetric(m)) continue;
      const value = sampleValue(m, payload);
      if (value === null) continue;
      const minMs = Math.max(0, opt(m.opts, 'minInterval', DEFAULT_MIN_INTERVAL_S)) * 1000;
      const last = this.lastRecorded.get(m.id);
      if (last !== undefined && ts - last < minMs) continue;
      this.lastRecorded.set(m.id, ts);
      try {
        await this.db.record(m.id, ts, value);
        const pruned = this.lastPrune.get(m.id);
        if (pruned === undefined || ts - pruned >= PRUNE_EVERY_MS) {
          this.lastPrune.set(m.id, ts);
          await this.db.prune(m.id, ts - windowMs(m));
        }
      } catch {
        // History is best effort: a storage error must never disturb message handling.
      }
    }
  }

  /** Drops a deleted metric's samples. */
  async forget(metricId: string): Promise<void> {
    this.lastRecorded.delete(metricId);
    this.lastPrune.delete(metricId);
    try {
      await this.db.remove(metricId);
    } catch {
      // best effort
    }
  }
}
