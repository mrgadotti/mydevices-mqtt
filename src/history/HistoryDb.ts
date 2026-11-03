import { downsample, MAX_POINTS, type Bucket, type Sample } from './downsample';

/** Storage behind the history charts. Implemented over SQLite on the device and in memory for tests. */
export interface HistoryDb {
  record(metricId: string, ts: number, value: number): Promise<void>;
  /** Downsampled buckets of the samples in [fromTs, toTs], oldest first, at most `maxPoints` of them. */
  query(metricId: string, fromTs: number, toTs: number, maxPoints?: number): Promise<Bucket[]>;
  /** Deletes the samples older than `olderThanTs`. */
  prune(metricId: string, olderThanTs: number): Promise<void>;
  /** The newest sample of the metric, or null. */
  latest(metricId: string): Promise<Sample | null>;
  /** Deletes every sample of the metric. */
  remove(metricId: string): Promise<void>;
}

/** In-memory HistoryDb (tests). */
export class MemoryHistoryDb implements HistoryDb {
  readonly rows = new Map<string, Sample[]>();

  async record(metricId: string, ts: number, value: number): Promise<void> {
    const list = this.rows.get(metricId) ?? [];
    list.push({ ts, value });
    this.rows.set(metricId, list);
  }

  async query(metricId: string, fromTs: number, toTs: number, maxPoints = MAX_POINTS): Promise<Bucket[]> {
    return downsample(this.rows.get(metricId) ?? [], fromTs, toTs, maxPoints);
  }

  async prune(metricId: string, olderThanTs: number): Promise<void> {
    const list = this.rows.get(metricId);
    if (list) this.rows.set(metricId, list.filter((s) => s.ts >= olderThanTs));
  }

  async latest(metricId: string): Promise<Sample | null> {
    const list = this.rows.get(metricId) ?? [];
    return list.reduce<Sample | null>((best, s) => (best === null || s.ts >= best.ts ? s : best), null);
  }

  async remove(metricId: string): Promise<void> {
    this.rows.delete(metricId);
  }
}
