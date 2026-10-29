import { ensureUniqueLongIds, newMetric } from './defaults';
import { parseMetrics, serializeMetrics } from './serialize';

describe('serializeMetrics (Gson-compatible)', () => {
  it('writes a JSON array of metric objects with Java field names and omits nulls', () => {
    const json = JSON.parse(serializeMetrics([newMetric(2, { name: 'Lamp', topic: 'home/lamp' })]));
    expect(json).toHaveLength(1);
    expect(json[0]).toMatchObject({
      type: 2,
      name: 'Lamp',
      topic: 'home/lamp',
      payloadOn: '1',
      payloadOff: '0',
      iconOn: 'ic_check_box_checked',
      enablePub: true,
      qos: 0,
    });
    expect('lastPayload' in json[0]).toBe(false);
    expect('lastJsonPathValue' in json[0]).toBe(false);
  });

  it('keeps enum names and nested items', () => {
    const json = JSON.parse(
      serializeMetrics([newMetric(4, { items: [{ label: 'A', payload: 'a' }] }), newMetric(1)]),
    );
    expect(json[0].items).toEqual([{ label: 'A', payload: 'a' }]);
    expect(json[1].mainTextSize).toBe('LARGE');
  });
});

describe('parseMetrics', () => {
  it('round-trips every type', () => {
    const all = ensureUniqueLongIds(([1, 2, 3, 4, 5, 6] as const).map((t) => newMetric(t, { name: `m${t}`, topic: `t/${t}` })));
    expect(parseMetrics(serializeMetrics(all))).toEqual(all);
  });

  it('fills fields missing from older exports with the defaults', () => {
    const [m] = parseMetrics('[{"type":3,"name":"Temp","topic":"t"}]');
    expect(m).toMatchObject({ type: 3, name: 'Temp', topic: 't', minValue: 0, maxValue: 100, enablePub: true });
    expect(m.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('renumbers duplicate or zero long ids', () => {
    const list = parseMetrics('[{"type":1,"longId":0},{"type":1,"longId":0},{"type":1,"longId":5}]');
    expect(list.map((m) => m.longId)).toEqual([6, 7, 5]);
  });

  it('skips unknown types and tolerates nulls', () => {
    const list = parseMetrics('[{"type":99},{"type":1,"name":"ok","lastPayload":null}]');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('ok');
  });

  it('throws on invalid json or a non-array', () => {
    expect(() => parseMetrics('nope')).toThrow('Invalid metrics payload');
    expect(() => parseMetrics('{"a":1}')).toThrow('Invalid metrics payload');
  });
});
