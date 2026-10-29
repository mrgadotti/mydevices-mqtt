import { ensureUniqueLongIds, newMetric } from '../src/domain/defaults';
import type { Metric } from '../src/domain/types';

export const DEMO_BASE = 'mqttiot/demo';

/** One tile of each type, wired to topics under mqttiot/demo/ on broker.emqx.io. */
export function demoMetrics(): Metric[] {
  const t = (s: string) => `${DEMO_BASE}/${s}`;
  return ensureUniqueLongIds([
    newMetric(1, { name: 'Temperature', topic: t('temp'), postfix: ' °C', mainTextSize: 'LARGE' }),
    newMetric(2, {
      name: 'Lamp',
      topic: t('lamp'),
      iconOn: 'ic_light_bulb_01',
      iconOff: 'ic_light_bulb_01',
      onColor: -256,
      offColor: -8355712,
    }),
    newMetric(3, { name: 'Dimmer', topic: t('dim'), postfix: '%', progressColor: -12537857, displayPayloadValue: true }),
    newMetric(4, {
      name: 'Mode',
      topic: t('mode'),
      items: [
        { label: 'Auto', payload: 'a' },
        { label: 'Cool', payload: 'c' },
        { label: 'Heat', payload: 'h' },
      ],
    }),
    newMetric(5, { name: 'Picture', kind: 1, imageUrl: 'https://www.gstatic.com/webp/gallery/1.png', reloadInterval: 60 }),
    newMetric(6, { name: 'Strip', topic: t('color'), icon: 'ic_light_bulb_01' }),
  ]);
}

export const DEMO_VALUES: Record<string, string> = {
  temp: '21.5',
  lamp: '1',
  dim: '40',
  mode: 'h',
  color: '#FF8800',
};

/** The same tiles as saved after receiving DEMO_VALUES (lastPayload and lastActivity set). */
export function demoMetricsWithData(nowSec = Math.floor(Date.now() / 1000)): Metric[] {
  return demoMetrics().map((m) => {
    const key = m.topic.split('/').pop() ?? '';
    const value = DEMO_VALUES[key];
    return value === undefined ? m : { ...m, lastPayload: value, lastActivity: nowSec - 5 };
  });
}

/** Tiles that exercise every script hook. */
export function scriptDemoMetrics(): Metric[] {
  const t = (s: string) => `${DEMO_BASE}/${s}`;
  return ensureUniqueLongIds([
    newMetric(1, {
      name: 'On Display',
      topic: t('s1'),
      postfix: ' C',
      jsOnDisplay: "if (event.getLastPayload() < 20) { event.textColor = '#ff8080'; event.text = 'COLD'; }",
      jsBlinkExpression: 'val < 20',
    }),
    newMetric(1, { name: 'On Receive', topic: t('s2'), jsOnReceive: 'event.payload = event.payload.toUpperCase() + "!"' }),
    newMetric(2, {
      name: 'On Tap',
      topic: t('s3'),
      jsOnTap: `app.publish('${t('tapped')}', 'script ran', false, 0); event.preventDefault = true;`,
    }),
    newMetric(1, { name: 'Broken', topic: t('s4'), jsOnReceive: 'thisFunctionDoesNotExist()' }),
  ]);
}

const WIDGET_BASE = 'mqttiot/widgets';

/** One widget of every kind, on topics under mqttiot/widgets/ (positions are left to the auto layout). */
export function widgetDemoMetrics(): Metric[] {
  const t = (s: string) => `${WIDGET_BASE}/${s}`;
  const range = (widget: string, extra: Partial<Metric> = {}) =>
    newMetric(3, { name: widget, widget, topic: t(widget), minValue: 0, maxValue: 100, displayPayloadValue: true, ...extra } as Partial<Metric>);
  const sw = (widget: string, extra: Partial<Metric> = {}) =>
    newMetric(2, { name: widget, widget, topic: t(widget), iconOn: 'ic_light_bulb_01', iconOff: 'ic_light_bulb_01', ...extra } as Partial<Metric>);
  const text = (widget: string, extra: Partial<Metric> = {}) => newMetric(1, { name: widget, widget, topic: t(widget), ...extra } as Partial<Metric>);
  const multi = (widget: string) =>
    newMetric(4, {
      name: widget,
      widget,
      topic: t(widget),
      items: [
        { label: 'Auto', payload: 'a' },
        { label: 'Cool', payload: 'c' },
        { label: 'Heat', payload: 'h' },
      ],
    } as Partial<Metric>);
  return ensureUniqueLongIds([
    sw('button'),
    sw('styledButton', { opts: { style: 'outlined', edge: 'pill', labelOn: 'Running', labelOff: 'Stopped' } }),
    sw('iconButton'),
    sw('switch'),
    range('slider'),
    range('verticalSlider'),
    range('stepSlider', { opts: { step: 10 } }),
    range('verticalStepSlider', { opts: { step: 10 } }),
    range('stepH', { opts: { step: 5 } }),
    range('stepV', { opts: { step: 5 } }),
    range('levelSlider'),
    text('joystick'),
    newMetric(6, { name: 'rgb', widget: 'rgb', topic: t('rgb') } as Partial<Metric>),
    newMetric(6, { name: 'color', widget: 'color', topic: t('color') } as Partial<Metric>),
    text('value'),
    text('labeled', { prefix: 'Temp: ', postfix: ' C' }),
    sw('led'),
    range('gauge'),
    range('radialGauge'),
    range('enhancedGauge'),
    text('lcd'),
    range('chart'),
    text('terminal', { opts: { timestamps: true } }),
    range('level'),
    range('levelV'),
    newMetric(5, { name: 'image', widget: 'image', kind: 1, imageUrl: 'https://www.gstatic.com/webp/gallery/1.png', reloadInterval: 60 } as Partial<Metric>),
    sw('icon'),
    multi('menu'),
    text('textInput'),
    text('numericInput'),
    text('timeInput'),
    multi('segmented'),
    text('text', { opts: { text: 'Static text widget' } }),
    text('spacer', { enablePub: false }),
    newMetric(7, { name: 'notification', widget: 'notification', topic: t('notification') } as Partial<Metric>),
  ]);
}

export const WIDGET_VALUES: Record<string, string> = {
  button: '1', styledButton: '1', iconButton: '1', switch: '1', slider: '35', verticalSlider: '60', stepSlider: '40', verticalStepSlider: '30',
  stepH: '25', stepV: '50', levelSlider: '70', joystick: '128,200', rgb: '#FF8800', color: '#24C48E', value: '21.5', labeled: '22.4',
  led: '1', gauge: '65', radialGauge: '45', enhancedGauge: '80', lcd: '12:34', chart: '50', terminal: 'boot ok', level: '55', levelV: '75',
  icon: '1', menu: 'c', textInput: 'hello', numericInput: '7', timeInput: '08:30', segmented: 'h',
};
