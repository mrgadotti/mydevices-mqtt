import { useEffect, useState } from 'react';
import { currentValue, parseJavaFloat } from '../../domain/metrics';
import type { Metric } from '../../domain/types';
import { claimMessage, pushBounded } from '../../domain/widgetLogic';

/** Series and logs live for the app session only; they are filled while a widget that shows them is on screen. */
const series = new Map<string, number[]>();
const logs = new Map<string, string[]>();
/** The last message already recorded per metric, so a widget that remounts does not record it again. */
const seenSeries = new Map<string, string>();
const seenLogs = new Map<string, string>();

/** Numeric history of a metric's payloads (newest last, at most 200). */
export function useSeries(m: Metric): number[] {
  const [data, setData] = useState<number[]>(() => series.get(m.id) ?? []);
  useEffect(() => {
    const raw = currentValue(m);
    const n = raw === null ? null : parseJavaFloat(raw);
    if (n === null || Number.isNaN(n) || m.lastActivity === 0) return;
    if (!claimMessage(seenSeries, m.id, m.lastActivity, String(raw))) return;
    const next = pushBounded(series.get(m.id) ?? [], n, 200);
    series.set(m.id, next);
    setData(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id, m.lastActivity]);
  return data;
}

/** Text lines received by a metric (newest last, at most 200), optionally prefixed with the receive time. */
export function useLog(m: Metric, timestamps: boolean): string[] {
  const [data, setData] = useState<string[]>(() => logs.get(m.id) ?? []);
  useEffect(() => {
    const raw = currentValue(m);
    if (raw === null || m.lastActivity === 0) return;
    if (!claimMessage(seenLogs, m.id, m.lastActivity, raw)) return;
    const stamp = timestamps ? `${new Date(m.lastActivity * 1000).toLocaleTimeString()} ` : '';
    const next = pushBounded(logs.get(m.id) ?? [], `${stamp}${raw}`, 200);
    logs.set(m.id, next);
    setData(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id, m.lastActivity]);
  return data;
}
