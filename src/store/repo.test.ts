import { newBroker, newMetric } from '../domain/defaults';
import { MemoryKV, Repo } from './repo';

describe('Repo', () => {
  it('returns empty lists on a fresh install', async () => {
    const repo = new Repo(new MemoryKV());
    expect(await repo.loadBrokers()).toEqual([]);
    expect(await repo.loadMetrics('x')).toEqual([]);
  });

  it('round-trips brokers', async () => {
    const repo = new Repo(new MemoryKV());
    const b = [newBroker({ name: 'a', longId: 1 }), newBroker({ name: 'b', longId: 2 })];
    await repo.saveBrokers(b);
    expect(await repo.loadBrokers()).toEqual(b);
  });

  it('keeps metrics per broker in the Gson json format', async () => {
    const kv = new MemoryKV();
    const repo = new Repo(kv);
    const m = [newMetric(1, { name: 'T', longId: 1, lastPayload: 'x' })];
    await repo.saveMetrics('b1', m);
    expect(JSON.parse((await kv.getItem('metrics:b1'))!)[0]).toMatchObject({ type: 1, name: 'T', lastPayload: 'x' });
    expect(await repo.loadMetrics('b1')).toEqual(m);
    expect(await repo.loadMetrics('b2')).toEqual([]);
  });

  it('survives corrupt stored data', async () => {
    const kv = new MemoryKV();
    await kv.setItem('brokers', '{oops');
    await kv.setItem('metrics:b', 'nope');
    const repo = new Repo(kv);
    expect(await repo.loadBrokers()).toEqual([]);
    expect(await repo.loadMetrics('b')).toEqual([]);
  });

  it('fills missing broker fields with the original defaults and fixes duplicate ids', async () => {
    const kv = new MemoryKV();
    await kv.setItem('brokers', JSON.stringify([{ name: 'old', address: 'h' }, { name: 'dup', longId: 0 }]));
    const list = await new Repo(kv).loadBrokers();
    expect(list[0]).toMatchObject({ name: 'old', address: 'h', port: '1883', keepScreenOn: true });
    expect(list[0].longId).not.toBe(list[1].longId);
  });

  it('deleteBrokerData removes the broker metrics', async () => {
    const kv = new MemoryKV();
    const repo = new Repo(kv);
    await repo.saveMetrics('b', [newMetric(1, { longId: 1 })]);
    await repo.deleteMetrics('b');
    expect(await kv.getItem('metrics:b')).toBeNull();
  });

  describe('default broker', () => {
    it('seeds test.mosquitto.org on the first run only', async () => {
      const kv = new MemoryKV();
      const repo = new Repo(kv);
      const first = await repo.loadBrokersSeeded();
      expect(first).toHaveLength(1);
      expect(first[0]).toMatchObject({ name: 'test.mosquitto.org', address: 'test.mosquitto.org', port: '1883', ssl: false, user: '', longId: 1 });
      expect(await repo.loadBrokersSeeded()).toEqual(first);
    });

    it('does not bring a deleted default broker back', async () => {
      const repo = new Repo(new MemoryKV());
      await repo.loadBrokersSeeded();
      await repo.saveBrokers([]);
      expect(await repo.loadBrokersSeeded()).toEqual([]);
    });

    it('does not seed over existing brokers', async () => {
      const kv = new MemoryKV();
      const repo = new Repo(kv);
      await repo.saveBrokers([newBroker({ name: 'mine', longId: 1 })]);
      const list = await repo.loadBrokersSeeded();
      expect(list.map((b) => b.name)).toEqual(['mine']);
    });
  });
});
