import { FakeBroker, settle } from './fakeBroker';
import { MqttClient } from './MqttClient';
import { fromUtf8, utf8 } from './text';

const make = (extra = {}) => {
  const broker = new FakeBroker();
  const client = new MqttClient({ clientId: 'c1', keepAlive: 30, connect: broker.factory, ...extra });
  return { broker, client };
};

const connected = async (extra = {}) => {
  const m = make(extra);
  m.client.connect();
  await m.broker.up();
  return m;
};

describe('MqttClient connect', () => {
  it('sends CONNECT once the transport opens and becomes connected on CONNACK 0', async () => {
    const { broker, client } = make({ username: 'u', password: 'p', cleanSession: false });
    const statuses: string[] = [];
    client.onStatus((s) => statuses.push(s));
    client.connect();
    expect(client.status).toBe('connecting');
    await broker.up();
    expect(broker.of('connect')[0]).toMatchObject({ clientId: 'c1', keepalive: 30, clean: false, username: 'u' });
    expect(broker.of('connect')[0].password?.toString()).toBe('p');
    expect(client.status).toBe('connected');
    expect(statuses).toEqual(['connecting', 'connected']);
  });

  it('reports a refused connection with the CONNACK reason', async () => {
    const { broker, client } = make();
    broker.connackCode = 4;
    const errors: (string | undefined)[] = [];
    client.onStatus((_s, e) => errors.push(e));
    client.connect();
    await broker.up();
    expect(client.status).toBe('disconnected');
    expect(errors.at(-1)).toBe('Bad user name or password');
    expect(broker.closed).toBe(true);
  });

  it('goes disconnected with an error when the transport closes', async () => {
    const { broker, client } = await connected();
    const seen: (string | undefined)[] = [];
    client.onStatus((_s, e) => seen.push(e));
    broker.drop('socket reset');
    await settle();
    expect(client.status).toBe('disconnected');
    expect(seen.at(-1)).toBe('socket reset');
  });

  it('sends DISCONNECT and closes on disconnect()', async () => {
    const { broker, client } = await connected();
    client.disconnect();
    expect(client.status).toBe('disconnected');
    await settle();
    expect(broker.types).toContain('disconnect');
    expect(broker.closed).toBe(true);
  });
});

describe('MqttClient subscribe and publish', () => {
  it('resolves subscribe on SUBACK and rejects on failure code 0x80', async () => {
    const { broker, client } = await connected();
    await expect(client.subscribe('a/b', 1)).resolves.toBeUndefined();
    expect(broker.of('subscribe')[0].subscriptions[0]).toMatchObject({ topic: 'a/b', qos: 1 });
    broker.subackCode = 0x80;
    await expect(client.subscribe('x', 0)).rejects.toThrow('Subscription refused');
  });

  it('unsubscribes through UNSUBSCRIBE', async () => {
    const { broker, client } = await connected();
    await expect(client.unsubscribe('a')).resolves.toBeUndefined();
    expect(broker.types).toContain('unsubscribe');
  });

  it('rejects when not connected', async () => {
    const { client } = make();
    await expect(client.subscribe('a', 0)).rejects.toThrow('Not connected');
    await expect(client.publish('a', 'x', 0, false)).rejects.toThrow('Not connected');
  });

  it.each([0, 1, 2] as const)('publishes with qos %i and resolves once acknowledged', async (qos) => {
    const { broker, client } = await connected();
    await client.publish('t', 'hi', qos, qos === 1);
    await settle();
    const p = broker.of('publish').at(-1)!;
    expect(p).toMatchObject({ topic: 't', qos, retain: qos === 1 });
    expect(p.payload.toString()).toBe('hi');
    if (qos === 2) expect(broker.types).toContain('pubrel');
  });

  it('publishes binary payloads untouched', async () => {
    const { broker, client } = await connected();
    await client.publish('t', Uint8Array.from([0, 255, 7]), 0, false);
    await settle();
    expect([...(broker.of('publish').at(-1)!.payload as Buffer)]).toEqual([0, 255, 7]);
  });

  it('rejects pending publishes when the connection drops', async () => {
    const { broker, client } = await connected();
    broker.autoAck = false;
    const pending = client.publish('t', 'x', 2, false);
    await settle();
    broker.drop('lost');
    await expect(pending).rejects.toBeDefined();
  });
});

describe('MqttClient incoming messages', () => {
  it('delivers messages with topic, payload and retained flag', async () => {
    const m = await connected();
    const got: [string, string, boolean][] = [];
    m.client.onMessage((t, p, r) => got.push([t, fromUtf8(p), r]));
    m.broker.deliver({ cmd: 'publish', topic: 'a/b', payload: Buffer.from(utf8('v')), qos: 0, retain: true, dup: false });
    await settle();
    expect(got).toEqual([['a/b', 'v', true]]);
  });

  it('acknowledges qos 1 with PUBACK', async () => {
    const m = await connected();
    const got: string[] = [];
    m.client.onMessage((t) => got.push(t));
    m.broker.deliver({ cmd: 'publish', topic: 't', payload: Buffer.from('v'), qos: 1, retain: false, dup: false, messageId: 9 });
    await settle();
    expect(got).toEqual(['t']);
    expect(m.broker.of('puback')[0].messageId).toBe(9);
  });

  it('runs the qos 2 handshake and delivers exactly once', async () => {
    const m = await connected();
    const got: string[] = [];
    m.client.onMessage((t) => got.push(t));
    const pub = { cmd: 'publish', topic: 't', payload: Buffer.from('v'), qos: 2, retain: false, dup: false, messageId: 5 } as const;
    m.broker.deliver(pub);
    m.broker.deliver({ ...pub, dup: true }); // retransmission before PUBREL
    await settle();
    expect(m.broker.of('pubrec').every((p) => p.messageId === 5)).toBe(true);
    m.broker.deliver({ cmd: 'pubrel', messageId: 5 });
    await settle();
    expect(got).toEqual(['t']);
    expect(m.broker.of('pubcomp')[0].messageId).toBe(5);
  });
});

describe('MqttClient keep alive', () => {
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }));
  afterEach(() => jest.useRealTimers());

  it('pings when idle and survives while PINGRESP arrives', async () => {
    const m = await connected();
    await jest.advanceTimersByTimeAsync(31_000);
    await settle();
    expect(m.broker.of('pingreq')).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(31_000);
    await settle();
    expect(m.broker.of('pingreq').length).toBeGreaterThanOrEqual(2);
    expect(m.client.status).toBe('connected');
  });

  it('drops the connection when PINGRESP never arrives', async () => {
    const m = await connected();
    m.broker.autoPong = false;
    const errs: (string | undefined)[] = [];
    m.client.onStatus((_s, e) => errs.push(e));
    await jest.advanceTimersByTimeAsync(120_000);
    await settle();
    expect(m.client.status).toBe('disconnected');
    expect(errs.at(-1)).toMatch(/keepalive timeout/i);
    expect(m.broker.closed).toBe(true);
  });
});
