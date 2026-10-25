import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

/** Per-tile error messages and blink state that live only while the app runs (never persisted), like the original's transient fields. */
export interface TileRuntime {
  onTap: string;
  onReceive: string;
  blinkExpression: string;
  /** MetricBasic.blink: set by the blink expression or the On Display script. */
  blink: boolean;
}

export const EMPTY_RUNTIME: TileRuntime = { onTap: '', onReceive: '', blinkExpression: '', blink: false };

interface RuntimeState {
  tiles: Record<string, TileRuntime>;
  set(id: string, patch: Partial<TileRuntime>): void;
}

export const runtimeStore = createStore<RuntimeState>((set, get) => ({
  tiles: {},
  set(id, patch) {
    const cur = get().tiles[id] ?? EMPTY_RUNTIME;
    const next = { ...cur, ...patch };
    if ((Object.keys(patch) as (keyof TileRuntime)[]).every((k) => cur[k] === next[k])) return;
    set((s) => ({ tiles: { ...s.tiles, [id]: next } }));
  },
}));

export const useTileRuntime = (id: string): TileRuntime => useStore(runtimeStore, (s) => s.tiles[id] ?? EMPTY_RUNTIME);
