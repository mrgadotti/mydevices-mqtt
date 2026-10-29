export type ScriptResult = { ok: true; result: unknown } | { ok: false; error: string };

const UNBOUNDED = /\bwhile\s*\(\s*(true|1)\s*\)|\bfor\s*\(\s*;\s*;\s*\)/;

type Scope = Record<string, unknown>;

/**
 * Runs user JavaScript with `vars` in scope and returns the completion value, like evaluateString. Every run is clean: the variables the script declares or assigns are removed afterwards. (Hermes has no
 * `with`, so the variables are installed on the global object for the duration of an indirect eval.)
 */
export function runScript(source: string, vars: Scope): ScriptResult {
  if (source.trim().length === 0) return { ok: true, result: undefined };
  if (UNBOUNDED.test(source)) return { ok: false, error: 'Unbounded loop' };

  const g = globalThis as unknown as Scope;
  const before = new Set(Object.getOwnPropertyNames(g));
  const shadowed = new Map<string, { had: boolean; value: unknown }>();
  for (const [k, v] of Object.entries(vars)) {
    shadowed.set(k, { had: k in g, value: g[k] });
    g[k] = v;
  }
  try {
    // eslint-disable-next-line no-eval
    const result = (0, eval)(source);
    return { ok: true, result };
  } catch (e) {
    const err = e as Error;
    return { ok: false, error: err?.name && err?.message !== undefined ? `${err.name}: ${err.message}` : String(e) };
  } finally {
    for (const k of Object.getOwnPropertyNames(g)) if (!before.has(k)) delete g[k];
    for (const [k, s] of shadowed) {
      if (s.had) g[k] = s.value;
      else delete g[k];
    }
  }
}
