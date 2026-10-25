import { newMetric } from '../domain/defaults';
import { buildDisplay } from '../domain/display';
import { applyMessage } from '../domain/metrics';
import { evalBlink, runOnDisplay, runOnReceive, runOnTap, type HookEnv } from './hooks';

const env = (): HookEnv & { published: unknown[][]; opened: string[] } => {
  const published: unknown[][] = [];
  const opened: string[] = [];
  return {
    published,
    opened,
    data: new Map(),
    app: {
      publish: (...a: unknown[]) => void published.push(a),
      openUri: (u: string) => void opened.push(u),
    } as never,
  };
};

describe('evalBlink (val and secs)', () => {
  it('evaluates a boolean expression over the payload and the seconds since activity', () => {
    expect(evalBlink('val > 30', '35', 0)).toEqual({ value: true });
    expect(evalBlink('val > 30', '20', 0)).toEqual({ value: false });
    expect(evalBlink('secs > 60', null, 61)).toEqual({ value: true });
  });
  it('is false when empty and reports errors', () => {
    expect(evalBlink('', '1', 0)).toEqual({ value: false });
    expect(evalBlink('nope(', '1', 0)).toMatchObject({ error: expect.stringContaining('SyntaxError') });
  });
});

describe('runOnReceive', () => {
  it('lets the script rewrite the payload and see the topic', () => {
    const m = newMetric(1, { topic: 'a/b', jsOnReceive: 'event.payload = event.payload.toUpperCase() + event.topic' });
    expect(runOnReceive(m, 'a/b', 'hi', env())).toEqual({ payload: 'HIa/b', error: '' });
  });
  it('can publish through app', () => {
    const e = env();
    const m = newMetric(1, { jsOnReceive: "app.publish('x/y', 'v', false, 1)" });
    runOnReceive(m, 't', 'p', e);
    expect(e.published).toEqual([['x/y', 'v', false, 1]]);
  });
  it('keeps the payload and reports the error when the script throws', () => {
    const m = newMetric(1, { jsOnReceive: 'boom()' });
    const r = runOnReceive(m, 't', 'p', env());
    expect(r.payload).toBe('p');
    expect(r.error).toContain('ReferenceError');
  });
  it('shares event.data between hooks of the same tile', () => {
    const e = env();
    const m = newMetric(1, { jsOnReceive: 'event.data = {n: (event.data ? event.data.n : 0) + 1}' });
    runOnReceive(m, 't', 'p', e);
    runOnReceive(m, 't', 'p', e);
    expect(e.data.get(m.id)).toEqual({ n: 2 });
  });
});

describe('runOnDisplay', () => {
  it('overrides text and text color', () => {
    const m0 = newMetric(1, { jsOnDisplay: "if (event.getLastPayload() < 20) { event.textColor = '#ffcccc'; event.text = 'COLD'; }" });
    const m = applyMessage(m0, '10', 100).metric;
    const r = runOnDisplay(m, buildDisplay(m, 105), 105, env());
    expect(r.display).toMatchObject({ text: 'COLD', color: '#FFCCCC' });
    expect(r.error).toBe('');
  });
  it('exposes name, lastActivityString, blink and the seconds since activity', () => {
    const m = applyMessage(newMetric(1, { name: 'T', jsOnDisplay: 'event.name = event.name + "!"; event.lastActivityString = event.getSecondsSinceLastActivity() + " s"; event.blink = event.getSecondsSinceLastActivity() > 3' }), 'x', 100).metric;
    const r = runOnDisplay(m, buildDisplay(m, 105), 105, env());
    expect(r.display).toMatchObject({ name: 'T!', bottom: '5 s', blink: true });
  });
  it('switch: event.on and iconColor', () => {
    const m = applyMessage(newMetric(2, { jsOnDisplay: "event.iconColor = event.on ? '#ffcccc' : '#ffffff'" }), '1', 1).metric;
    expect(runOnDisplay(m, buildDisplay(m, 1), 1, env()).display).toMatchObject({ color: '#FFCCCC', on: true });
  });
  it('range: progress and progressColor', () => {
    const m = applyMessage(newMetric(3, { jsOnDisplay: "event.progress = 75; event.progressColor = '#00ff00'; event.text = 'big'" }), '10', 1).metric;
    expect(runOnDisplay(m, buildDisplay(m, 1), 1, env()).display).toMatchObject({ progress: 75, color: '#00FF00', text: 'big' });
  });
  it('image url and color tile color', () => {
    const img = newMetric(5, { kind: 1, imageUrl: 'http://a', jsOnDisplay: "event.url = 'http://b'" });
    expect(runOnDisplay(img, buildDisplay(img, 1), 1, env()).display.url).toBe('http://b');
    const col = applyMessage(newMetric(6, { jsOnDisplay: "event.color = '#00ff00'" }), '#ff0000', 1).metric;
    expect(runOnDisplay(col, buildDisplay(col, 1), 1, env()).display.color).toBe('#00FF00');
  });
  it('an invalid color string becomes an error message, like the original', () => {
    const m = newMetric(1, { jsOnDisplay: "event.textColor = 'not-a-color'" });
    expect(runOnDisplay(m, buildDisplay(m, 1), 1, env()).display.error).toBe('Invalid color format');
  });
  it('a throwing script shows its error on the tile', () => {
    const m = newMetric(1, { jsOnDisplay: 'throw new Error("bad")' });
    expect(runOnDisplay(m, buildDisplay(m, 1), 1, env()).display.error).toBe('Error: bad');
  });
  it('does nothing without a script', () => {
    const m = newMetric(1, {});
    const d = buildDisplay(m, 1);
    expect(runOnDisplay(m, d, 1, env())).toEqual({ display: d, error: '' });
  });
});

describe('runOnTap', () => {
  it('reports preventDefault', () => {
    const m = newMetric(2, { jsOnTap: 'event.preventDefault = true' });
    expect(runOnTap(m, env())).toEqual({ preventDefault: true, error: '' });
    expect(runOnTap(newMetric(2, { jsOnTap: '1' }), env())).toEqual({ preventDefault: false, error: '' });
  });
  it('can publish and open links', () => {
    const e = env();
    runOnTap(newMetric(2, { jsOnTap: "app.publish('a','b',true,0); app.openUri('http://x')" }), e);
    expect(e.published).toEqual([['a', 'b', true, 0]]);
    expect(e.opened).toEqual(['http://x']);
  });
  it('reports script errors and still allows the default action', () => {
    const r = runOnTap(newMetric(2, { jsOnTap: 'zzz()' }), env());
    expect(r.error).toContain('ReferenceError');
    expect(r.preventDefault).toBe(false);
  });
});
