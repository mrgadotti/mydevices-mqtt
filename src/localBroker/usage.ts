import type { Broker } from '../domain/types';
import type { LocalBroker } from './LocalBroker';

export const LOCAL_PORT = 1883;

/** Port the embedded broker listens on for `broker`. */
export function localPort(broker: Broker): number {
  const n = parseInt(broker.port, 10);
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : LOCAL_PORT;
}

/**
 * Decides when the embedded broker runs. It runs while at least one "holder" needs it and stops when the last one
 * lets go. Holders: an open dashboard session (`session:<id>`), a background watch (`bg:<id>`) and every local
 * broker flagged as default/auto-connect (`auto:<id>`, maintained by `syncAuto`).
 */
export class LocalBrokerUsage {
  private holders = new Map<string, number>();
  private autoKeys = new Set<string>();

  constructor(private readonly broker: LocalBroker) {}

  /** Registers `key` and makes sure the broker runs on `port`. Rejects when the start fails (the hold is then dropped). */
  async acquire(key: string, port: number): Promise<void> {
    this.holders.set(key, port);
    try {
      await this.broker.start(port);
    } catch (e) {
      this.holders.delete(key);
      throw e;
    }
  }

  /** Drops `key`; stops the broker when nothing else needs it. */
  release(key: string): Promise<void> {
    this.holders.delete(key);
    return this.holders.size === 0 ? this.broker.stop() : Promise.resolve();
  }

  /** Aligns the `auto:` holders with the stored brokers. Start failures are swallowed: the connection itself reports them. */
  async syncAuto(brokers: Broker[]): Promise<void> {
    const wanted = new Map(brokers.filter((b) => b.localBroker && b.autoConnect).map((b) => [`auto:${b.id}`, localPort(b)]));
    for (const key of [...this.autoKeys]) {
      if (!wanted.has(key)) {
        this.autoKeys.delete(key);
        await this.release(key).catch(() => {});
      }
    }
    for (const [key, port] of wanted) {
      if (!this.autoKeys.has(key)) {
        this.autoKeys.add(key);
        await this.acquire(key, port).catch(() => this.autoKeys.delete(key));
      }
    }
  }
}
