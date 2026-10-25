import { newMetric } from './defaults';
import { buildDisplay } from './display';
import { applyMessage } from './metrics';
import { buildNotification } from './notification';
import { parseMetrics, serializeMetrics } from './serialize';

const n = (p = {}) => newMetric(7, { name: 'Door', topic: 'home/door', ...p });

describe('notification tile defaults', () => {
  it('is a subscribe-only tile with its own settings', () => {
    expect(n()).toMatchObject({ type: 7, enablePub: false, title: '', onlyOnChange: false, qos: 0, jsonPath: '' });
  });

  it('survives the Gson-style save format', () => {
    const m = n({ title: 'Alert', onlyOnChange: true, longId: 1 });
    expect(parseMetrics(serializeMetrics([m]))).toEqual([m]);
  });
});

describe('buildNotification', () => {
  const received = (m: ReturnType<typeof n>, payload: string, now = 10) => applyMessage(m, payload, now);

  it('uses the tile name as title and the payload as body', () => {
    const r = received(n(), 'OPEN');
    expect(buildNotification(r.metric, 'OPEN', r.changed)).toEqual({ title: 'Door', body: 'OPEN' });
  });

  it('prefers the configured title, then the app name when the tile has no name', () => {
    const a = received(n({ title: 'Front door' }), 'x');
    expect(buildNotification(a.metric, 'x', a.changed)?.title).toBe('Front door');
    const b = received(n({ name: '' }), 'x');
    expect(buildNotification(b.metric, 'x', b.changed)?.title).toBe('myDevice MQTT');
  });

  it('uses the json path value as the body', () => {
    const r = received(n({ jsonPath: '$.msg' }), '{"msg":"Hello"}');
    expect(buildNotification(r.metric, '{"msg":"Hello"}', r.changed)?.body).toBe('Hello');
  });

  it('falls back to the raw payload when the json path does not match', () => {
    const r = received(n({ jsonPath: '$.msg' }), 'plain');
    expect(buildNotification(r.metric, 'plain', r.changed)?.body).toBe('plain');
  });

  it('does not notify for an empty or whitespace payload (retained message clears)', () => {
    for (const p of ['', '   ']) {
      const r = received(n(), p);
      expect(buildNotification(r.metric, p, r.changed)).toBeNull();
    }
  });

  it('with onlyOnChange, repeated payloads are ignored', () => {
    const m = n({ onlyOnChange: true });
    const first = received(m, 'A');
    expect(buildNotification(first.metric, 'A', first.changed)).not.toBeNull();
    const again = received(first.metric, 'A', 11);
    expect(buildNotification(again.metric, 'A', again.changed)).toBeNull();
    const other = received(again.metric, 'B', 12);
    expect(buildNotification(other.metric, 'B', other.changed)?.body).toBe('B');
  });

  it('without onlyOnChange every message notifies, even a repeat', () => {
    const first = received(n(), 'A');
    const again = received(first.metric, 'A', 11);
    expect(buildNotification(again.metric, 'A', again.changed)?.body).toBe('A');
  });
});

describe('notification tile display', () => {
  it('shows a ringing bell once a message arrived and the last time', () => {
    const empty = n();
    expect(buildDisplay(empty, 100)).toMatchObject({ kind: 'notification', icon: 'ic_bell_off', on: false, bottom: '' });
    const got = applyMessage(empty, 'hi', 90).metric;
    expect(buildDisplay(got, 100)).toMatchObject({ icon: 'ic_bell_on', on: true, bottom: '10 seconds ago' });
  });
});
