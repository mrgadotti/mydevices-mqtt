import { FakeBroker, settle } from './fakeBroker';
import { MqttConnection } from './MqttConnection';

const setup = () => {
  const link = new FakeBroker();
  const conn = new MqttConnection({ clientId: 'c', keepAlive: 30, connect: link.factory }, { retryMs: 5000 });
  const subscribes = () => link.of('subscribe').flatMap((p) => p.subscriptions.map((x) => x.topic));
  return { link, conn, subscribes };
};

/** Fake timers, but leave the stream scheduling (nextTick / setImmediate) real. */
const timers = () => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });

describe('MqttConnection', () => {
  beforeEach(() => timers());
  afterEach(() => jest.useRealTimers());

  it('subscribes the wanted topics once connected, highest qos wins for duplicates', async () => {
    const { link, conn, subscribes } = setup();
    conn.setSubscriptions([{ topic: 'a', qos: 0 }, { topic: 'a', qos: 1 }, { topic: 'b', qos: 0 }]);
    conn.start();
    await link.up();
    await jest.advanceTimersByTimeAsync(1);
    await settle();
    expect(subscribes().sort()).toEqual(['a', 'b']);
  });

  it('diffs subscriptions while connected', async () => {
    const { link, conn, subscribes } = setup();
    conn.start();
    await link.up();
    conn.setSubscriptions([{ topic: 'a', qos: 0 }]);
    await jest.advanceTimersByTimeAsync(1);
    await settle();
    conn.setSubscriptions([{ topic: 'b', qos: 0 }]);
    await jest.advanceTimersByTimeAsync(1);
    await settle();
    expect(subscribes()).toEqual(['a', 'b']);
    expect(link.types).toContain('unsubscribe');
  });

  it('reconnects after 5 seconds and resubscribes', async () => {
    const { link, conn, subscribes } = setup();
    conn.setSubscriptions([{ topic: 'a', qos: 0 }]);
    conn.start();
    await link.up();
    await jest.advanceTimersByTimeAsync(1);
    await settle();
    link.drop('lost');
    await settle();
    expect(conn.status).toBe('disconnected');
    await jest.advanceTimersByTimeAsync(4999);
    expect(link.attempts).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    await settle();
    expect(link.attempts).toBe(2);
    await link.up();
    await jest.advanceTimersByTimeAsync(1);
    await settle();
    expect(subscribes()).toEqual(['a', 'a']);
  });

  it('reconnectNow() skips the retry delay and is a no-op while connected or stopped', async () => {
    const { link, conn, subscribes } = setup();
    conn.start();
    await link.up();
    await jest.advanceTimersByTimeAsync(1);
    await settle();
    conn.reconnectNow();
    expect(link.attempts).toBe(1);
    link.drop('lost');
    await settle();
    conn.reconnectNow();
    expect(link.attempts).toBe(2);
    await jest.advanceTimersByTimeAsync(5000);
    expect(link.attempts).toBe(2);
    conn.stop();
    conn.reconnectNow();
    expect(link.attempts).toBe(2);
  });

  it('keeps retrying after a refused connection', async () => {
    const { link, conn, subscribes } = setup();
    conn.start();
    link.connackCode = 5;
    await link.up();
    expect(conn.lastError).toBe('Not authorized');
    await jest.advanceTimersByTimeAsync(5000);
    expect(link.attempts).toBe(2);
  });

  it('stop() disconnects and cancels retries', async () => {
    const { link, conn } = setup();
    conn.start();
    await link.up();
    conn.stop();
    await settle();
    expect(link.types).toContain('disconnect');
    await jest.advanceTimersByTimeAsync(20000);
    expect(link.attempts).toBe(1);
    expect(conn.status).toBe('disconnected');
  });

  it('forwards messages and statuses', async () => {
    const { link, conn, subscribes } = setup();
    const msgs: string[] = [];
    const statuses: string[] = [];
    conn.onMessage((t) => msgs.push(t));
    conn.onStatus((s) => statuses.push(s));
    conn.start();
    await link.up();
    link.deliver({ cmd: 'publish', topic: 't', payload: Buffer.from('hi'), qos: 0, retain: false, dup: false });
    await settle();
    expect(msgs).toEqual(['t']);
    expect(statuses).toEqual(['connecting', 'connected']);
  });

  it('publish rejects while disconnected', async () => {
    const { conn } = setup();
    await expect(conn.publish('t', 'x', 0, false)).rejects.toThrow('Not connected');
  });
});

