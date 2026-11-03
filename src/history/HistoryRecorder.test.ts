import { newMetric } from '../domain/defaults';
import type { Metric } from '../domain/types';
import { MemoryHistoryDb } from './HistoryDb';
import { HistoryRecorder, PRUNE_EVERY_MS, WINDOW_MS } from './HistoryRecorder';

const hist = (partial: Partial<Metric> = {}): Metric => newMetric(3, { topic: 't/temp', widget: 'historyChart', opts: { minInterval: 10 }, ...partial } as Partial<Metric>);

const setup = () => {
  let now = 1_000_000;
  const db = new MemoryHistoryDb();
  const rec = new HistoryRecorder(db, () => now);
  return { db, rec, advance: (ms: number) => (now += ms), time: () => now };
};

describe('HistoryRecorder', () => {
  it('records numeric payloads of history metrics on their topic only', async () => {
    const { db, rec } = setup();
    const m = hist();
    const other = newMetric(3, { topic: 't/other', widget: 'chart' } as Partial<Metric>);
    await rec.handleMessage([m, other], 't/temp', '21.5');
    await rec.handleMessage([m, other], 't/other', '5');
    expect(db.rows.get(m.id)).toEqual([{ ts: 1_000_000, value: 21.5 }]);
    expect(db.rows.has(other.id)).toBe(false);
  });

  it('ignores non-numeric payloads', async () => {
    const { db, rec } = setup();
    const m = hist({ opts: { minInterval: 0 } });
    for (const p of ['hello', '', 'NaN', 'Infinity', '12abc']) await rec.handleMessage([m], 't/temp', p);
    expect(db.rows.has(m.id)).toBe(false);
  });

  it('extracts the value through the JSON path', async () => {
    const { db, rec } = setup();
    const m = hist({ jsonPath: '$.t', opts: { minInterval: 0 } });
    await rec.handleMessage([m], 't/temp', '{"t": 7.25}');
    await rec.handleMessage([m], 't/temp', '{"x": 1}');
    await rec.handleMessage([m], 't/temp', '{"t": "n/a"}');
    expect(db.rows.get(m.id)?.map((s) => s.value)).toEqual([7.25]);
  });

  it('drops samples closer than minInterval', async () => {
    const { db, rec, advance } = setup();
    const m = hist({ opts: { minInterval: 10 } });
    await rec.handleMessage([m], 't/temp', '1');
    advance(9_999);
    await rec.handleMessage([m], 't/temp', '2');
    advance(1);
    await rec.handleMessage([m], 't/temp', '3');
    expect(db.rows.get(m.id)?.map((s) => s.value)).toEqual([1, 3]);
  });

  it('prunes samples older than the window, at most once per interval', async () => {
    const { db, rec, advance, time } = setup();
    const m = hist({ opts: { minInterval: 0, window: '1h' } });
    await db.record(m.id, time() - WINDOW_MS['1h'] - 1000, 1);
    await rec.handleMessage([m], 't/temp', '2');
    expect(db.rows.get(m.id)?.map((s) => s.value)).toEqual([2]);
    // Another stale row appears; no prune before PRUNE_EVERY_MS has passed.
    await db.record(m.id, time() - WINDOW_MS['1h'] - 1000, 9);
    advance(PRUNE_EVERY_MS - 1);
    await rec.handleMessage([m], 't/temp', '3');
    expect(db.rows.get(m.id)?.map((s) => s.value)).toEqual([2, 9, 3]);
    advance(1);
    await rec.handleMessage([m], 't/temp', '4');
    expect(db.rows.get(m.id)?.map((s) => s.value)).toEqual([2, 3, 4]);
  });

  it('forgets a deleted metric', async () => {
    const { db, rec } = setup();
    const m = hist();
    await rec.handleMessage([m], 't/temp', '1');
    await rec.forget(m.id);
    expect(db.rows.has(m.id)).toBe(false);
  });

  it('serves downsampled queries and the latest sample', async () => {
    const { db } = setup();
    for (let i = 0; i < 1000; i++) await db.record('x', i * 1000, i);
    const out = await db.query('x', 0, 999_000, 300);
    expect(out.length).toBeLessThanOrEqual(300);
    expect((await db.latest('x'))?.value).toBe(999);
    expect(await db.latest('none')).toBeNull();
  });
});
