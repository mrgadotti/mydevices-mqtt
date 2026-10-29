import { MqttClient } from './MqttClient';
import {
  encodePublish,
  fromUtf8,
  PacketParser,
  utf8,
  type Packet,
} from './packets';
import type { Transport, TransportHandlers } from './transport';

/** In-memory transport recording what the client sends and letting tests play the broker. */
class FakeLink {
  handlers!: TransportHandlers;
  sent: Packet[] = [];
  raw: Uint8Array[] = [];
  closed = false;
  private parser = new PacketParser((p) => this.sent.push(p));
  // Client-to-broker packets use the same codec; PacketParser decodes the types the client sends via this map.
  factory = (handlers: TransportHandlers): Transport => {
    this.handlers = handlers;
    return {
      send: (d) => {
        this.raw.push(d);
        this.sent.push(decodeClientPacket(d));
      },
      close: () => {
        this.closed = true;
      },
    };
  };
  open() {
    this.handlers.onOpen();
  }
  reply(bytes: number[]) {
    this.handlers.onData(Uint8Array.from(bytes));
  }
  get types(): string[] {
    return this.sent.map((p) => p.type);
  }
}

/** Decode packets the client sends (CONNECT/SUBSCRIBE/... are not understood by PacketParser). */
function decodeClientPacket(d: Uint8Array): Packet {
  const t = d[0] >> 4;
  const names: Record<number, string> = {
    1: 'connect', 8: 'subscribe', 10: 'unsubscribe', 12: 'pingreq', 14: 'disconnect',
  };
  if (t === 3) {
    const out: Packet[] = [];
    new PacketParser((p) => out.push(p)).push(d);
    return out[0];
  }
  if (t === 4 || t === 5 || t === 6 || t === 7) {
    const out: Packet[] = [];
    new PacketParser((p) => out.push(p)).push(d);
    return out[0];
  }
  return { type: names[t] as never, raw: d } as unknown as Packet;
}

const make = (extra = {}) => {
  const link = new FakeLink();
  const client = new MqttClient({ clientId: 'c1', keepAlive: 30, connect: link.factory, ...extra });
  return { link, client };
};

const connected = () => {
  const m = make();
  m.client.connect();
  m.link.open();
  m.link.reply([0x20, 0x02, 0x00, 0x00]);
  return m;
};

describe('MqttClient connect', () => {
  it('sends CONNECT once the transport opens and becomes connected on CONNACK 0', () => {
    const { link, client } = make();
    const statuses: string[] = [];
    client.onStatus((s) => statuses.push(s));
    client.connect();
    expect(client.status).toBe('connecting');
    link.open();
    expect(link.types).toEqual(['connect']);
    link.reply([0x20, 0x02, 0x00, 0x00]);
    expect(client.status).toBe('connected');
    expect(statuses).toEqual(['connecting', 'connected']);
  });

  it('reports a refused connection with the CONNACK reason and closes', () => {
    const { link, client } = make();
    const errors: (string | undefined)[] = [];
    client.onStatus((_s, e) => errors.push(e));
    client.connect();
    link.open();
    link.reply([0x20, 0x02, 0x00, 0x04]);
    expect(client.status).toBe('disconnected');
    expect(errors.at(-1)).toBe('Bad user name or password');
    expect(link.closed).toBe(true);
  });

  it('goes disconnected with an error when the transport closes', () => {
    const { link, client } = connected();
    const seen: (string | undefined)[] = [];
    client.onStatus((_s, e) => seen.push(e));
    link.handlers.onClose('socket reset');
    expect(client.status).toBe('disconnected');
    expect(seen.at(-1)).toBe('socket reset');
  });

  it('sends DISCONNECT and closes on disconnect()', () => {
    const { link, client } = connected();
    client.disconnect();
    expect(link.types).toContain('disconnect');
    expect(link.closed).toBe(true);
    expect(client.status).toBe('disconnected');
  });
});

describe('MqttClient subscribe and publish', () => {
  it('resolves subscribe on SUBACK and rejects on failure code 0x80', async () => {
    const { link, client } = connected();
    const ok = client.subscribe('a/b', 1);
    link.reply([0x90, 0x03, 0x00, 0x01, 0x01]);
    await expect(ok).resolves.toBeUndefined();
    const bad = client.subscribe('x', 0);
    link.reply([0x90, 0x03, 0x00, 0x02, 0x80]);
    await expect(bad).rejects.toThrow('Subscription refused');
  });

  it('rejects when not connected', async () => {
    const { client } = make();
    await expect(client.subscribe('a', 0)).rejects.toThrow('Not connected');
    await expect(client.publish('a', 'x', 0, false)).rejects.toThrow('Not connected');
  });

  it('publishes qos 0 immediately', async () => {
    const { link, client } = connected();
    await client.publish('t', 'hi', 0, false);
    const p = link.sent.at(-1) as Extract<Packet, { type: 'publish' }>;
    expect(p).toMatchObject({ type: 'publish', topic: 't', qos: 0, retain: false });
    expect(fromUtf8(p.payload)).toBe('hi');
  });

  it('publishes qos 1 and resolves on PUBACK with the matching id', async () => {
    const { link, client } = connected();
    const pending = client.publish('t', 'x', 1, true);
    const p = link.sent.at(-1) as Extract<Packet, { type: 'publish' }>;
    expect(p).toMatchObject({ qos: 1, retain: true });
    link.reply([0x40, 0x02, (p.packetId! >> 8) & 0xff, p.packetId! & 0xff]);
    await expect(pending).resolves.toBeUndefined();
  });

  it('rejects pending publishes when the connection drops', async () => {
    const { link, client } = connected();
    const pending = client.publish('t', 'x', 1, false);
    link.handlers.onClose('lost');
    await expect(pending).rejects.toThrow('lost');
  });
});

describe('MqttClient incoming messages', () => {
  const deliver = (m: ReturnType<typeof connected>, bytes: Uint8Array) => m.link.handlers.onData(bytes);

  it('delivers qos 0 messages', () => {
    const m = connected();
    const got: [string, string, boolean][] = [];
    m.client.onMessage((t, p, r) => got.push([t, fromUtf8(p), r]));
    deliver(m, encodePublish({ topic: 'a/b', payload: utf8('v'), qos: 0, retain: true }));
    expect(got).toEqual([['a/b', 'v', true]]);
  });

  it('acknowledges qos 1 with PUBACK', () => {
    const m = connected();
    const got: string[] = [];
    m.client.onMessage((t) => got.push(t));
    deliver(m, encodePublish({ topic: 't', payload: utf8('v'), qos: 1, retain: false, packetId: 9 }));
    expect(got).toEqual(['t']);
    expect(m.link.sent.at(-1)).toEqual({ type: 'puback', packetId: 9 });
  });

  it('runs the qos 2 handshake and delivers exactly once', () => {
    const m = connected();
    const got: string[] = [];
    m.client.onMessage((t) => got.push(t));
    const pub = encodePublish({ topic: 't', payload: utf8('v'), qos: 2, retain: false, packetId: 5 });
    deliver(m, pub);
    deliver(m, pub); // duplicate before PUBREL
    expect(got).toEqual(['t']);
    expect(m.link.sent.at(-1)).toEqual({ type: 'pubrec', packetId: 5 });
    deliver(m, Uint8Array.from([0x62, 0x02, 0x00, 0x05]));
    expect(m.link.sent.at(-1)).toEqual({ type: 'pubcomp', packetId: 5 });
  });

  it('unsubscribes through UNSUBSCRIBE', async () => {
    const m = connected();
    const p = m.client.unsubscribe('a');
    m.link.reply([0xb0, 0x02, 0x00, 0x01]);
    await expect(p).resolves.toBeUndefined();
    expect(m.link.types).toContain('unsubscribe');
  });
});

describe('MqttClient keep alive', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('pings when idle and survives while PINGRESP arrives', () => {
    const m = connected();
    jest.advanceTimersByTime(30_000);
    expect(m.link.types.filter((t) => t === 'pingreq')).toHaveLength(1);
    m.link.reply([0xd0, 0x00]);
    jest.advanceTimersByTime(30_000);
    expect(m.link.types.filter((t) => t === 'pingreq')).toHaveLength(2);
    expect(m.client.status).toBe('connected');
  });

  it('drops the connection when PINGRESP never arrives', () => {
    const m = connected();
    const errs: (string | undefined)[] = [];
    m.client.onStatus((_s, e) => errs.push(e));
    jest.advanceTimersByTime(30_000);
    jest.advanceTimersByTime(45_000);
    expect(m.client.status).toBe('disconnected');
    expect(errs.at(-1)).toBe('Keep alive timeout');
    expect(m.link.closed).toBe(true);
  });
});
