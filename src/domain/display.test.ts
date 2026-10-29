import { newMetric } from './defaults';
import { applyMessage } from './metrics';
import { buildDisplay } from './display';

const feed = <T extends ReturnType<typeof newMetric>>(m: T, payload: string, now = 100): T => applyMessage(m, payload, now).metric as T;

describe('buildDisplay (MetricsAdapter.onBindViewHolder)', () => {
  it('shows the name and a relative time, empty before any activity', () => {
    const m = newMetric(1, { name: 'Temp' });
    expect(buildDisplay(m, 200)).toMatchObject({ name: 'Temp', bottom: '' });
    expect(buildDisplay(feed(m, '1', 190), 200).bottom).toBe('10 seconds ago');
  });

  it('text: prefix + value + postfix in an opaque hex color', () => {
    const m = feed(newMetric(1, { prefix: 'T=', postfix: ' C', textColor: -12537857 }), '21.5');
    expect(buildDisplay(m, 100)).toMatchObject({ kind: 'text', text: 'T=21.5 C', color: '#40AFFF' });
  });

  it('text shows only prefix and postfix before data', () => {
    expect(buildDisplay(newMetric(1, { postfix: ' °C' }), 1)).toMatchObject({ text: ' °C' });
  });

  it('switch: on/off icon and color, alpha dropped', () => {
    const base = newMetric(2, { iconOn: 'ic_a', iconOff: 'ic_b', onColor: -256, offColor: 0x80ff0000 | 0 });
    expect(buildDisplay(feed(base, '1'), 1)).toMatchObject({ kind: 'switch', icon: 'ic_a', color: '#FFFF00', on: true });
    expect(buildDisplay(feed(base, '0'), 1)).toMatchObject({ icon: 'ic_b', color: '#FF0000', on: false });
    expect(buildDisplay(base, 1)).toMatchObject({ icon: 'ic_b', on: false });
  });

  it('range: progress, label and progress color', () => {
    const m = feed(newMetric(3, { postfix: '%', progressColor: -12537857, displayPayloadValue: true }), '40');
    expect(buildDisplay(m, 1)).toMatchObject({ kind: 'range', progress: 40, text: '40%', color: '#40AFFF' });
  });

  it('multi: label of the matching item', () => {
    const m = feed(newMetric(4, { items: [{ label: 'Heat', payload: 'h' }] }), 'h');
    expect(buildDisplay(m, 1)).toMatchObject({ kind: 'multi', text: 'Heat' });
  });

  it('color: parsed color and the icon, or an invalid color message', () => {
    expect(buildDisplay(feed(newMetric(6, { icon: 'ic_x' }), '#ff8800'), 1)).toMatchObject({ kind: 'color', icon: 'ic_x', color: '#FF8800', error: '' });
    expect(buildDisplay(feed(newMetric(6), '16746496'), 1)).toMatchObject({ color: '#FF8800' });
    expect(buildDisplay(feed(newMetric(6), 'zzz'), 1)).toMatchObject({ error: 'Invalid color format' });
  });

  it('image: url comes from the tile settings or the payload', () => {
    expect(buildDisplay(newMetric(5, { kind: 1, imageUrl: 'http://a/b.png' }), 1)).toMatchObject({ kind: 'image', url: 'http://a/b.png' });
    const p = feed(newMetric(5, { kind: 2 }), 'http://c/d.png');
    expect(buildDisplay(p, 1)).toMatchObject({ url: 'http://c/d.png' });
  });

  it('carries the metric blink flag', () => {
    expect(buildDisplay(newMetric(1, {}), 1).blink).toBe(false);
  });
});
