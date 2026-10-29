/**
 * Render counters, JS-thread stall and action timers for profiling release builds: set ENABLED to true, rebuild, and
 * read the `PERF` lines in logcat (`adb logcat -s ReactNativeJS`). Keep it false in committed code.
 */
const ENABLED = false;

const counts = new Map<string, number>();
const marks = new Map<string, number>();
let timer: ReturnType<typeof setInterval> | null = null;
let lagTimer: ReturnType<typeof setInterval> | null = null;
let maxLag = 0;

function start() {
  if (timer === null) {
    timer = setInterval(() => {
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      console.log(`PERF renders/5s total=${total} maxLagMs=${maxLag} ${top.map(([k, v]) => `${k}=${v}`).join(' ')}`);
      counts.clear();
      maxLag = 0;
    }, 5000);
  }
  if (lagTimer === null) {
    let last = Date.now();
    lagTimer = setInterval(() => {
      const now = Date.now();
      maxLag = Math.max(maxLag, now - last - 50);
      last = now;
    }, 50);
  }
}

export function markRender(name: string): void {
  if (!ENABLED) return;
  counts.set(name, (counts.get(name) ?? 0) + 1);
  start();
}

/** Starts a named stopwatch (see perfMeasure). */
export function perfMark(name: string): void {
  if (ENABLED) marks.set(name, Date.now());
}

/** Logs the milliseconds since perfMark(name). */
export function perfMeasure(name: string): void {
  if (!ENABLED) return;
  const t = marks.get(name);
  if (t === undefined) return;
  marks.delete(name);
  console.log(`PERF ${name} ${Date.now() - t}ms`);
}
