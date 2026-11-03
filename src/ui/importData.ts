import { parseBackup, type BackupErrorCode, type ParsedBackup } from '../domain/backup';
import { parseSettings, updateSettings, type Settings } from '../i18n';
import { appStore } from './store';

export type PickResult = { status: 'cancelled' } | { status: 'error'; error: BackupErrorCode | 'read_failed' } | ({ status: 'ok' } & ParsedBackup);

/** Lets the user pick a configuration backup and parses it. Nothing is changed yet. */
export async function pickConfiguration(): Promise<PickResult> {
  const picker = require('expo-document-picker') as typeof import('expo-document-picker');
  const fs = require('expo-file-system') as typeof import('expo-file-system');
  // Android often reports .json files as application/octet-stream, so also accept anything.
  const picked = await picker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
  if (picked.canceled || picked.assets.length === 0) return { status: 'cancelled' };
  let text: string;
  try {
    text = await new fs.File(picked.assets[0].uri).text();
  } catch {
    return { status: 'error', error: 'read_failed' };
  }
  const parsed = parseBackup(text.replace(/^﻿/, ''));
  return parsed.ok ? { status: 'ok', settings: parsed.settings, brokers: parsed.brokers, metricsByBroker: parsed.metricsByBroker } : { status: 'error', error: parsed.error };
}

/** Replaces all brokers, dashboards and (present) settings with the parsed backup. */
export async function applyConfiguration(backup: ParsedBackup, current: Settings): Promise<void> {
  await appStore.getState().replaceAll(backup.brokers, backup.metricsByBroker);
  updateSettings(parseSettings(JSON.stringify({ ...current, ...backup.settings })));
}
