import { ExpoHistoryDb } from './ExpoHistoryDb';
import type { HistoryDb } from './HistoryDb';
import { HistoryRecorder } from './HistoryRecorder';

let dbPromise: Promise<HistoryDb> | null = null;

/** The app-wide history database, opened on first use. */
export function historyDb(): Promise<HistoryDb> {
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
