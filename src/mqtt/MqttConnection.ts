import { MqttClient, type ClientStatus, type MqttClientOptions } from './MqttClient';

export interface Subscription {
  topic: string;
  qos: number;
}

type StatusCb = (s: ClientStatus, error?: string) => void;
type MessageCb = (topic: string, payload: Uint8Array, retained: boolean) => void;

/**
 * A broker connection that stays up: reconnects after `retryMs` (5 s) and keeps the wanted
 * subscriptions in sync across reconnects.
 */
export class MqttConnection {
  status: ClientStatus = 'disconnected';
  lastError = '';
  private client: MqttClient | null = null;
  private stopped = true;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private wanted = new Map<string, number>();
  private active = new Map<string, number>();
  private statusListeners = new Set<StatusCb>();
  private messageListeners = new Set<MessageCb>();
  private readonly retryMs: number;

  constructor(private readonly opts: MqttClientOptions, cfg: { retryMs?: number } = {}) {
    this.retryMs = cfg.retryMs ?? 5000;
  }

  onStatus(cb: StatusCb): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  onMessage(cb: MessageCb): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  start(): void {
    this.stopped = false;
    if (!this.client) this.open();
  }

  /** Skips the retry delay: used when the app returns to the foreground or the network is back. */
  reconnectNow(): void {
    if (this.stopped || this.client) return;
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    this.open();
  }

  stop(): void {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    const c = this.client;
    this.client = null;
    c?.disconnect();
    this.active.clear();
    this.setStatus('disconnected');
  }

  setSubscriptions(list: Subscription[]): void {
    this.wanted = new Map();
    for (const s of list) {
      if (s.topic.length === 0) continue;
      this.wanted.set(s.topic, Math.max(this.wanted.get(s.topic) ?? 0, s.qos));
    }
    this.syncSubscriptions();
  }

  publish(topic: string, payload: string | Uint8Array, qos: number, retain: boolean): Promise<void> {
    if (!this.client) return Promise.reject(new Error('Not connected'));
    return this.client.publish(topic, payload, qos, retain);
  }

  private open(): void {
    const client = new MqttClient(this.opts);
    this.client = client;
    client.onMessage((t, p, r) => {
      if (this.client === client) for (const cb of [...this.messageListeners]) cb(t, p, r);
    });
    client.onStatus((s, error) => {
      if (this.client !== client) return;
      if (error) this.lastError = error;
      if (s === 'connected') {
        this.lastError = '';
        this.active.clear();
        this.syncSubscriptions();
      }
      if (s === 'disconnected') {
        this.client = null;
        this.active.clear();
        if (!this.stopped) this.retry = setTimeout(() => this.open(), this.retryMs);
      }
      this.setStatus(s, error);
    });
    client.connect();
  }

  private syncSubscriptions(): void {
    const c = this.client;
    if (!c || c.status !== 'connected') return;
    for (const [topic, qos] of this.active) {
      if (!this.wanted.has(topic)) {
        this.active.delete(topic);
        c.unsubscribe(topic).catch(() => {});
      } else if (this.wanted.get(topic) !== qos) {
        this.active.delete(topic);
      }
    }
    for (const [topic, qos] of this.wanted) {
      if (this.active.has(topic)) continue;
      this.active.set(topic, qos);
      c.subscribe(topic, qos).catch((e: Error) => {
        this.active.delete(topic);
        this.lastError = e.message;
      });
    }
  }

  private setStatus(s: ClientStatus, error?: string): void {
    this.status = s;
    for (const cb of [...this.statusListeners]) cb(s, error);
  }
}
