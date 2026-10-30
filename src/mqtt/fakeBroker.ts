import mqttPacket, { type Packet } from 'mqtt-packet';
import type { Transport, TransportHandlers } from './transport';

/** Test double for a broker: speaks MQTT 3.1.1 over the in-memory Transport the client expects. */
export class FakeBroker {
  handlers!: TransportHandlers;
  received: Packet[] = [];
  attempts = 0;
  closed = false;
  /** CONNACK return code sent after CONNECT. */
  connackCode = 0;
  /** SUBACK granted code (0x80 refuses). */
  subackCode = 0;
  autoPong = true;
  /** Answer PUBLISH with PUBACK / PUBREC. */
  autoAck = true;
  private parser = mqttPacket.parser({ protocolVersion: 4 });

  factory = (h: TransportHandlers): Transport => {
    this.handlers = h;
    this.closed = false;
    this.attempts++;
    this.parser = mqttPacket.parser({ protocolVersion: 4 });
    this.parser.on('packet', (p: Packet) => this.onPacket(p));
    return {
      send: (d) => this.parser.parse(Buffer.from(d)),
      close: () => {
        this.closed = true;
      },
    };
  };

  get types(): string[] {
    return this.received.map((p) => p.cmd);
  }

  of<T extends Packet['cmd']>(cmd: T): Extract<Packet, { cmd: T }>[] {
    return this.received.filter((p) => p.cmd === cmd) as never;
  }

  /** The TCP connection is established (the client sends CONNECT next). */
  open(): void {
    this.handlers.onOpen();
  }

  /** Open and finish the MQTT handshake. */
  async up(): Promise<void> {
    this.open();
    await settle();
  }

  deliver(packet: Packet): void {
    this.handlers.onData(Uint8Array.from(mqttPacket.generate(packet, { protocolVersion: 4 })));
  }

  drop(error?: string): void {
    this.handlers.onClose(error);
  }

  private onPacket(p: Packet): void {
    this.received.push(p);
    switch (p.cmd) {
      case 'connect':
        this.deliver({ cmd: 'connack', returnCode: this.connackCode, sessionPresent: false });
        break;
      case 'subscribe':
        this.deliver({ cmd: 'suback', messageId: p.messageId, granted: p.subscriptions.map(() => this.subackCode) });
        break;
      case 'unsubscribe':
        this.deliver({ cmd: 'unsuback', messageId: p.messageId, granted: [] });
        break;
      case 'publish':
        if (!this.autoAck) break;
        if (p.qos === 1) this.deliver({ cmd: 'puback', messageId: p.messageId });
        if (p.qos === 2) this.deliver({ cmd: 'pubrec', messageId: p.messageId });
        break;
      case 'pubrel':
        this.deliver({ cmd: 'pubcomp', messageId: p.messageId });
        break;
      case 'pingreq':
        if (this.autoPong) this.deliver({ cmd: 'pingresp' });
        break;
      default:
    }
  }
}

/** Lets MQTT.js' streams run: they hop through process.nextTick / setImmediate. */
export const settle = (): Promise<void> => new Promise((r) => setImmediate(() => setImmediate(r)));
