import { newMetric } from './defaults';
import {
  applyMessage,
  colorDisplay,
  currentValue,
  isPending,
  isSwitchOn,
  multiLabel,
  nextSwitchPayload,
  parseJavaFloat,
  publishQos,
  pubTopic,
  rangeLabel,
  rangeProgress,
  rangeValue,
  recordPublished,
  relativeTimeSpan,
  startPending,
  textDisplay,
} from './metrics';

const text = (p = {}) => newMetric(1, p);
const sw = (p = {}) => newMetric(2, p);
const range = (p = {}) => newMetric(3, p);
const multi = (p = {}) => newMetric(4, p);
const image = (p = {}) => newMetric(5, p);
const color = (p = {}) => newMetric(6, p);

describe('applyMessage (MetricBasicMqtt.messageReceived)', () => {
  it('stores payload, activity time and the changed flag', () => {
    const a = applyMessage(text(), 'a', 100);
    expect(a.metric).toMatchObject({ lastPayload: 'a', lastActivity: 100 });
    expect(a.changed).toBe(true);
    const b = applyMessage(a.metric, 'a', 105);
    expect(b.metric).toMatchObject({ lastPayload: 'a', lastActivity: 105 });
    expect(b.changed).toBe(false);
  });

  it('extracts the json path value, or empties it and reports a json error', () => {
    const m = text({ jsonPath: '$.t' });
    expect(applyMessage(m, '{"t":21.5}', 1).metric.lastJsonPathValue).toBe('21.5');
    const bad = applyMessage(m, 'not json', 1);
    expect(bad.metric.lastJsonPathValue).toBe('');
    expect(bad.jsonError).toBe('JSON path error');
  });

  it('leaves the intermediate state', () => {
    const m = sw({ enteredIntermediateStateAt: 50 });
    expect(applyMessage(m, '1', 51).metric.enteredIntermediateStateAt).toBe(0);
  });

  it('does not mutate its input', () => {
    const m = text();
    applyMessage(m, 'x', 5);
    expect(m.lastPayload).toBeNull();
  });
});

describe('switch (MetricSwitch.messageReceived)', () => {
  it('ignores payloads that match neither on nor off', () => {
    const before = applyMessage(sw(), '1', 10).metric;
    const r = applyMessage(before, 'junk', 11);
    expect(r.metric).toEqual(before);
    expect(r.changed).toBe(false);
  });

  it('ignores an empty payload', () => {
    const before = applyMessage(sw(), '1', 10).metric;
    expect(applyMessage(before, '', 11).metric).toEqual(before);
  });

  it('matches the json path value against on/off', () => {
    const m = sw({ jsonPath: '$.state' });
    const r = applyMessage(m, '{"state":"1"}', 5).metric;
    expect(r.lastJsonPathValue).toBe('1');
    expect(isSwitchOn(r)).toBe(true);
  });

  it('falls back to the raw payload when the json path fails', () => {
    const r = applyMessage(sw({ jsonPath: '$.state' }), '1', 5);
    expect(r.jsonError).toBe('JSON path error');
    expect(r.metric.lastPayload).toBe('1');
  });

  it('on/off state and next tap payload', () => {
    const on = applyMessage(sw(), '1', 1).metric;
    const off = applyMessage(on, '0', 2).metric;
    expect(isSwitchOn(on)).toBe(true);
    expect(isSwitchOn(off)).toBe(false);
    expect(nextSwitchPayload(on)).toBe('0');
    expect(nextSwitchPayload(off)).toBe('1');
    // no payload yet counts as "on", so the first tap publishes the off payload
    expect(nextSwitchPayload(sw())).toBe('0');
  });

  it('acts as a button when on and off payloads are equal', () => {
    expect(nextSwitchPayload(sw({ payloadOn: 'go', payloadOff: 'go', lastPayload: 'go' }))).toBe('go');
  });
});

describe('image messages (MetricImage.messageReceived)', () => {
  it('kind 1 (static url) ignores messages', () => {
    const m = image({ kind: 1 });
    expect(applyMessage(m, 'http://x', 5).metric).toEqual(m);
  });
  it('kind 2 takes the url from the payload or json path value', () => {
    expect(applyMessage(image({ kind: 2 }), 'http://x/a.png', 5).metric).toMatchObject({
      imageUrl: 'http://x/a.png',
      lastActivity: 5,
    });
    const j = applyMessage(image({ kind: 2, jsonPath: '$.u' }), '{"u":"http://y"}', 5).metric;
    expect(j.type === 5 && j.imageUrl).toBe('http://y');
  });
  it('kind 3 clears the payload and always counts as changed', () => {
    const r = applyMessage(image({ kind: 3, lastPayload: 'old' }), 'binary', 7);
    expect(r.metric.lastPayload).toBe('');
    expect(r.changed).toBe(true);
    expect(r.metric.lastActivity).toBe(7);
  });
});

describe('parseJavaFloat', () => {
  it('accepts what Float.parseFloat accepts', () => {
    expect(parseJavaFloat(' 21.5 ')).toBe(21.5);
    expect(parseJavaFloat('1e3')).toBe(1000);
    expect(parseJavaFloat('-.5')).toBe(-0.5);
    expect(parseJavaFloat('2f')).toBe(2);
    expect(parseJavaFloat('+7')).toBe(7);
  });
  it('rejects the rest', () => {
    for (const bad of ['abc', '', '1,5', '0x10']) expect(parseJavaFloat(bad)).toBeNull();
  });
});

describe('range (MetricRange)', () => {
  const fed = (m: ReturnType<typeof range>, payload: string) => applyMessage(m, payload, 1).metric as typeof m;

  it('progress is a percentage 0..100, clamped', () => {
    const m = range({ minValue: 0, maxValue: 200 });
    expect(rangeProgress(fed(m, '50'))).toBe(25);
    expect(rangeProgress(fed(m, '-5'))).toBe(0);
    expect(rangeProgress(fed(m, '500'))).toBe(100);
  });

  it('unparsable and empty values read as 0', () => {
    const m = range();
    expect(rangeValue(fed(m, 'abc'))).toBe(0);
    expect(rangeValue(m)).toBe(0);
  });

  it('reads the json path value when a path is set', () => {
    const m = range({ jsonPath: '$.v' });
    expect(rangeValue(fed(m, '{"v":"42"}'))).toBe(42);
  });

  it('labels prefix + %.Nf + postfix of the value (displayPayloadValue) or of the progress', () => {
    const v = range({ decimalPrecision: 1, prefix: 'T=', postfix: 'C', displayPayloadValue: true });
    expect(rangeLabel(fed(v, '21.456'))).toBe('T=21.5C');
    const p = range({ minValue: 0, maxValue: 10, decimalPrecision: 2, displayPayloadValue: false, postfix: '%' });
    expect(rangeLabel(fed(p, '3'))).toBe('30.00%');
  });
});

describe('text, multi and color display', () => {
  it('text shows prefix + value + postfix (empty when no payload)', () => {
    expect(textDisplay(text({ prefix: '[', postfix: ']' }))).toBe('[]');
    expect(textDisplay(applyMessage(text({ prefix: 'T=', postfix: 'C' }), '21', 1).metric as never)).toBe('T=21C');
  });

  it('current value follows the json path setting', () => {
    expect(currentValue(text({ lastPayload: 'raw', lastJsonPathValue: 'ext' }))).toBe('raw');
    expect(currentValue(text({ jsonPath: '$.a', lastPayload: 'raw', lastJsonPathValue: 'ext' }))).toBe('ext');
  });

  it('multi shows the item label, else the raw value', () => {
    const m = multi({ items: [{ label: 'Cool', payload: 'c' }, { label: 'Heat', payload: 'h' }] });
    expect(multiLabel({ ...m, lastPayload: 'h' })).toBe('Heat');
    expect(multiLabel({ ...m, lastPayload: 'zzz' })).toBe('zzz');
    expect(multiLabel(m)).toBe('');
  });

  it('color accepts hex strings, names and numeric payloads', () => {
    expect(colorDisplay(color({ lastPayload: '#ff8800' }))).toEqual({ color: -30720, invalid: false });
    expect(colorDisplay(color({ lastPayload: 'red' }))).toEqual({ color: -65536, invalid: false });
    expect(colorDisplay(color({ lastPayload: '16746496' }))).toEqual({ color: -30720, invalid: false });
    expect(colorDisplay(color())).toEqual({ color: -1, invalid: false });
    expect(colorDisplay(color({ lastPayload: 'zz' })).invalid).toBe(true);
  });
});

describe('publishing', () => {
  it('uses topicPub when set, else topic', () => {
    expect(pubTopic(sw({ topic: 'a', topicPub: '' }))).toBe('a');
    expect(pubTopic(sw({ topic: 'a', topicPub: 'b' }))).toBe('b');
  });

  it('keeps the configured QoS up to 2', () => {
    expect(publishQos(sw({ qos: 0 }))).toBe(0);
    expect(publishQos(sw({ qos: 1 }))).toBe(1);
    expect(publishQos(sw({ qos: 2 }))).toBe(2);
  });

  it('recordPublished enters the pending state on tiles sharing the topic', () => {
    const a = sw({ topic: 't', updateLastPayloadOnPub: false });
    const other = sw({ topic: 'x', updateLastPayloadOnPub: false });
    const [ra, rother] = recordPublished([a, other], 't', '1', 100);
    expect(ra.enteredIntermediateStateAt).toBe(100);
    expect(rother.enteredIntermediateStateAt).toBe(0);
  });

  it('recordPublished updates the last payload when updateLastPayloadOnPub is set', () => {
    const a = sw({ topic: 't', updateLastPayloadOnPub: true });
    const [ra] = recordPublished([a], 't', '1', 100);
    expect(ra).toMatchObject({ lastPayload: '1', lastActivity: 100 });
  });

  it('recordPublished ignores switch tiles for payloads that are neither on nor off', () => {
    const a = sw({ topic: 't' });
    expect(recordPublished([a], 't', 'junk', 100)[0]).toEqual(a);
  });

  it('matches tiles through topicPub as well', () => {
    const a = text({ topic: 'in', topicPub: 'out', updateLastPayloadOnPub: true });
    expect(recordPublished([a], 'out', 'v', 9)[0].lastPayload).toBe('v');
  });
});

describe('intermediate state (isInIntermediateState)', () => {
  const m = sw({ enablePub: true, updateLastPayloadOnPub: false, enableIntermediateState: true, intermediateStateTimeout: 5 });

  it('is pending until the timeout elapses', () => {
    const s = startPending(m, 100);
    expect(isPending(s, 105)).toBe(true);
    expect(isPending(s, 106)).toBe(false);
  });

  it('timeout 0 stays pending until a message arrives', () => {
    const s = startPending({ ...m, intermediateStateTimeout: 0 }, 100);
    expect(isPending(s, 100000)).toBe(true);
    expect(isPending(applyMessage(s, '1', 100001).metric, 100002)).toBe(false);
  });

  it('is off unless publishing and intermediate state are on and updateLastPayloadOnPub is off', () => {
    const s = startPending(m, 100);
    expect(isPending({ ...s, enablePub: false }, 101)).toBe(false);
    expect(isPending({ ...s, enableIntermediateState: false }, 101)).toBe(false);
    expect(isPending({ ...s, updateLastPayloadOnPub: true }, 101)).toBe(false);
  });
});

describe('relativeTimeSpan (DateUtils, 1 second resolution)', () => {
  const now = 1_000_000;
  it('formats seconds, minutes, hours and days', () => {
    expect(relativeTimeSpan(now, now)).toBe('0 seconds ago');
    expect(relativeTimeSpan(now - 1, now)).toBe('1 second ago');
    expect(relativeTimeSpan(now - 45, now)).toBe('45 seconds ago');
    expect(relativeTimeSpan(now - 60, now)).toBe('1 minute ago');
    expect(relativeTimeSpan(now - 3599, now)).toBe('59 minutes ago');
    expect(relativeTimeSpan(now - 7200, now)).toBe('2 hours ago');
    expect(relativeTimeSpan(now - 3 * 86400, now)).toBe('3 days ago');
  });
  it('is empty when there was no activity', () => {
    expect(relativeTimeSpan(0, now)).toBe('');
  });
});
