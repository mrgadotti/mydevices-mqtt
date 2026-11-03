import { BACKUP_VERSION, buildBackup, serializeBackup } from './backup';
import { newBroker, newMetric } from './defaults';
import { METRIC_TEXT } from './types';

describe('buildBackup', () => {
  const b1 = newBroker({ longId: 1, id: 'a', name: 'One', password: 'secret' });
  const b2 = newBroker({ longId: 2, id: 'b', name: 'Two', password: 'pä$s' });
  const m = newMetric(METRIC_TEXT, { name: 'T' });
  const now = new Date('2026-01-02T03:04:05.000Z');

  it('has a version, the settings and every broker with its metrics', () => {
    const out = buildBackup({ language: 'de', theme: 'dark' }, [b1, b2], { a: [m] }, now);
    expect(out.version).toBe(BACKUP_VERSION);
    expect(out.exportedAt).toBe('2026-01-02T03:04:05.000Z');
    expect(out.settings).toEqual({ language: 'de', theme: 'dark' });
    expect(out.brokers.map((e) => e.broker.name)).toEqual(['One', 'Two']);
    expect(out.brokers[0].metrics).toEqual([m]);
    expect(out.brokers[1].metrics).toEqual([]);
  });

  it('encodes the password in base64 (UTF-8) and does not keep the plain field', () => {
    const out = buildBackup({ language: 'system', theme: 'system' }, [b1, b2], {}, now);
    expect(out.brokers[0].broker.passwordBase64).toBe('c2VjcmV0');
    expect(out.brokers[1].broker.passwordBase64).toBe('cMOkJHM=');
    expect('password' in out.brokers[0].broker).toBe(false);
    expect(serializeBackup(out)).not.toContain('"secret"');
  });

  it('serializes to valid JSON', () => {
    const out = buildBackup({ language: 'en', theme: 'light' }, [b1], { a: [m] }, now);
    expect(JSON.parse(serializeBackup(out)).brokers[0].broker.id).toBe('a');
  });
});
