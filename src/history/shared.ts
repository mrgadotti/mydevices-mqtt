import { ExpoHistoryDb } from './ExpoHistoryDb';
import type { HistoryDb } from './HistoryDb';
import { HistoryRecorder } from './HistoryRecorder';

let dbPromise: Promise<ExpoHistoryDb> | null = null;

/** The app-wide history database, opened on first use. */
export function historyDb(): Promise<ExpoHistoryDb> {
  if (!dbPromise) {
    dbPromise = ExpoHistoryDb.open();
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

/** Lazy HistoryDb that opens the shared database only when something is actually stored or read. */
const lazyDb: HistoryDb = {
  record: async (...a) => (await historyDb()).record(...a),
  query: async (...a) => (await historyDb()).query(...a),
  prune: async (...a) => (await historyDb()).prune(...a),
  latest: async (...a) => (await historyDb()).latest(...a),
  remove: async (...a) => (await historyDb()).remove(...a),
};

/** The recorder shared by the dashboard session and the foreground service. */
export const historyRecorder = new HistoryRecorder(lazyDb);
export const history: HistoryDb = lazyDb;

const clearListeners = new Set<(metricId: string) => void>();

/** Calls `fn` whenever a metric's history is cleared by the user; returns the unsubscribe function. */
export function onHistoryCleared(fn: (metricId: string) => void): () => void {
  clearListeners.add(fn);
  return () => void clearListeners.delete(fn);
}

/** Deletes all recorded history of a metric, restarts its recording state and notifies the charts. */
export async function clearHistory(metricId: string): Promise<void> {
  await historyRecorder.forget(metricId);
  clearListeners.forEach((fn) => fn(metricId));
}
