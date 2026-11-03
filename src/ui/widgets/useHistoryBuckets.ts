import { useEffect, useState } from 'react';
import type { Bucket } from '../../history/downsample';
import { history } from '../../history/shared';

/** Chart refreshes triggered by incoming values are coalesced to at most one per this many ms. */
const REFRESH_MS = 1000;

/**
 * Downsampled history of a metric over the last `windowMs`, reloaded when the metric receives a value
 * (`lastActivity` changes). The `to` end of the window is the time of the query.
 */
export function useHistoryBuckets(metricId: string, windowMs: number, lastActivity: number): { buckets: Bucket[]; from: number; to: number; loaded: boolean } {
  const [state, setState] = useState({ buckets: [] as Bucket[], from: Date.now() - windowMs, to: Date.now(), loaded: false });
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(
      () => {
        const to = Date.now();
        const from = to - windowMs;
        history
          .query(metricId, from, to)
          .then((buckets) => {
            if (!cancelled) setState({ buckets, from, to, loaded: true });
          })
          .catch(() => {
            if (!cancelled) setState((s) => ({ ...s, loaded: true }));
          });
      },
      state.loaded ? REFRESH_MS : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricId, windowMs, lastActivity]);
  return state;
}
