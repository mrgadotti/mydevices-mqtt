import { toBase64 } from './base64';
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
