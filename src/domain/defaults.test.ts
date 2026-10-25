import { newBroker, newMetric } from './defaults';

describe('newBroker (original Broker initializers)', () => {
  it('uses the original defaults', () => {
    expect(newBroker()).toMatchObject({
      name: '',
      address: '',
      port: '1883',
      user: '',
      password: '',
      ssl: false,
      trust: false,
      autoConnect: false,
      keepScreenOn: true,
      metricsEditable: true,
      neverHideBrokerName: false,
      colsCount: 0,
      colsCountHorizontal: 0,
      tileWidth: 0,
      longId: 0,
    });
  });

  it('generates a mqttiot-<8 hex> client id and unique ids', () => {
    const a = newBroker();
    const b = newBroker();
    expect(a.clientId).toMatch(/^mqttiot-[0-9a-f]{8}$/);
    expect(a.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(a.id).not.toBe(b.id);
    expect(a.clientId).not.toBe(b.clientId);
  });

  it('applies overrides', () => {
    expect(newBroker({ name: 'x', port: '8080' })).toMatchObject({ name: 'x', port: '8080' });
  });
});

describe('newMetric (original Metric* initializers)', () => {
  it('applies the shared MQTT defaults to every type', () => {
    for (const t of [1, 2, 3, 4, 5, 6] as const) {
      expect(newMetric(t)).toMatchObject({
        type: t,
        topic: '',
        topicPub: '',
        enablePub: true,
        updateLastPayloadOnPub: true,
        enableIntermediateState: true,
        intermediateStateTimeout: 0,
        enteredIntermediateStateAt: 0,
        qos: 0,
        retained: false,
        lastPayload: null,
        jsonPath: '',
        lastJsonPathValue: null,
        jsOnReceive: '',
        jsOnDisplay: '',
        jsOnTap: '',
        jsBlinkExpression: '',
        lastActivity: 0,
        longId: 0,
      });
    }
  });

  it('text: LARGE size, white', () => {
    expect(newMetric(1)).toMatchObject({ mainTextSize: 'LARGE', prefix: '', postfix: '', textColor: -1 });
  });

  it('switch: payloads 1/0, checkbox icons, white colors', () => {
    expect(newMetric(2)).toMatchObject({
      payloadOn: '1',
      payloadOff: '0',
      iconOn: 'ic_check_box_checked',
      iconOff: 'ic_check_box_unchecked',
      onColor: -1,
      offColor: -1,
    });
  });

  it('range: 0..100, precision 0, shows payload value, white', () => {
    expect(newMetric(3)).toMatchObject({
      minValue: 0,
      maxValue: 100,
      decimalPrecision: 0,
      displayPayloadValue: true,
      prefix: '',
      postfix: '',
      progressColor: -1,
    });
  });

  it('multi: LARGE, white, no items', () => {
    expect(newMetric(4)).toMatchObject({ mainTextSize: 'LARGE', textColor: -1, items: [] });
  });

  it('image: static url kind, 5 second reload', () => {
    expect(newMetric(5)).toMatchObject({ kind: 1, imageUrl: '', openUrl: '', reloadInterval: 5 });
  });

  it('color: radio button icon, hex format', () => {
    expect(newMetric(6)).toMatchObject({ icon: 'ic_radio_button_checked', format: 0 });
  });

  it('generates a uuid id per metric and applies overrides', () => {
    const a = newMetric(1, { name: 'T' });
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.name).toBe('T');
    expect(newMetric(1).id).not.toBe(a.id);
  });
});

describe('long ids (stable list ids)', () => {
  const { nextLongId, ensureUniqueLongIds } = require('./defaults') as typeof import('./defaults');

  it('nextLongId is max + 1, starting at 1', () => {
    expect(nextLongId([])).toBe(1);
    expect(nextLongId([{ longId: 3 }, { longId: 7 }, { longId: 5 }])).toBe(8);
  });

  it('ensureUniqueLongIds keeps unique non-zero ids and renumbers the rest', () => {
    const items = [{ longId: 2 }, { longId: 0 }, { longId: 2 }, { longId: 9 }];
    expect(ensureUniqueLongIds(items).map((i) => i.longId)).toEqual([2, 10, 11, 9]);
  });
});
