export interface Sample {
  ts: number;
  value: number;
}

/** One downsampled bucket: the time-ordered samples of a slice of the range reduced to min / max / average. */
export interface Bucket {
  /** Center of the bucket's time slice (ms). */
  ts: number;
  min: number;
  max: number;
  avg: number;
  count: number;
}

export const MAX_POINTS = 300;

/** Width in ms of each bucket so that [fromTs, toTs] splits into at most `maxPoints` buckets. */
export function bucketWidth(fromTs: number, toTs: number, maxPoints: number): number {
  return Math.max(1, Math.ceil((toTs - fromTs + 1) / Math.max(1, Math.floor(maxPoints))));
}

/** Index of the bucket a sample belongs to. Shared with the SQL implementation so both group identically. */
export const bucketIndex = (ts: number, fromTs: number, width: number): number => Math.floor((ts - fromTs) / width);

/** Center timestamp of bucket `index`. */
export const bucketCenter = (index: number, fromTs: number, width: number): number => fromTs + index * width + Math.floor(width / 2);

/** Groups the samples inside [fromTs, toTs] into at most `maxPoints` buckets (empty buckets are omitted). */
export function downsample(samples: readonly Sample[], fromTs: number, toTs: number, maxPoints = MAX_POINTS): Bucket[] {
  const width = bucketWidth(fromTs, toTs, maxPoints);
  const acc = new Map<number, { min: number; max: number; sum: number; count: number }>();
  for (const s of samples) {
    if (s.ts < fromTs || s.ts > toTs) continue;
    const i = bucketIndex(s.ts, fromTs, width);
    const b = acc.get(i);
    if (b) {
      b.min = Math.min(b.min, s.value);
      b.max = Math.max(b.max, s.value);
      b.sum += s.value;
      b.count += 1;
    } else acc.set(i, { min: s.value, max: s.value, sum: s.value, count: 1 });
  }
  return [...acc]
    .sort((a, b) => a[0] - b[0])
    .map(([i, b]) => ({ ts: bucketCenter(i, fromTs, width), min: b.min, max: b.max, avg: b.sum / b.count, count: b.count }));
}
