export type JsonPathResult = { ok: true; value: string } | { ok: false; error: 'JSON path error' };

type Token = { kind: 'key'; key: string } | { kind: 'index'; index: number } | { kind: 'wildcard' };

const FAIL: JsonPathResult = { ok: false, error: 'JSON path error' };

function tokenize(path: string): Token[] | null {
  if (!path.startsWith('$')) return null;
  const tokens: Token[] = [];
  let i = 1;
  while (i < path.length) {
    const c = path[i];
    if (c === '.') {
      i++;
      if (path[i] === '*') {
        tokens.push({ kind: 'wildcard' });
        i++;
        continue;
      }
      let j = i;
      while (j < path.length && path[j] !== '.' && path[j] !== '[') j++;
      if (j === i) return null;
      tokens.push({ kind: 'key', key: path.slice(i, j) });
      i = j;
    } else if (c === '[') {
      const end = path.indexOf(']', i);
      if (end < 0) return null;
      const inner = path.slice(i + 1, end).trim();
      i = end + 1;
      if (inner === '*') tokens.push({ kind: 'wildcard' });
      else if (/^-?\d+$/.test(inner)) tokens.push({ kind: 'index', index: parseInt(inner, 10) });
      else if (/^(['"]).*\1$/.test(inner)) tokens.push({ kind: 'key', key: inner.slice(1, -1) });
      else return null;
    } else {
      return null;
    }
  }
  return tokens;
}


function step(values: unknown[], token: Token, multi: { value: boolean }): unknown[] {
  const out: unknown[] = [];
  for (const v of values) {
    if (token.kind === 'wildcard') {
      multi.value = true;
      if (Array.isArray(v)) out.push(...v);
      else if (v !== null && typeof v === 'object') out.push(...Object.values(v as object));
    } else if (token.kind === 'index') {
      if (Array.isArray(v)) {
        const idx = token.index < 0 ? v.length + token.index : token.index;
        if (idx >= 0 && idx < v.length) out.push(v[idx]);
      }
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v) && token.key in (v as object)) {
      out.push((v as Record<string, unknown>)[token.key]);
    } else if (Array.isArray(v) && multi.value) {
      continue;
    }
  }
  return out;
}

/** Mirrors Java's toString() for the value types json-smart produces. */
function javaToString(v: unknown): string {
  if (v === null || v === undefined) return '(null)';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return `[${v.map(javaToString).join(', ')}]`;
  if (typeof v === 'object') {
    return `{${Object.entries(v as object).map(([k, x]) => `${k}=${javaToString(x)}`).join(', ')}}`;
  }
  return String(v);
}

export function extractJsonPath(payload: string, path: string): JsonPathResult {
  let doc: unknown;
  try {
    doc = JSON.parse(payload);
  } catch {
    return FAIL;
  }
  const tokens = tokenize(path);
  if (!tokens) return FAIL;
  const multi = { value: false };
  let current: unknown[] = [doc];
  for (const t of tokens) {
    current = step(current, t, multi);
    if (current.length === 0 && !multi.value) return FAIL;
  }
  if (multi.value) return { ok: true, value: javaToString(current) };
  if (current.length === 0) return FAIL;
  return { ok: true, value: javaToString(current[0]) };
}

