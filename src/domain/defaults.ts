import type {
  Broker,
  ColorMetric,
  ImageMetric,
  Metric,
  MetricBase,
  MetricTypeId,
  MultiSwitchMetric,
  NotificationMetric,
  RangeMetric,
  SwitchMetric,
  TextMetric,
} from './types';

const hex = (n: number): string =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');

/** Random UUID v4 text, like Java's UUID.randomUUID().toString(). */
export function uuid(): string {
  const variant = '89ab'[Math.floor(Math.random() * 4)];
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`;
}

export function newBroker(partial: Partial<Broker> = {}): Broker {
  return {
    longId: 0,
    clientId: `mqttiot-${hex(8)}`,
    id: uuid(),
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
    ...partial,
  };
}

function base(type: MetricTypeId): MetricBase {
  return {
    name: '',
    longId: 0,
    type,
    id: uuid(),
    jsOnDisplay: '',
    jsOnTap: '',
    jsBlinkExpression: '',
    lastActivity: 0,
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
  };
}

export function newMetric<T extends MetricTypeId>(type: T, partial: Partial<Metric> = {}): Extract<Metric, { type: T }> {
  const b = base(type);
  let m: Metric;
  switch (type) {
    case 1:
      m = { ...b, type: 1, mainTextSize: 'LARGE', prefix: '', postfix: '', textColor: -1 } as TextMetric;
      break;
    case 2:
      m = {
        ...b,
        type: 2,
        payloadOn: '1',
        payloadOff: '0',
        iconOn: 'ic_check_box_checked',
        iconOff: 'ic_check_box_unchecked',
        onColor: -1,
        offColor: -1,
      } as SwitchMetric;
      break;
    case 3:
      m = {
        ...b,
        type: 3,
        minValue: 0,
        maxValue: 100,
        decimalPrecision: 0,
        displayPayloadValue: true,
        prefix: '',
        postfix: '',
        progressColor: -1,
      } as RangeMetric;
      break;
    case 4:
      m = { ...b, type: 4, mainTextSize: 'LARGE', textColor: -1, items: [] } as MultiSwitchMetric;
      break;
    case 5:
      m = { ...b, type: 5, kind: 1, imageUrl: '', openUrl: '', reloadInterval: 5 } as ImageMetric;
      break;
    case 7:
      m = { ...b, type: 7, enablePub: false, updateLastPayloadOnPub: false, enableIntermediateState: false, title: '', onlyOnChange: false } as NotificationMetric;
      break;
    default:
      m = { ...b, type: 6, icon: 'ic_radio_button_checked', format: 0 } as ColorMetric;
  }
  return { ...m, ...partial } as Extract<Metric, { type: T }>;
}

/** Assigns max(existing longId) + 1 to every new broker or tile. */
export function nextLongId(items: { longId: number }[]): number {
  return items.reduce((max, i) => Math.max(max, i.longId), 0) + 1;
}

/** RecyclerView-style stable ids must be unique: keeps the first holder of each non-zero id, renumbers the rest. */
export function ensureUniqueLongIds<T extends { longId: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  let next = nextLongId(items);
  return items.map((i) => {
    if (i.longId > 0 && !seen.has(i.longId)) {
      seen.add(i.longId);
      return i;
    }
    const longId = next++;
    seen.add(longId);
    return { ...i, longId };
  });
}
