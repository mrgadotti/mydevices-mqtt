import { canPlace, clampSize, firstFree, GRID_COLUMNS, layoutKey, layoutWidgets, needsClock, widgetKindOf, WIDGET_ORDER, WIDGET_SPECS, type Rect } from './widgets';
import { newMetric } from './defaults';

const make = (type: 1 | 2 | 3 | 4 | 5 | 6 | 7, extra: object = {}) => ({ ...newMetric(type), ...extra }) as ReturnType<typeof newMetric>;

describe('widgetKindOf', () => {
  it('derives a kind from the metric type for legacy tiles', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((t) => widgetKindOf(make(t as 1)))).toEqual([
      'value', 'switch', 'slider', 'segmented', 'image', 'color', 'notification',
    ]);
  });
  it('uses the stored kind when it matches the metric type', () => {
    expect(widgetKindOf(make(2, { widget: 'button' }))).toBe('button');
    expect(widgetKindOf(make(2, { widget: 'gauge' }))).toBe('switch');
  });
});

describe('layoutWidgets', () => {
  it('keeps stored rectangles and first-fit places loose widgets without overlap', () => {
    const a = make(2, { gx: 0, gy: 0, gw: 12, gh: 6 });
    const b = make(1);
    const c = make(1);
    const rects = layoutWidgets([a, b, c]);
    expect(rects.get(a.id)).toEqual({ x: 0, y: 0, w: 12, h: 6 });
    const list = [...rects.values()];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i];
        const q = list[j];
        expect(p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h).toBe(false);
      }
    }
    expect(list.every((r) => r.x >= 0 && r.x + r.w <= GRID_COLUMNS)).toBe(true);
  });
  it('re-places a stored rectangle that overlaps an earlier one', () => {
    const a = make(1, { gx: 0, gy: 0, gw: 6, gh: 4 });
    const b = make(1, { gx: 3, gy: 1, gw: 6, gh: 4 });
    const r = layoutWidgets([a, b]);
    expect(r.get(b.id)).not.toEqual({ x: 3, y: 1, w: 6, h: 4 });
  });
});

describe('canPlace', () => {
  const rects = new Map([['a', { x: 0, y: 0, w: 6, h: 4 }]]);
  it('rejects overlap and out-of-bounds, ignores the widget itself', () => {
    expect(canPlace(rects, 'b', { x: 5, y: 0, w: 6, h: 4 })).toBe(false);
    expect(canPlace(rects, 'b', { x: 6, y: 0, w: 6, h: 4 })).toBe(true);
    expect(canPlace(rects, 'b', { x: 20, y: 0, w: 6, h: 4 })).toBe(false);
    expect(canPlace(rects, 'b', { x: 0, y: -1, w: 6, h: 4 })).toBe(false);
    expect(canPlace(rects, 'a', { x: 0, y: 0, w: 8, h: 4 })).toBe(true);
  });
});

describe('clampSize', () => {
  it('honors the min and max of each kind', () => {
    expect(clampSize('slider', 30, 10)).toEqual({ w: 24, h: 4 });
    expect(clampSize('slider', 2, 1)).toEqual({ w: 12, h: 4 });
    expect(clampSize('switch', 1, 20)).toEqual({ w: 4, h: 12 });
  });
  it('has a spec for every kind', () => {
    expect(WIDGET_SPECS.gauge.def).toEqual({ w: 12, h: 12 });
  });
});

/** The first implementation (scan every rectangle), kept as the reference for the occupancy-bitmap version. */
function referenceLayout(list: ReturnType<typeof make>[]): Map<string, Rect> {
  const out = new Map<string, Rect>();
  const loose: typeof list = [];
  for (const m of list) {
    const r = Number.isInteger(m.gx) && Number.isInteger(m.gy) && Number.isInteger(m.gw) && Number.isInteger(m.gh) ? { x: m.gx!, y: m.gy!, w: m.gw!, h: m.gh! } : undefined;
    if (r && canPlace(out, m.id, r)) out.set(m.id, r);
    else loose.push(m);
  }
  for (const m of loose) {
    const { w, h } = WIDGET_SPECS[widgetKindOf(m)].def;
    for (let y = 0, done = false; !done; y++) {
      for (let x = 0; x + w <= GRID_COLUMNS && !done; x++) {
        if (canPlace(out, m.id, { x, y, w, h })) {
          out.set(m.id, { x, y, w, h });
          done = true;
        }
      }
    }
  }
  return out;
}

function randomList(n: number, seed: number) {
  let s = seed;
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  return Array.from({ length: n }, () => {
    const kind = WIDGET_ORDER[Math.floor(rnd() * WIDGET_ORDER.length)];
    const spec = WIDGET_SPECS[kind];
    const stored = rnd() < 0.5;
    return make(spec.metricType, {
      widget: kind,
      ...(stored ? { gx: Math.floor(rnd() * 26) - 1, gy: Math.floor(rnd() * 40), gw: 1 + Math.floor(rnd() * 12), gh: 1 + Math.floor(rnd() * 8) } : {}),
    });
  });
}

describe('layoutWidgets (occupancy bitmap)', () => {
  it('gives exactly the layout of the reference implementation on random inputs', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const list = randomList(80, seed);
      expect([...layoutWidgets(list)]).toEqual([...referenceLayout(list)]);
    }
  });
  it('places 400 loose widgets quickly', () => {
    const list = Array.from({ length: 400 }, (_v, i) => make(1, { widget: WIDGET_ORDER[i % WIDGET_ORDER.length] === 'image' ? 'value' : 'value' }));
    const t = Date.now();
    const rects = layoutWidgets(list);
    expect(rects.size).toBe(400);
    expect(Date.now() - t).toBeLessThan(200);
  });
  it('firstFree ignores the widget itself', () => {
    const rects = new Map([['a', { x: 0, y: 0, w: 6, h: 4 }]]);
    expect(firstFree(rects, 'a', 6, 4)).toEqual({ x: 0, y: 0, w: 6, h: 4 });
    expect(firstFree(rects, 'b', 6, 4)).toEqual({ x: 6, y: 0, w: 6, h: 4 });
  });
  it('layoutKey changes only with geometry, kind and membership', () => {
    const a = make(1, { gx: 0, gy: 0, gw: 6, gh: 4 });
    expect(layoutKey([a])).toBe(layoutKey([{ ...a, lastPayload: '5', lastActivity: 9 }]));
    expect(layoutKey([a])).not.toBe(layoutKey([{ ...a, gx: 1 }]));
  });
});

describe('needsClock', () => {
  it('is false for plain widgets and true for scripts, images and pending states', () => {
    expect(needsClock(make(1))).toBe(false);
    expect(needsClock(make(1, { jsOnDisplay: 'event.text = 1' }))).toBe(true);
    expect(needsClock(make(1, { jsBlinkExpression: 'val < 1' }))).toBe(true);
    expect(needsClock(make(5))).toBe(true);
    expect(needsClock(make(2, { enteredIntermediateStateAt: 5 }))).toBe(true);
  });
});
