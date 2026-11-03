import { fromBase64, toBase64 } from './base64';
import { ensureUniqueLongIds, newBroker, uuid } from './defaults';
import { parseMetrics } from './serialize';
import type { Broker, Metric } from './types';

/** Version of the configuration backup format. Bump it when the shape below changes. */
export const BACKUP_VERSION = 1;

export interface BackupSettings {
  language: string;
  theme: string;
}

/** A broker as saved in a backup: `password` is dropped and replaced by `passwordBase64` (UTF-8 bytes, base64). */
export type BackupBroker = Omit<Broker, 'password'> & { passwordBase64: string };

export interface BackupEntry {
  broker: BackupBroker;
  /** The dashboard, in the same Gson-style shape as the per-broker import/export JSON (null values omitted). */
  metrics: Metric[];
}

export interface Backup {
  app: 'myDevice MQTT';
  version: number;
  exportedAt: string;
  settings: BackupSettings;
  brokers: BackupEntry[];
}

/** UTF-8 encoding that does not depend on TextEncoder being available in the JS engine. */
function utf8(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0) as number;
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(bytes);
}

/**
 * Builds the configuration backup: app settings plus every broker with its dashboard.
 * Broker passwords are included, base64-encoded in `passwordBase64`.
 */
export function buildBackup(
  settings: BackupSettings,
  brokers: Broker[],
  metricsByBroker: Record<string, Metric[]>,
  now: Date = new Date(),
): Backup {
  return {
    app: 'myDevice MQTT',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings: { language: settings.language, theme: settings.theme },
    brokers: brokers.map((b) => {
      const { password, ...rest } = b;
      return { broker: { ...rest, passwordBase64: toBase64(utf8(password ?? '')) }, metrics: metricsByBroker[b.id] ?? [] };
    }),
  };
}

/** Serializes a backup like serializeMetrics does: null values omitted. */
export const serializeBackup = (backup: Backup): string => JSON.stringify(backup, (_k, v) => (v === null ? undefined : v), 2);

/** Why a backup file was rejected. */
export type BackupErrorCode = 'invalid_json' | 'not_backup' | 'unsupported_version' | 'invalid_structure';

export interface ParsedBackup {
  /** Only the settings present in the file (and of a known shape); the caller validates the values. */
  settings: Partial<BackupSettings>;
  brokers: Broker[];
  metricsByBroker: Record<string, Metric[]>;
}

export type BackupParseResult = ({ ok: true } & ParsedBackup) | { ok: false; error: BackupErrorCode };

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** UTF-8 decoding that does not depend on TextDecoder; malformed bytes become U+FFFD. */
function fromUtf8(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    const n = b < 0x80 ? 0 : b >= 0xf0 ? 3 : b >= 0xe0 ? 2 : b >= 0xc0 ? 1 : -1;
    if (n < 0 || i + n > bytes.length - 1) {
      out += '\ufffd';
      i++;
      continue;
    }
    let c = n === 0 ? b : b & (0x3f >> n);
    for (let k = 1; k <= n; k++) c = (c << 6) | (bytes[i + k] & 63);
    out += String.fromCodePoint(c);
    i += n + 1;
  }
  return out;
}

/**
 * Parses a configuration backup written by serializeBackup. Brokers and metrics are normalized exactly like the
 * stored ones (defaults for missing fields, unique long ids); `passwordBase64` is decoded back into `password`.
 * Optional parts may be missing; a wrong app marker, an unsupported version or a malformed structure is rejected.
 */
export function parseBackup(text: string): BackupParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid_json' };
  }
  if (!isObject(data) || data.app !== 'myDevice MQTT') return { ok: false, error: 'not_backup' };
  if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1 || data.version > BACKUP_VERSION) {
    return { ok: false, error: 'unsupported_version' };
  }
  const rawBrokers = data.brokers ?? [];
  if (!Array.isArray(rawBrokers) || (data.settings !== undefined && !isObject(data.settings))) return { ok: false, error: 'invalid_structure' };

  const settings: Partial<BackupSettings> = {};
  if (isObject(data.settings)) {
    if (typeof data.settings.language === 'string') settings.language = data.settings.language;
    if (typeof data.settings.theme === 'string') settings.theme = data.settings.theme;
  }

  const entries: { broker: Broker; metrics: Metric[] }[] = [];
  const seen = new Set<string>();
  for (const raw of rawBrokers) {
    if (!isObject(raw) || !isObject(raw.broker)) return { ok: false, error: 'invalid_structure' };
    const { passwordBase64, ...fields } = raw.broker;
    const partial: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) if (v !== null) partial[k] = v;
    if (typeof passwordBase64 === 'string') {
      try {
        partial.password = fromUtf8(fromBase64(passwordBase64));
      } catch {
        return { ok: false, error: 'invalid_structure' };
      }
    }
    if (typeof partial.id !== 'string' || partial.id === '' || seen.has(partial.id)) partial.id = uuid();
    const broker = newBroker(partial as Partial<Broker>);
    seen.add(broker.id);
    let metrics: Metric[] = [];
    if (raw.metrics !== undefined && raw.metrics !== null) {
      if (!Array.isArray(raw.metrics)) return { ok: false, error: 'invalid_structure' };
      metrics = parseMetrics(JSON.stringify(raw.metrics));
    }
    entries.push({ broker, metrics });
  }
  const brokers = ensureUniqueLongIds(entries.map((e) => e.broker));
  const metricsByBroker: Record<string, Metric[]> = {};
  brokers.forEach((b, i) => (metricsByBroker[b.id] = entries[i].metrics));
  return { ok: true, settings, brokers, metricsByBroker };
}
