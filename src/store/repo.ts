import { ensureUniqueLongIds, newBroker } from '../domain/defaults';
import { parseMetrics, serializeMetrics } from '../domain/serialize';
import type { Broker, Metric } from '../domain/types';

export interface KV {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class MemoryKV implements KV {
  private data = new Map<string, string>();
  async getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  async removeItem(key: string) {
    this.data.delete(key);
  }
}

const BROKERS = 'brokers';
const SEEDED = 'seeded';
const metricsKey = (brokerId: string) => `metrics:${brokerId}`;

/** Data layout: one list of brokers, one Gson-style metrics list per broker id. */
export class Repo {
  constructor(private readonly kv: KV) {}

  async loadBrokers(): Promise<Broker[]> {
    const raw = await this.kv.getItem(BROKERS);
    if (!raw) return [];
    try {
      const data: unknown = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      const list = data
        .filter((b) => b !== null && typeof b === 'object')
        .map((b) => newBroker(b as Partial<Broker>));
      return ensureUniqueLongIds(list);
    } catch {
      return [];
    }
  }

  /** First run only: the app ships with a ready-to-use public broker. */
  async loadBrokersSeeded(): Promise<Broker[]> {
    const existing = await this.loadBrokers();
    if ((await this.kv.getItem(SEEDED)) !== null) return existing;
    await this.kv.setItem(SEEDED, '1');
    if (existing.length > 0) return existing;
    const seeded = [newBroker({ longId: 1, name: 'broker.emqx.io', address: 'broker.emqx.io', port: '1883' })];
    await this.saveBrokers(seeded);
    return seeded;
  }

  saveBrokers(brokers: Broker[]): Promise<void> {
    return this.kv.setItem(BROKERS, JSON.stringify(brokers));
  }

  async loadMetrics(brokerId: string): Promise<Metric[]> {
    const raw = await this.kv.getItem(metricsKey(brokerId));
    if (!raw) return [];
    try {
      return parseMetrics(raw);
    } catch {
      return [];
    }
  }

  saveMetrics(brokerId: string, metrics: Metric[]): Promise<void> {
    return this.kv.setItem(metricsKey(brokerId), serializeMetrics(metrics));
  }

  deleteMetrics(brokerId: string): Promise<void> {
    return this.kv.removeItem(metricsKey(brokerId));
  }
}
