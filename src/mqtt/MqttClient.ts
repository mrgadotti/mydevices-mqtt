import {
  encodeConnect,
  encodeDisconnect,
  encodePingreq,
  encodePubAck,
  encodePubComp,
  encodePublish,
  encodePubRec,
  encodePubRel,
  encodeSubscribe,
  encodeUnsubscribe,
  PacketParser,
  utf8,
  type Packet,
} from './packets';
import type { Transport, TransportFactory } from './transport';

export type ClientStatus = 'disconnected' | 'connecting' | 'connected';

export interface MqttClientOptions {
  clientId: string;
  /** Seconds. */
  keepAlive: number;
  cleanSession?: boolean;
  username?: string;
  password?: string;
  connect: TransportFactory;
}

const CONNACK_ERRORS: Record<number, string> = {
  1: 'Unacceptable protocol version',
  2: 'Identifier rejected',
  3: 'Server unavailable',
  4: 'Bad user name or password',
  5: 'Not authorized',
};

type Waiter = { resolve: () => void; reject: (e: Error) => void };

/** MQTT 3.1.1 client: one connection attempt per `connect()`; reconnection policy lives in the caller. */
export class MqttClient {
  status: ClientStatus = 'disconnected';
  private transport: Transport | null = null;
  private parser: PacketParser | null = null;
  private nextId = 1;
  private waiters = new Map<number, Waiter>();
  private incomingQos2 = new Set<number>();
  private pingTimer: ReturnType<typeof setTimeout> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private statusListeners = new Set<(s: ClientStatus, error?: string) => void>();
  private messageListeners = new Set<(topic: string, payload: Uint8Array, retained: boolean) => void>();

  constructor(private readonly opts: MqttClientOptions) {}

  onStatus(cb: (s: ClientStatus, error?: string) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  onMessage(cb: (topic: string, payload: Uint8Array, retained: boolean) => void): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  connect(): void {
    if (this.status !== 'disconnected') return;
    this.setStatus('connecting');
    this.parser = new PacketParser((p) => this.handle(p), (e) => this.drop(e));
    const transport = this.opts.connect({
      onOpen: () => {
        if (this.transport !== transport) return;
        transport.send(
          encodeConnect({
            clientId: this.opts.clientId,
            keepAlive: this.opts.keepAlive,
            cleanSession: this.opts.cleanSession ?? true,
            username: this.opts.username,
            password: this.opts.password,
          }),
        );
      },
      onData: (chunk) => {
        if (this.transport === transport) this.parser?.push(chunk);
      },
      onClose: (error) => {
        if (this.transport === transport) this.drop(error ?? 'Connection closed');
      },
    });
    this.transport = transport;
  }

  disconnect(): void {
    const t = this.transport;
    if (!t) return;
    if (this.status === 'connected') t.send(encodeDisconnect());
    this.teardown(new Error('Disconnected'));
    t.close();
    this.setStatus('disconnected');
  }

  subscribe(topic: string, qos: number): Promise<void> {
    return this.request((id) => encodeSubscribe(id, [{ topic, qos }]), 'Subscription refused');
  }

  unsubscribe(topic: string): Promise<void> {
    return this.request((id) => encodeUnsubscribe(id, [topic]));
  }

  publish(topic: string, payload: string | Uint8Array, qos: number, retain: boolean): Promise<void> {
    if (this.status !== 'connected' || !this.transport) return Promise.reject(new Error('Not connected'));
    const bytes = typeof payload === 'string' ? utf8(payload) : payload;
    if (qos === 0) {
      this.transport.send(encodePublish({ topic, payload: bytes, qos: 0, retain }));
      return Promise.resolve();
    }
    // QoS 2: PUBLISH -> PUBREC -> PUBREL -> PUBCOMP; the promise settles on PUBCOMP.
    const level = qos > 1 ? 2 : 1;
    return this.request((id) => encodePublish({ topic, payload: bytes, qos: level, retain, packetId: id }));
  }

  private request(build: (id: number) => Uint8Array, refusal?: string): Promise<void> {
    if (this.status !== 'connected' || !this.transport) return Promise.reject(new Error('Not connected'));
    const id = this.allocId();
    const transport = this.transport;
    return new Promise<void>((resolve, reject) => {
      this.waiters.set(id, {
        resolve,
        reject,
      });
      if (refusal) this.refusals.set(id, refusal);
      transport.send(build(id));
    });
  }

  private refusals = new Map<number, string>();

  private allocId(): number {
    const id = this.nextId;
    this.nextId = this.nextId >= 0xffff ? 1 : this.nextId + 1;
    return id;
  }

  private settle(id: number, error?: Error): void {
    const w = this.waiters.get(id);
    if (!w) return;
    this.waiters.delete(id);
    this.refusals.delete(id);
    if (error) w.reject(error);
    else w.resolve();
  }

  private handle(p: Packet): void {
    const t = this.transport;
    if (!t) return;
    switch (p.type) {
      case 'connack':
        if (p.returnCode !== 0) {
          const message = CONNACK_ERRORS[p.returnCode] ?? `Connection refused (${p.returnCode})`;
          this.teardown(new Error(message));
          t.close();
          this.setStatus('disconnected', message);
          return;
        }
        this.setStatus('connected');
        this.schedulePing();
        return;
      case 'suback': {
        const refusal = this.refusals.get(p.packetId);
        this.settle(p.packetId, p.returnCodes.includes(0x80) ? new Error(refusal ?? 'Refused') : undefined);
        return;
      }
      case 'unsuback':
      case 'puback':
      case 'pubcomp':
        this.settle(p.packetId);
        return;
      case 'pubrec':
        if (this.waiters.has(p.packetId)) t.send(encodePubRel(p.packetId));
        return;
      case 'pingresp':
        if (this.pongTimer) clearTimeout(this.pongTimer);
        this.pongTimer = null;
        this.schedulePing();
        return;
      case 'publish':
        this.handlePublish(p, t);
        return;
      case 'pubrel':
        this.incomingQos2.delete(p.packetId);
        t.send(encodePubComp(p.packetId));
        return;
      default:
        return;
    }
  }

  private handlePublish(p: Extract<Packet, { type: 'publish' }>, t: Transport): void {
    if (p.qos === 2 && p.packetId !== undefined) {
      const fresh = !this.incomingQos2.has(p.packetId);
      this.incomingQos2.add(p.packetId);
      if (fresh) this.emit(p);
      t.send(encodePubRec(p.packetId));
      return;
    }
    this.emit(p);
    if (p.qos === 1 && p.packetId !== undefined) t.send(encodePubAck(p.packetId));
  }

  private emit(p: Extract<Packet, { type: 'publish' }>): void {
    for (const cb of [...this.messageListeners]) cb(p.topic, p.payload, p.retain);
  }

  private schedulePing(): void {
    if (this.pingTimer) clearTimeout(this.pingTimer);
    this.pingTimer = setTimeout(() => {
      const t = this.transport;
      if (!t || this.status !== 'connected') return;
      t.send(encodePingreq());
      this.pongTimer = setTimeout(() => {
        const dead = this.transport;
        this.drop('Keep alive timeout');
        dead?.close();
      }, this.opts.keepAlive * 1500);
    }, this.opts.keepAlive * 1000);
  }

  private teardown(reason: Error): void {
    if (this.pingTimer) clearTimeout(this.pingTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.pingTimer = this.pongTimer = null;
    for (const id of [...this.waiters.keys()]) this.settle(id, reason);
    this.incomingQos2.clear();
    this.transport = null;
    this.parser = null;
  }

  private drop(error: string): void {
    if (!this.transport) return;
    this.teardown(new Error(error));
    this.setStatus('disconnected', error);
  }

  private setStatus(s: ClientStatus, error?: string): void {
    this.status = s;
    for (const cb of [...this.statusListeners]) cb(s, error);
  }
}
