import { newMetric } from './defaults';
import { routeMessage } from './routing';
import { utf8 } from '../mqtt/packets';

const T = (s: string) => utf8(s);

describe('routeMessage (MetricsListActivity.messageArrived)', () => {
  it('updates every tile whose topic equals the message topic', () => {
    const a = newMetric(1, { topic: 'a/b' });
    const b = newMetric(1, { topic: 'a/b' });
    const c = newMetric(1, { topic: 'a/c' });
    const r = routeMessage([a, b, c], 'a/b', T('v'), 100);
    expect(r.map((x) => x.metric.id)).toEqual([a.id, b.id]);
    expect(r[0].metric.lastPayload).toBe('v');
    expect(r[0].changed).toBe(true);
  });

  it('never matches wildcards, as in the original (exact string equality)', () => {
    const w = newMetric(1, { topic: 'a/#' });
    expect(routeMessage([w], 'a/b', T('v'), 1)).toEqual([]);
    expect(routeMessage([newMetric(1, { topic: 'a/+' })], 'a/b', T('v'), 1)).toEqual([]);
  });

  it('ignores tiles without a topic', () => {
    expect(routeMessage([newMetric(1, { topic: '' })], '', T('v'), 1)).toEqual([]);
  });

  it('reports whether the tile was pending before the message', () => {
    const m = newMetric(2, { topic: 't', enablePub: true, updateLastPayloadOnPub: false, enableIntermediateState: true, intermediateStateTimeout: 0, enteredIntermediateStateAt: 50 });
    const [r] = routeMessage([m], 't', T('1'), 60);
    expect(r.wasPending).toBe(true);
    expect(r.metric.enteredIntermediateStateAt).toBe(0);
  });

  it('image: static url tiles ignore messages, url-in-payload takes the text, data takes the bytes', () => {
    const stat = newMetric(5, { topic: 't', kind: 1 });
    const url = newMetric(5, { topic: 't', kind: 2 });
    const data = newMetric(5, { topic: 't', kind: 3 });
    const r = routeMessage([stat, url, data], 't', T('http://x/a.png'), 5);
    expect(r.map((x) => x.metric.id)).toEqual([url.id, data.id]);
    expect(r[0].payloadText).toBe('http://x/a.png');
    expect(r[1].payloadText).toBe('');
    expect(Array.from(r[1].payload)).toEqual(Array.from(T('http://x/a.png')));
  });

  it('decodes the payload as UTF-8', () => {
    const [r] = routeMessage([newMetric(1, { topic: 't' })], 't', T('21,5 °C'), 1);
    expect(r.metric.lastPayload).toBe('21,5 °C');
  });
});
