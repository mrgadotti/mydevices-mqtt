import { BACKUP_VERSION, buildBackup, parseBackup, serializeBackup } from './backup';
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

describe('parseBackup', () => {
  const settings = { language: 'de', theme: 'dark' };
  const b1 = newBroker({ longId: 1, id: 'a', name: 'One', password: 'secret' });
  const b2 = newBroker({ longId: 2, id: 'b', name: 'Two', password: 'pä$s 日本語 😀' });
  const m = newMetric(METRIC_TEXT, { name: 'T', longId: 1 });
  const text = (obj: unknown) => JSON.stringify(obj);
  const roundtrip = () => serializeBackup(buildBackup(settings, [b1, b2], { a: [m] }));

  it('roundtrips buildBackup -> serializeBackup -> parseBackup', () => {
    const r = parseBackup(roundtrip());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.settings).toEqual(settings);
    expect(r.brokers).toEqual([b1, b2]);
    expect(r.metricsByBroker).toEqual({ a: [m], b: [] });
  });

  it('restores non-ASCII passwords', () => {
    const r = parseBackup(roundtrip());
    expect(r.ok && r.brokers[1].password).toBe('pä$s 日本語 😀');
  });

  it('accepts a broker without password and tolerates missing optional parts', () => {
    const r = parseBackup(text({ app: 'myDevice MQTT', version: 1, brokers: [{ broker: { name: 'x' } }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.settings).toEqual({});
    expect(r.brokers[0].password).toBe('');
    expect(r.brokers[0].name).toBe('x');
    expect(r.metricsByBroker[r.brokers[0].id]).toEqual([]);
  });

  it('accepts a backup without brokers', () => {
    const r = parseBackup(text({ app: 'myDevice MQTT', version: 1 }));
    expect(r.ok && r.brokers).toEqual([]);
  });

  it('gives duplicate broker ids and long ids unique values', () => {
    const e = { broker: { id: 'same', longId: 1 }, metrics: [] };
    const r = parseBackup(text({ app: 'myDevice MQTT', version: 1, brokers: [e, e] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(new Set(r.brokers.map((b) => b.id)).size).toBe(2);
    expect(new Set(r.brokers.map((b) => b.longId)).size).toBe(2);
  });

  it('rejects garbage, other apps, unsupported versions and bad structures', () => {
    const err = (s: string) => {
      const r = parseBackup(s);
      return r.ok ? 'ok' : r.error;
    };
    expect(err('not json')).toBe('invalid_json');
    expect(err('[]')).toBe('not_backup');
    expect(err(text({ app: 'other', version: 1 }))).toBe('not_backup');
    expect(err(text({ app: 'myDevice MQTT' }))).toBe('unsupported_version');
    expect(err(text({ app: 'myDevice MQTT', version: BACKUP_VERSION + 1 }))).toBe('unsupported_version');
    expect(err(text({ app: 'myDevice MQTT', version: 0 }))).toBe('unsupported_version');
    expect(err(text({ app: 'myDevice MQTT', version: 1, brokers: {} }))).toBe('invalid_structure');
    expect(err(text({ app: 'myDevice MQTT', version: 1, brokers: [1] }))).toBe('invalid_structure');
    expect(err(text({ app: 'myDevice MQTT', version: 1, brokers: [{ broker: {}, metrics: 5 }] }))).toBe('invalid_structure');
    expect(err(text({ app: 'myDevice MQTT', version: 1, brokers: [{ broker: { passwordBase64: '@@' } }] }))).toBe('invalid_structure');
  });
});
