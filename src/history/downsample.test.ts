import { bucketWidth, downsample, type Sample } from './downsample';

describe('downsample', () => {
  it('returns at most maxPoints buckets, ordered, with min/max/avg', () => {
    const samples: Sample[] = [];
    for (let i = 0; i < 1000; i++) samples.push({ ts: i * 10, value: i });
    const out = downsample(samples, 0, 9990, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.reduce((n, b) => n + b.count, 0)).toBe(1000);
    for (let i = 1; i < out.length; i++) expect(out[i].ts).toBeGreaterThan(out[i - 1].ts);
    const first = out[0];
    expect(first.min).toBe(0);
    expect(first.max).toBe(first.count - 1);
    expect(first.avg).toBeCloseTo((first.count - 1) / 2);
  });

  it('keeps every sample when there are fewer than maxPoints, and omits empty buckets', () => {
    const out = downsample([{ ts: 0, value: 1 }, { ts: 5000, value: 3 }], 0, 10000, 300);
    expect(out.map((b) => [b.min, b.max, b.avg, b.count])).toEqual([[1, 1, 1, 1], [3, 3, 3, 1]]);
  });

  it('ignores samples outside the range and handles an empty input', () => {
    expect(downsample([], 0, 100, 10)).toEqual([]);
    expect(downsample([{ ts: -1, value: 1 }, { ts: 101, value: 2 }], 0, 100, 10)).toEqual([]);
  });

  it('computes a positive bucket width even for a degenerate range', () => {
    expect(bucketWidth(5, 5, 300)).toBe(1);
    expect(bucketWidth(0, 299, 300)).toBe(1);
    expect(bucketWidth(0, 300, 300)).toBe(2);
  });
});
