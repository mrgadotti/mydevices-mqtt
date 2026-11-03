import { createStore } from 'zustand/vanilla';
import { uuid, nextLongId } from '../domain/defaults';
import { canPlace, layoutWidgets, type Rect } from '../domain/widgets';
import type { Broker, Metric } from '../domain/types';
import { historyRecorder } from '../history/shared';
import { isHistoryMetric } from '../history/HistoryRecorder';
import type { Repo } from './repo';

export interface AppState {
  ready: boolean;
  brokers: Broker[];
  metrics: Record<string, Metric[]>;
  load(): Promise<void>;
  addBroker(b: Broker): Broker;
  updateBroker(b: Broker): void;
  removeBroker(id: string): void;
  moveBroker(from: number, to: number): void;
  loadMetrics(brokerId: string): Promise<Metric[]>;
  addMetric(brokerId: string, m: Metric): Metric;
  cloneMetric(brokerId: string, id: string): Metric | undefined;
  updateMetric(brokerId: string, m: Metric): void;
  removeMetric(brokerId: string, id: string): void;
  moveMetric(brokerId: string, from: number, to: number): void;
  /** Widget grid: stores every widget's resolved rectangle so positions stay put when others are added or removed. */
  materializeLayout(brokerId: string): void;
  /** Widget grid: moves/resizes one widget; false (and no change) when it would overlap or leave the 24 columns. */
  setWidgetRect(brokerId: string, id: string, rect: Rect): boolean;
  replaceMetrics(brokerId: string, list: Metric[]): void;
  /**
   * Replaces every broker and dashboard (configuration import). Resolves once everything is persisted.
   * History samples of widgets that are no longer present are forgotten.
   */
  replaceAll(brokers: Broker[], metricsByBroker: Record<string, Metric[]>): Promise<void>;
  /** Runtime tile updates (last payload, activity, pending state): persisted lazily (every 10 s). */
  applyRuntime(brokerId: string, m: Metric): void;
  /** Applies many runtime updates with a single store write. */
  applyRuntimeBatch(brokerId: string, list: Metric[]): void;
  /** Writes any pending lazy changes now. */
  flush(): Promise<void>;
}

/** Only one broker can auto-connect: marking one clears the others (BrokersListActivity.onActivityResult). */
const exclusiveAutoConnect = (list: Broker[], keep: Broker): Broker[] =>
  keep.autoConnect ? list.map((b) => (b.id !== keep.id && b.autoConnect ? { ...b, autoConnect: false } : b)) : list;

const withRect = (m: Metric, r: Rect): Metric => ({ ...m, gx: r.x, gy: r.y, gw: r.w, gh: r.h });

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || from >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
};

const EDIT_SAVE_MS = 300;

export function createAppStore(repo: Repo, lazyMs = 10000) {
  const dirty = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  return createStore<AppState>((set, get) => {
    const saveMetricsNow = (brokerId: string) => {
      dirty.delete(brokerId);
      void repo.saveMetrics(brokerId, get().metrics[brokerId] ?? []);
    };
    const setList = (brokerId: string, list: Metric[]) =>
      set((s) => ({ metrics: { ...s.metrics, [brokerId]: list } }));
    // Edits (drags, resizes, option changes) are saved shortly after the last one instead of on every change.
    const editTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const edit = (brokerId: string, fn: (list: Metric[]) => Metric[]) => {
      setList(brokerId, fn(get().metrics[brokerId] ?? []));
      dirty.add(brokerId);
      const prev = editTimers.get(brokerId);
      if (prev) clearTimeout(prev);
      editTimers.set(
        brokerId,
        setTimeout(() => {
          editTimers.delete(brokerId);
          saveMetricsNow(brokerId);
        }, EDIT_SAVE_MS),
      );
    };
    const saveBrokers = () => void repo.saveBrokers(get().brokers);

    return {
      ready: false,
      brokers: [],
      metrics: {},

      async load() {
        const brokers = await repo.loadBrokersSeeded();
        const entries = await Promise.all(brokers.map(async (b) => [b.id, await repo.loadMetrics(b.id)] as const));
        set({ brokers, metrics: Object.fromEntries(entries), ready: true });
      },

      addBroker(b) {
        const added = { ...b, longId: nextLongId(get().brokers) };
        set((s) => ({ brokers: [...exclusiveAutoConnect(s.brokers, added), added], metrics: { ...s.metrics, [added.id]: [] } }));
        saveBrokers();
        return added;
      },
      updateBroker(b) {
        set((s) => ({ brokers: exclusiveAutoConnect(s.brokers, b).map((x) => (x.id === b.id ? b : x)) }));
        saveBrokers();
      },
      removeBroker(id) {
        // Metrics of a broker whose dashboard was never opened are not in memory yet: read them before they are deleted.
        const known = get().metrics[id];
        const forgetHistory = (list: Metric[]) => list.filter(isHistoryMetric).forEach((m) => void historyRecorder.forget(m.id));
        const forgotten = known ? Promise.resolve(forgetHistory(known)) : repo.loadMetrics(id).then(forgetHistory, () => {});
        set((s) => {
          const { [id]: _gone, ...rest } = s.metrics;
          return { brokers: s.brokers.filter((x) => x.id !== id), metrics: rest };
        });
        dirty.delete(id);
        const t = editTimers.get(id);
        if (t) clearTimeout(t);
        editTimers.delete(id);
        saveBrokers();
        void forgotten.then(() => repo.deleteMetrics(id));
      },
      moveBroker(from, to) {
        set((s) => ({ brokers: move(s.brokers, from, to) }));
        saveBrokers();
      },

      async loadMetrics(brokerId) {
        const list = await repo.loadMetrics(brokerId);
        setList(brokerId, list);
        return list;
      },
      addMetric(brokerId, m) {
        const added = { ...m, longId: nextLongId(get().metrics[brokerId] ?? []) } as Metric;
        edit(brokerId, (l) => [...l, added]);
        return added;
      },
      cloneMetric(brokerId, id) {
        const src = (get().metrics[brokerId] ?? []).find((m) => m.id === id);
        if (!src) return undefined;
        const list = get().metrics[brokerId] ?? [];
        const copy = {
          ...src,
          id: uuid(),
          longId: nextLongId(list),
          lastActivity: 0,
          lastPayload: null,
          lastJsonPathValue: null,
        } as Metric;
        const at = list.findIndex((m) => m.id === id) + 1;
        edit(brokerId, (l) => [...l.slice(0, at), copy, ...l.slice(at)]);
        return copy;
      },
      updateMetric(brokerId, m) {
        edit(brokerId, (l) => l.map((x) => (x.id === m.id ? m : x)));
      },
      removeMetric(brokerId, id) {
        const gone = (get().metrics[brokerId] ?? []).find((x) => x.id === id);
        if (gone && isHistoryMetric(gone)) void historyRecorder.forget(id);
        edit(brokerId, (l) => l.filter((x) => x.id !== id));
      },
      moveMetric(brokerId, from, to) {
        edit(brokerId, (l) => move(l, from, to));
      },
      materializeLayout(brokerId) {
        const list = get().metrics[brokerId] ?? [];
        const rects = layoutWidgets(list);
        const changed = list.some((m) => {
          const r = rects.get(m.id) as Rect;
          return m.gx !== r.x || m.gy !== r.y || m.gw !== r.w || m.gh !== r.h;
        });
        if (changed) edit(brokerId, (l) => l.map((m) => withRect(m, rects.get(m.id) as Rect)));
      },
      setWidgetRect(brokerId, id, rect) {
        const list = get().metrics[brokerId] ?? [];
        const rects = layoutWidgets(list);
        if (!rects.has(id) || !canPlace(rects, id, rect)) return false;
        rects.set(id, rect);
        edit(brokerId, (l) => l.map((m) => withRect(m, rects.get(m.id) as Rect)));
        return true;
      },
      replaceMetrics(brokerId, list) {
        edit(brokerId, () => list);
      },

      async replaceAll(brokers, metricsByBroker) {
        const old = get().brokers;
        const oldLists = await Promise.all(
          old.map(async (b) => get().metrics[b.id] ?? (await repo.loadMetrics(b.id).catch(() => [] as Metric[]))),
        );
        // Drop pending lazy/edit saves: they would overwrite the imported data with stale lists.
        if (timer) clearTimeout(timer);
        timer = null;
        for (const t of editTimers.values()) clearTimeout(t);
        editTimers.clear();
        dirty.clear();
        let autoConnectTaken = false;
        const next = brokers.map((b) => {
          const auto = b.autoConnect && !autoConnectTaken;
          autoConnectTaken ||= auto;
          return auto === b.autoConnect ? b : { ...b, autoConnect: auto };
        });
        const metrics = Object.fromEntries(next.map((b) => [b.id, metricsByBroker[b.id] ?? []]));
        const keptIds = new Set(Object.values(metrics).flatMap((l) => l.map((m) => m.id)));
        set({ brokers: next, metrics });
        await repo.saveBrokers(next);
        await Promise.all(next.map((b) => repo.saveMetrics(b.id, metrics[b.id])));
        const newIds = new Set(next.map((b) => b.id));
        await Promise.all(old.filter((b) => !newIds.has(b.id)).map((b) => repo.deleteMetrics(b.id)));
        const gone = oldLists.flat().filter((m) => isHistoryMetric(m) && !keptIds.has(m.id));
        await Promise.all(gone.map((m) => historyRecorder.forget(m.id).catch(() => {})));
      },

      applyRuntime(brokerId, m) {
        get().applyRuntimeBatch(brokerId, [m]);
      },
      applyRuntimeBatch(brokerId, list) {
        if (list.length === 0) return;
        const byId = new Map(list.map((m) => [m.id, m]));
        setList(
          brokerId,
          (get().metrics[brokerId] ?? []).map((x) => byId.get(x.id) ?? x),
        );
        dirty.add(brokerId);
        if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            for (const id of [...dirty]) saveMetricsNow(id);
          }, lazyMs);
        }
      },
      async flush() {
        if (timer) clearTimeout(timer);
        timer = null;
        for (const t of editTimers.values()) clearTimeout(t);
        editTimers.clear();
        await Promise.all([...dirty].map((id) => repo.saveMetrics(id, get().metrics[id] ?? [])));
        dirty.clear();
      },
    };
  });
}

