import { ensureUniqueLongIds, newMetric } from './defaults';
import type { Metric, MetricTypeId } from './types';

/** Gson-style JSON for a list of metrics: Java field names, null values omitted. */
export function serializeMetrics(metrics: Metric[]): string {
  return JSON.stringify(metrics, (_k, v) => (v === null ? undefined : v));
}

const isType = (n: unknown): n is MetricTypeId => n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6 || n === 7;

/** Parses metrics saved or exported by this app or by the original app. */
export function parseMetrics(json: string): Metric[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Invalid metrics payload');
  }
  if (!Array.isArray(data)) throw new Error('Invalid metrics payload');
  const out: Metric[] = [];
  for (const raw of data) {
    if (raw === null || typeof raw !== 'object' || !isType((raw as { type?: unknown }).type)) continue;
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (v !== null) fields[k] = v;
    out.push(newMetric((raw as { type: MetricTypeId }).type, fields as Partial<Metric>));
  }
  return ensureUniqueLongIds(out);
}
