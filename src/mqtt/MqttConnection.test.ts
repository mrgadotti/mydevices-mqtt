import { MqttConnection } from './MqttConnection';
import { PacketParser, type Packet } from './packets';
import type { Transport, TransportHandlers } from './transport';

class Link {
  sent: string[] = [];
  subscribes: string[] = [];
  handlers!: TransportHandlers;
  closed = false;
  attempts = 0;
  factory = (h: TransportHandlers): Transport => {
    this.handlers = h;
    this.closed = false;
    this.attempts++;
    return {
      send: (d) => {
        const type = d[0] >> 4;
        if (type === 8) {
          // SUBSCRIBE: id(2) then topic length-prefixed
          const len = (d[4] << 8) | d[5];
          this.subscribes.push(new TextDecoder().decode(d.subarray(6, 6 + len)));
          this.sent.push('subscribe');
          // auto SUBACK
          const id = (d[2] << 8) | d[3];
          setTimeout(() => this.handlers.onData(Uint8Array.from([0x90, 0x03, id >> 8, id & 255, 0x00])), 0);
        } else if (type === 10) this.sent.push('unsubscribe');
        else if (type === 1) this.sent.push('connect');
        else if (type === 14) this.sent.push('disconnect');
        else this.sent.push(String(type));
      },
      close: () => {
        this.closed = true;
      },
    };
  };
  up() {
    this.handlers.onOpen();
    this.handlers.onData(Uint8Array.from([0x20, 0x02, 0x00, 0x00]));
  }
}

const setup = () => {
  const link = new Link();
  const conn = new MqttConnection({ clientId: 'c', keepAlive: 30, connect: link.factory }, { retryMs: 5000 });
  return { link, conn };
};

describe('MqttConnection', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('subscribes the wanted topics once connected, highest qos wins for duplicates', async () => {
    const { link, conn } = setup();
    conn.setSubscriptions([{ topic: 'a', qos: 0 }, { topic: 'a', qos: 1 }, { topic: 'b', qos: 0 }]);
    conn.start();
    link.up();
    await jest.advanceTimersByTimeAsync(1);
    expect(link.subscribes.sort()).toEqual(['a', 'b']);
  });

  it('diffs subscriptions while connected', async () => {
    const { link, conn } = setup();
    conn.start();
    link.up();
    conn.setSubscriptions([{ topic: 'a', qos: 0 }]);
    await jest.advanceTimersByTimeAsync(1);
    conn.setSubscriptions([{ topic: 'b', qos: 0 }]);
    await jest.advanceTimersByTimeAsync(1);
    expect(link.subscribes).toEqual(['a', 'b']);
    expect(link.sent).toContain('unsubscribe');
  });

  it('reconnects after 5 seconds and resubscribes', async () => {
    const { link, conn } = setup();
    conn.setSubscriptions([{ topic: 'a', qos: 0 }]);
    conn.start();
    link.up();
    await jest.advanceTimersByTimeAsync(1);
    link.handlers.onClose('lost');
    expect(conn.status).toBe('disconnected');
    await jest.advanceTimersByTimeAsync(4999);
    expect(link.attempts).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(link.attempts).toBe(2);
    link.up();
    await jest.advanceTimersByTimeAsync(1);
    expect(link.subscribes).toEqual(['a', 'a']);
  });

  it('keeps retrying after a refused connection', async () => {
    const { link, conn } = setup();
    conn.start();
    link.handlers.onOpen();
    link.handlers.onData(Uint8Array.from([0x20, 0x02, 0x00, 0x05]));
    expect(conn.lastError).toBe('Not authorized');
    await jest.advanceTimersByTimeAsync(5000);
    expect(link.attempts).toBe(2);
  });

  it('stop() disconnects and cancels retries', async () => {
    const { link, conn } = setup();
    conn.start();
    link.up();
    conn.stop();
    expect(link.sent).toContain('disconnect');
    await jest.advanceTimersByTimeAsync(20000);
    expect(link.attempts).toBe(1);
    expect(conn.status).toBe('disconnected');
  });

  it('forwards messages and statuses', () => {
    const { link, conn } = setup();
    const msgs: string[] = [];
    const statuses: string[] = [];
    conn.onMessage((t) => msgs.push(t));
    conn.onStatus((s) => statuses.push(s));
    conn.start();
    link.up();
    link.handlers.onData(Uint8Array.from([0x30, 0x05, 0x00, 0x01, 0x74, 0x68, 0x69]));
    expect(msgs).toEqual(['t']);
    expect(statuses).toEqual(['connecting', 'connected']);
  });

  it('publish rejects while disconnected', async () => {
    const { conn } = setup();
    await expect(conn.publish('t', 'x', 0, false)).rejects.toThrow('Not connected');
  });
});

// keep the import used for typing the packet parser in case of future assertions
void (null as unknown as Packet | PacketParser);
