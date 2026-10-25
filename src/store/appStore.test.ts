import { newBroker, newMetric } from '../domain/defaults';
import { createAppStore } from './appStore';
import { MemoryKV, Repo } from './repo';

const make = async () => {
  const kv = new MemoryKV();
  const store = createAppStore(new Repo(kv));
  await store.getState().load();
  return { store, kv };
};

describe('appStore', () => {
  it('loads with the default broker on first run', async () => {
    const { store } = await make();
    expect(store.getState().ready).toBe(true);
    expect(store.getState().brokers.map((b) => b.address)).toEqual(['test.mosquitto.org']);
  });

  it('adds brokers with sequential long ids and persists them', async () => {
    const { store, kv } = await make();
    const b = store.getState().addBroker(newBroker({ name: 'home' }));
    expect(b.longId).toBe(2);
    const reloaded = createAppStore(new Repo(kv));
    await reloaded.getState().load();
    expect(reloaded.getState().brokers.map((x) => x.name)).toEqual(['test.mosquitto.org', 'home']);
  });

  it('updates and removes brokers, removing their metrics too', async () => {
    const { store, kv } = await make();
    const b = store.getState().addBroker(newBroker({ name: 'x' }));
    store.getState().addMetric(b.id, newMetric(1, { name: 'm' }));
    store.getState().updateBroker({ ...b, name: 'y' });
    expect(store.getState().brokers.find((x) => x.id === b.id)!.name).toBe('y');
    store.getState().removeBroker(b.id);
    expect(store.getState().brokers.find((x) => x.id === b.id)).toBeUndefined();
    expect(store.getState().metrics[b.id]).toBeUndefined();
    expect(await kv.getItem(`metrics:${b.id}`)).toBeNull();
  });

  it('reorders brokers', async () => {
    const { store } = await make();
    store.getState().addBroker(newBroker({ name: 'a' }));
    store.getState().addBroker(newBroker({ name: 'b' }));
    store.getState().moveBroker(0, 2);
    expect(store.getState().brokers.map((x) => x.name)).toEqual(['a', 'b', 'test.mosquitto.org']);
  });

  it('adds metrics with sequential long ids, clones with a fresh id, edits and deletes', async () => {
    const { store } = await make();
    const bid = store.getState().brokers[0].id;
    const a = store.getState().addMetric(bid, newMetric(1, { name: 'a' }));
    const b = store.getState().addMetric(bid, newMetric(2, { name: 'b' }));
    expect([a.longId, b.longId]).toEqual([1, 2]);
    store.getState().applyRuntime(bid, { ...a, lastPayload: 'x', lastJsonPathValue: 'y', lastActivity: 9 });
    const c = store.getState().cloneMetric(bid, a.id)!;
    expect(c).toMatchObject({ name: 'a', longId: 3, lastPayload: null, lastJsonPathValue: null, lastActivity: 0 });
    expect(c.id).not.toBe(a.id);
    // inserted right after the original, like the original app
    expect(store.getState().metrics[bid].map((m) => m.longId)).toEqual([1, 3, 2]);
    store.getState().updateMetric(bid, { ...a, name: 'a2' });
    expect(store.getState().metrics[bid].find((m) => m.id === a.id)!.name).toBe('a2');
    store.getState().removeMetric(bid, b.id);
    expect(store.getState().metrics[bid].map((m) => m.name)).toEqual(['a2', 'a']);
  });

  it('reorders metrics and replaces them on import', async () => {
    const { store } = await make();
    const bid = store.getState().brokers[0].id;
    store.getState().addMetric(bid, newMetric(1, { name: 'a' }));
    store.getState().addMetric(bid, newMetric(1, { name: 'b' }));
    store.getState().moveMetric(bid, 0, 1);
    expect(store.getState().metrics[bid].map((m) => m.name)).toEqual(['b', 'a']);
    store.getState().replaceMetrics(bid, [newMetric(3, { name: 'imported', longId: 1 })]);
    expect(store.getState().metrics[bid].map((m) => m.name)).toEqual(['imported']);
  });

  it('applyRuntime stores tile state without touching the rest', async () => {
    const { store, kv } = await make();
    const bid = store.getState().brokers[0].id;
    const m = store.getState().addMetric(bid, newMetric(1, { name: 'a', topic: 't' }));
    store.getState().applyRuntime(bid, { ...m, lastPayload: '5', lastActivity: 10 });
    expect(store.getState().metrics[bid][0]).toMatchObject({ lastPayload: '5', name: 'a' });
    await store.getState().flush();
    expect(JSON.parse((await kv.getItem(`metrics:${bid}`))!)[0].lastPayload).toBe('5');
  });

  it('applyRuntimeBatch applies several updates with one store write', async () => {
    const { store } = await make();
    const bid = store.getState().brokers[0].id;
    const a = store.getState().addMetric(bid, newMetric(1, { name: 'a', topic: 'a' }));
    const b = store.getState().addMetric(bid, newMetric(1, { name: 'b', topic: 'b' }));
    let writes = 0;
    const off = store.subscribe(() => writes++);
    store.getState().applyRuntimeBatch(bid, [{ ...a, lastPayload: '1' }, { ...b, lastPayload: '2' }]);
    off();
    expect(writes).toBe(1);
    expect(store.getState().metrics[bid].map((m) => m.lastPayload)).toEqual(['1', '2']);
  });

  it('keeps a single auto-connect broker', async () => {
    const { store } = await make();
    const a = store.getState().addBroker(newBroker({ name: 'a', autoConnect: true }));
    const b = store.getState().addBroker(newBroker({ name: 'b', autoConnect: true }));
    expect(store.getState().brokers.filter((x) => x.autoConnect).map((x) => x.name)).toEqual(['b']);
    store.getState().updateBroker({ ...a, autoConnect: true });
    expect(store.getState().brokers.filter((x) => x.autoConnect).map((x) => x.name)).toEqual(['a']);
    store.getState().updateBroker({ ...b, autoConnect: false });
    expect(store.getState().brokers.filter((x) => x.autoConnect).map((x) => x.name)).toEqual(['a']);
  });

  describe('widget grid', () => {
    const setup = async () => {
      const { store } = await make();
      const b = store.getState().brokers[0];
      const a = store.getState().addMetric(b.id, newMetric(1, { name: 'a' }));
      const c = store.getState().addMetric(b.id, newMetric(1, { name: 'c' }));
      return { store, b, a, c };
    };

    it('materializes the auto layout once and keeps it when a widget is removed', async () => {
      const { store, b, a, c } = await setup();
      store.getState().materializeLayout(b.id);
      const before = store.getState().metrics[b.id].find((m) => m.id === c.id)!;
      expect(before.gw).toBe(6);
      store.getState().removeMetric(b.id, a.id);
      const after = store.getState().metrics[b.id].find((m) => m.id === c.id)!;
      expect([after.gx, after.gy]).toEqual([before.gx, before.gy]);
    });

    it('moves a widget to a free spot and refuses an overlap', async () => {
      const { store, b, a, c } = await setup();
      store.getState().materializeLayout(b.id);
      expect(store.getState().setWidgetRect(b.id, a.id, { x: 0, y: 10, w: 6, h: 4 })).toBe(true);
      const moved = store.getState().metrics[b.id].find((m) => m.id === a.id)!;
      expect([moved.gx, moved.gy]).toEqual([0, 10]);
      const cm = store.getState().metrics[b.id].find((m) => m.id === c.id)!;
      expect(store.getState().setWidgetRect(b.id, a.id, { x: cm.gx!, y: cm.gy!, w: 6, h: 4 })).toBe(false);
      expect(store.getState().metrics[b.id].find((m) => m.id === a.id)!.gy).toBe(10);
    });
  });
});
