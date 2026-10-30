import { newBroker, newMetric } from '../domain/defaults';
import type { Broker, Metric } from '../domain/types';
import { utf8 } from '../mqtt/text';
import { BackgroundMqtt, type ConnectionLike } from './BackgroundMqtt';

class FakeConn implements ConnectionLike {
  status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  started = false;
  stopped = false;
  subs: { topic: string; qos: number }[] = [];
  private msg: ((t: string, p: Uint8Array, r: boolean) => void)[] = [];
  private st: ((s: 'disconnected' | 'connecting' | 'connected', e?: string) => void)[] = [];
  constructor(public readonly broker: Broker) {}
  start() { this.started = true; }
  stop() { this.stopped = true; this.status = 'disconnected'; }
  setSubscriptions(l: { topic: string; qos: number }[]) { this.subs = l; }
  published: unknown[][] = [];
  publish(topic: string, payload: string, qos: number, retain: boolean) { this.published.push([topic, payload, qos, retain]); return Promise.resolve(); }
  onMessage(cb: (t: string, p: Uint8Array, r: boolean) => void) { this.msg.push(cb); return () => {}; }
  onStatus(cb: (s: 'disconnected' | 'connecting' | 'connected', e?: string) => void) { this.st.push(cb); return () => {}; }
  emit(topic: string, text: string) { this.msg.forEach((cb) => cb(topic, utf8(text), false)); }
  setStatus(s: 'disconnected' | 'connecting' | 'connected') { this.status = s; this.st.forEach((cb) => cb(s)); }
}

const setup = () => {
  const conns: FakeConn[] = [];
  const notes: { title: string; body: string; id: string }[] = [];
  const updated: Metric[] = [];
  const statuses: string[][] = [];
  const bg = new BackgroundMqtt({
    createConnection: (b) => { const c = new FakeConn(b); conns.push(c); return c; },
    notify: (content, id) => notes.push({ ...content, id }),
    applyRuntime: (_b, m) => updated.push(m),
    now: () => 1000,
    onActiveChange: (names) => statuses.push(names),
    hookEnv: (publish) => ({ app: { publish, openUri() {} }, data: new Map() }),
  });
  return { bg, conns, notes, updated, statuses };
};

const broker = newBroker({ name: 'home', address: 'h', id: 'b1', clientId: 'mqttiot-aaaa1111' });

describe('BackgroundMqtt', () => {
  it('opens one connection per broker that has a notification tile and subscribes its topics', () => {
    const { bg, conns } = setup();
    const t1 = newMetric(7, { name: 'Door', topic: 'home/door', qos: 1 });
    const t2 = newMetric(7, { name: 'Window', topic: 'home/window' });
    const plain = newMetric(1, { topic: 'home/temp' });
    bg.sync([broker, newBroker({ id: 'b2' })], { b1: [t1, t2, plain], b2: [plain] });
    expect(conns).toHaveLength(1);
    expect(conns[0].started).toBe(true);
    expect(conns[0].subs.sort((a, b) => a.topic.localeCompare(b.topic))).toEqual([
      { topic: 'home/door', qos: 1 },
      { topic: 'home/window', qos: 0 },
    ]);
  });

  it('uses its own client id so it never collides with the dashboard session', () => {
    const { bg, conns } = setup();
    bg.sync([broker], { b1: [newMetric(7, { topic: 't' })] });
    expect(conns[0].broker.clientId).toBe('mqttiot-aaaa1111-bg');
    expect(broker.clientId).toBe('mqttiot-aaaa1111');
  });

  it('shows a notification for a message on a notification tile topic', () => {
    const { bg, conns, notes, updated } = setup();
    const t = newMetric(7, { name: 'Door', topic: 'home/door' });
    bg.sync([broker], { b1: [t] });
    conns[0].emit('home/door', 'OPEN');
    expect(notes).toEqual([{ title: 'Door', body: 'OPEN', id: t.id }]);
    expect(updated[0]).toMatchObject({ id: t.id, lastPayload: 'OPEN', lastActivity: 1000 });
  });

  it('ignores other topics and wildcard lookalikes', () => {
    const { bg, conns, notes } = setup();
    bg.sync([broker], { b1: [newMetric(7, { name: 'D', topic: 'a/b' })] });
    conns[0].emit('a/c', 'x');
    conns[0].emit('a/#', 'x');
    expect(notes).toEqual([]);
  });

  it('honours onlyOnChange across messages', () => {
    const { bg, conns, notes } = setup();
    bg.sync([broker], { b1: [newMetric(7, { name: 'D', topic: 't', onlyOnChange: true })] });
    conns[0].emit('t', 'A');
    conns[0].emit('t', 'A');
    conns[0].emit('t', 'B');
    expect(notes.map((n) => n.body)).toEqual(['A', 'B']);
  });

  it('applies the on-receive script before notifying', () => {
    const { bg, conns, notes } = setup();
    bg.sync([broker], { b1: [newMetric(7, { name: 'D', topic: 't', jsOnReceive: 'event.payload = "Alert: " + event.payload' })] });
    conns[0].emit('t', 'fire');
    expect(notes[0].body).toBe('Alert: fire');
  });

  it('keeps the same connection when nothing relevant changed and updates subscriptions when topics change', () => {
    const { bg, conns } = setup();
    const t = newMetric(7, { topic: 'a' });
    bg.sync([broker], { b1: [t] });
    bg.sync([{ ...broker, name: 'renamed' }], { b1: [t] });
    expect(conns).toHaveLength(1);
    bg.sync([broker], { b1: [{ ...t, topic: 'b' }] });
    expect(conns).toHaveLength(1);
    expect(conns[0].subs).toEqual([{ topic: 'b', qos: 0 }]);
  });

  it('reconnects with a new connection when the broker address changes', () => {
    const { bg, conns } = setup();
    const t = newMetric(7, { topic: 'a' });
    bg.sync([broker], { b1: [t] });
    bg.sync([{ ...broker, address: 'other' }], { b1: [t] });
    expect(conns).toHaveLength(2);
    expect(conns[0].stopped).toBe(true);
  });

  it('closes the connection when the last notification tile goes away or the broker is removed', () => {
    const { bg, conns } = setup();
    const t = newMetric(7, { topic: 'a' });
    bg.sync([broker], { b1: [t] });
    bg.sync([broker], { b1: [] });
    expect(conns[0].stopped).toBe(true);
    bg.sync([broker], { b1: [t] });
    bg.sync([], {});
    expect(conns[1].stopped).toBe(true);
  });

  it('ignores notification tiles with no topic', () => {
    const { bg, conns } = setup();
    bg.sync([broker], { b1: [newMetric(7, { topic: '' })] });
    expect(conns).toHaveLength(0);
  });

  it('reports which brokers are being watched, for the service notification', () => {
    const { bg, statuses } = setup();
    bg.sync([broker], { b1: [newMetric(7, { topic: 'a' })] });
    bg.sync([broker], { b1: [] });
    expect(statuses).toEqual([['home'], []]);
  });

  it('stopAll closes everything', () => {
    const { bg, conns } = setup();
    bg.sync([broker], { b1: [newMetric(7, { topic: 'a' })] });
    bg.stopAll();
    expect(conns[0].stopped).toBe(true);
  });

  it('is not fooled when the dashboard stores the same message before the service sees it', () => {
    const { bg, conns, notes } = setup();
    const t = newMetric(7, { name: 'D', topic: 't', onlyOnChange: true });
    bg.sync([broker], { b1: [t] });
    // the dashboard session already stored "A" for this tile, then the store change triggers a sync
    bg.sync([broker], { b1: [{ ...t, lastPayload: 'A', lastActivity: 5 }] });
    conns[0].emit('t', 'A');
    expect(notes.map((n) => n.body)).toEqual(['A']);
  });

  it('lets on-receive scripts publish through the service connection', () => {
    const { bg, conns } = setup();
    bg.sync([broker], { b1: [newMetric(7, { name: 'D', topic: 't', jsOnReceive: "app.publish('ack', 'ok', true, 2)" })] });
    conns[0].emit('t', 'x');
    expect((conns[0] as unknown as { published: unknown[][] }).published).toEqual([['ack', 'ok', 1, true]]);
  });
});
