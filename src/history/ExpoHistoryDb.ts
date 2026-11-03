import type { SQLiteDatabase } from 'expo-sqlite';
import type { HistoryDb } from './HistoryDb';
import { bucketCenter, bucketWidth, MAX_POINTS, type Bucket, type Sample } from './downsample';

export const HISTORY_DB_NAME = 'history.db';

/** HistoryDb over expo-sqlite: table samples(metric_id, ts ms, value) indexed by (metric_id, ts). */
export class ExpoHistoryDb implements HistoryDb {
  constructor(private readonly db: SQLiteDatabase) {}

  /** Opens (and creates, when new) `history.db`. expo-sqlite is required lazily so unit tests never load it. */
  static async open(): Promise<ExpoHistoryDb> {
    const { openDatabaseAsync } = require('expo-sqlite') as typeof import('expo-sqlite');
    const db = await openDatabaseAsync(HISTORY_DB_NAME);
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS samples (metric_id TEXT NOT NULL, ts INTEGER NOT NULL, value REAL NOT NULL);
      CREATE INDEX IF NOT EXISTS samples_metric_ts ON samples (metric_id, ts);
    `);
    return new ExpoHistoryDb(db);
  }

  async record(metricId: string, ts: number, value: number): Promise<void> {
    await this.db.runAsync('INSERT INTO samples (metric_id, ts, value) VALUES (?, ?, ?)', metricId, ts, value);
  }

  async query(metricId: string, fromTs: number, toTs: number, maxPoints = MAX_POINTS): Promise<Bucket[]> {
    const width = bucketWidth(fromTs, toTs, maxPoints);
    // Same grouping as downsample(): bucket index = floor((ts - from) / width).
    const rows = await this.db.getAllAsync<{ b: number; mn: number; mx: number; av: number; n: number }>(
      `SELECT CAST((ts - ?1) / ?2 AS INTEGER) AS b, MIN(value) AS mn, MAX(value) AS mx, AVG(value) AS av, COUNT(*) AS n
       FROM samples WHERE metric_id = ?3 AND ts >= ?1 AND ts <= ?4 GROUP BY b ORDER BY b`,
      fromTs,
      width,
      metricId,
      toTs,
    );
    return rows.map((r) => ({ ts: bucketCenter(r.b, fromTs, width), min: r.mn, max: r.mx, avg: r.av, count: r.n }));
  }

  async prune(metricId: string, olderThanTs: number): Promise<void> {
    await this.db.runAsync('DELETE FROM samples WHERE metric_id = ? AND ts < ?', metricId, olderThanTs);
  }

  async latest(metricId: string): Promise<Sample | null> {
    const row = await this.db.getFirstAsync<{ ts: number; value: number }>('SELECT ts, value FROM samples WHERE metric_id = ? ORDER BY ts DESC LIMIT 1', metricId);
    return row ? { ts: row.ts, value: row.value } : null;
  }

  async remove(metricId: string): Promise<void> {
    await this.db.runAsync('DELETE FROM samples WHERE metric_id = ?', metricId);
  }
}
