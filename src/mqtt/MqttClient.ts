import { Buffer } from 'buffer';
import mqtt, { type MqttClient as JsClient } from 'mqtt';
import { transportStream } from './transportStream';
import type { TransportFactory } from './transport';

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

/**
 * MQTT 3.1.1 client on top of MQTT.js: one connection attempt per `connect()`; reconnection
 * policy lives in the caller (MqttConnection), so MQTT.js' own reconnect is switched off.
 */
export class MqttClient {
  status: ClientStatus = 'disconnected';
  private js: JsClient | null = null;
  private lastError: string | undefined;
  private pending = new Set<(e: Error) => void>();
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
    this.lastError = undefined;
    this.setStatus('connecting');
    const js = new mqtt.MqttClient(() => transportStream(this.watched()) as never, {
      protocolVersion: 4,
      clientId: this.opts.clientId,
      keepalive: this.opts.keepAlive,
      clean: this.opts.cleanSession ?? true,
      username: this.opts.username,
      password: this.opts.password,
      reconnectPeriod: 0,
      resubscribe: false,
    });
    this.js = js;
    js.on('connect', () => {
      if (this.js === js) this.setStatus('connected');
    });
    js.on('error', (e: Error & { code?: number }) => {
      if (this.js !== js) return;
      this.lastError = (e.code !== undefined && CONNACK_ERRORS[e.code]) || e.message;
    });
    js.on('close', () => {
      if (this.js !== js) return;
      this.js = null;
      js.removeAllListeners();
      js.on('error', () => {});
      this.rejectPending(new Error(this.lastError ?? 'Connection closed'));
      this.setStatus('disconnected', this.lastError ?? 'Connection closed');
    });
    js.on('message', (topic: string, payload: Uint8Array, packet: { retain?: boolean }) => {
      if (this.js !== js) return;
      for (const cb of [...this.messageListeners]) cb(topic, payload, packet.retain === true);
    });
  }

  disconnect(): void {
    const js = this.js;
    if (!js) return;
    this.js = null;
    js.removeAllListeners();
    js.on('error', () => {});
    js.end(false);
    this.rejectPending(new Error('Disconnected'));
    this.setStatus('disconnected');
  }

  subscribe(topic: string, qos: number): Promise<void> {
    return this.call('Not connected', (js, done) =>
      js.subscribe(topic, { qos: qos as 0 | 1 | 2 }, (err, granted) => {
        if (err) done(/^Subscribe error/.test(err.message) ? new Error('Subscription refused') : err);
        else if (granted?.some((g) => g.qos === 128)) done(new Error('Subscription refused'));
        else done();
      }),
    );
  }

  unsubscribe(topic: string): Promise<void> {
    return this.call('Not connected', (js, done) => js.unsubscribe(topic, (err) => done(err ?? undefined)));
  }

  publish(topic: string, payload: string | Uint8Array, qos: number, retain: boolean): Promise<void> {
    const body = typeof payload === 'string' ? payload : Buffer.from(payload);
    return this.call('Not connected', (js, done) =>
      js.publish(topic, body, { qos: Math.min(Math.max(qos, 0), 2) as 0 | 1 | 2, retain }, (err) => done(err ?? undefined)),
    );
  }

  private call(notConnected: string, run: (js: JsClient, done: (err?: Error) => void) => void): Promise<void> {
    const js = this.js;
    if (this.status !== 'connected' || !js) return Promise.reject(new Error(notConnected));
    return new Promise<void>((resolve, reject) => {
      this.pending.add(reject);
      run(js, (err) => {
        this.pending.delete(reject);
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /** MQTT.js only reports stream errors raised before CONNACK, so remember why the transport went away. */
  private watched(): TransportFactory {
    return (h) =>
      this.opts.connect({
        ...h,
        onClose: (error) => {
          if (error) this.lastError = error;
          h.onClose(error);
        },
      });
  }

  private rejectPending(error: Error): void {
    const all = [...this.pending];
    this.pending.clear();
    for (const reject of all) reject(error);
  }

  private setStatus(s: ClientStatus, error?: string): void {
    this.status = s;
    for (const cb of [...this.statusListeners]) cb(s, error);
  }
}
