import { buildBackup, serializeBackup } from '../domain/backup';
import { historyDb } from '../history/shared';
import type { Settings } from '../i18n';
import { appStore } from './store';

const stamp = () => new Date().toISOString().replace(/\.\d+Z$/, '').replace(/[-:]/g, '').replace('T', '-');

const fileModules = () => ({
  fs: require('expo-file-system') as typeof import('expo-file-system'),
  sharing: require('expo-sharing') as typeof import('expo-sharing'),
});

/** Writes the configuration backup to the cache directory and opens the share sheet. */
export async function exportConfiguration(settings: Settings): Promise<void> {
  const { fs, sharing } = fileModules();
  const app = appStore.getState();
  await app.flush();
  const brokers = app.brokers;
  const metrics: Record<string, import('../domain/types').Metric[]> = {};
  for (const b of brokers) metrics[b.id] = await app.loadMetrics(b.id);
  const json = serializeBackup(buildBackup(settings, brokers, metrics));
  const file = new fs.File(fs.Paths.cache, `mydevice-mqtt-config-${stamp()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'myDevice MQTT', UTI: 'public.json' });
}

/** Copies history.db (after flushing its WAL) to the cache directory and opens the share sheet. Returns false when there is no history. */
export async function exportHistory(): Promise<boolean> {
  const { fs, sharing } = fileModules();
  const info = await (await historyDb()).prepareExport();
  if (info.empty) return false;
  const source = new fs.File(info.path.startsWith('/') ? `file://${info.path}` : info.path);
  const target = new fs.File(fs.Paths.cache, `mydevice-mqtt-history-${stamp()}.db`);
  if (target.exists) target.delete();
  source.copy(target);
  await sharing.shareAsync(target.uri, { mimeType: 'application/octet-stream', dialogTitle: 'myDevice MQTT' });
  return true;
}
