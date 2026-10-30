import { applyMessage } from '../domain/metrics';
import { buildNotification, type NotificationContent } from '../domain/notification';
import type { Broker, Metric, NotificationMetric } from '../domain/types';
import { fromUtf8 } from '../mqtt/text';
import { runOnReceive, type HookEnv } from '../scripting/hooks';

export interface ConnectionLike {
  status: 'disconnected' | 'connecting' | 'connected';
  start(): void;
  stop(): void;
  setSubscriptions(list: { topic: string; qos: number }[]): void;
  publish(topic: string, payload: string, qos: number, retain: boolean): Promise<void>;
  onMessage(cb: (topic: string, payload: Uint8Array, retained: boolean) => void): () => void;
  onStatus(cb: (s: 'disconnected' | 'connecting' | 'connected', error?: string) => void): () => void;
}

export interface Deps {
  createConnection(broker: Broker): ConnectionLike;
  notify(content: NotificationContent, tileId: string): void;
  applyRuntime(brokerId: string, metric: Metric): void;
  now(): number;
  /** Called with the names of the brokers being watched whenever that set changes. */
  onActiveChange(names: string[]): void;
  /** Builds the script environment; `publish` sends through this service's own connection. */
  hookEnv(publish: (topic: string, payload: string, retained: boolean, qos: number) => void): HookEnv;
}

interface Watch {
  conn: ConnectionLike;
  /** Connection-relevant broker fields: a change means reconnecting. */
  key: string;
  name: string;
  tiles: NotificationMetric[];
}

const connectionKey = (b: Broker): string => JSON.stringify([b.address, b.port, b.ssl, b.trust, b.user, b.password, b.clientId]);

/**
 * Keeps one MQTT connection per broker that has notification tiles, independent of any open screen, and turns
 * incoming messages into local notifications. Uses its own client id (`<id>-bg`) next to the dashboard session.
 */
export class BackgroundMqtt {
  private watches = new Map<string, Watch>();
  private lastActive = '';

  constructor(private readonly deps: Deps) {}

  sync(brokers: Broker[], metrics: Record<string, Metric[]>): void {
    const wanted = new Map<string, { broker: Broker; tiles: NotificationMetric[] }>();
    for (const b of brokers) {
      const tiles = (metrics[b.id] ?? []).filter((m): m is NotificationMetric => m.type === 7 && m.topic.length > 0);
      if (tiles.length > 0) wanted.set(b.id, { broker: b, tiles });
    }

    for (const [id, w] of [...this.watches]) {
      const next = wanted.get(id);
      if (!next || connectionKey(next.broker) !== w.key) {
        w.conn.stop();
        this.watches.delete(id);
      }
    }

    for (const [id, { broker, tiles }] of wanted) {
      let w = this.watches.get(id);
      if (!w) {
        const conn = this.deps.createConnection({ ...broker, clientId: `${broker.clientId}-bg` });
        w = { conn, key: connectionKey(broker), name: broker.name, tiles };
        this.watches.set(id, w);
        const watch = w;
        conn.onMessage((topic, payload) => this.onMessage(id, watch, topic, payload));
        conn.setSubscriptions(this.subscriptions(tiles));
        conn.start();
      } else {
        // The service owns "what was last notified": the dashboard may update the stored tile at any time.
        const known = new Map(w.tiles.map((t) => [t.id, t]));
        w.tiles = tiles.map((t) => {
          const old = known.get(t.id);
          return old ? { ...t, lastPayload: old.lastPayload, lastActivity: old.lastActivity } : t;
        });
        w.name = broker.name;
        w.conn.setSubscriptions(this.subscriptions(tiles));
      }
    }

    const active = [...this.watches.values()].map((w) => w.name);
    const signature = JSON.stringify(active);
    if (signature !== this.lastActive) {
      this.lastActive = signature;
      this.deps.onActiveChange(active);
    }
  }

  stopAll(): void {
    for (const w of this.watches.values()) w.conn.stop();
    this.watches.clear();
    if (this.lastActive !== '[]') {
      this.lastActive = '[]';
      this.deps.onActiveChange([]);
    }
  }

  private subscriptions(tiles: NotificationMetric[]): { topic: string; qos: number }[] {
    const byTopic = new Map<string, number>();
    for (const t of tiles) byTopic.set(t.topic, Math.max(byTopic.get(t.topic) ?? 0, t.qos));
    return [...byTopic].map(([topic, qos]) => ({ topic, qos }));
  }

  private onMessage(brokerId: string, watch: Watch, topic: string, bytes: Uint8Array): void {
    const text = fromUtf8(bytes);
    const t = this.deps.now();
    watch.tiles = watch.tiles.map((tile) => {
      if (tile.topic !== topic) return tile;
      const first = applyMessage(tile, text, t);
      let metric = first.metric;
      let payload = text;
      let changed = first.changed;
      if (metric.jsOnReceive.trim().length > 0) {
        const out = runOnReceive(metric, topic, text, this.deps.hookEnv((tp, pl, retained, qos) => void watch.conn.publish(tp, pl, qos > 1 ? 1 : qos, retained).catch(() => {})));
        if (out.error.length === 0) {
          payload = out.payload;
          const again = applyMessage(metric, out.payload, t);
          metric = again.metric;
          changed = changed || again.changed;
        }
      }
      this.deps.applyRuntime(brokerId, metric);
      const content = buildNotification(metric as NotificationMetric, payload, changed);
      if (content) this.deps.notify(content, metric.id);
      return metric as NotificationMetric;
    });
  }
}
