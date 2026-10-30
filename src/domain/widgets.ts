import type { Metric, MetricTypeId } from './types';

/**
 * Widget catalog and the 24-column widget grid. A widget kind is a presentation and interaction variant of one of the
 * stored metric types; the MQTT behavior stays in the metric logic.
 */
export const GRID_COLUMNS = 24;

export type WidgetKind =
  | 'button'
  | 'styledButton'
  | 'iconButton'
  | 'switch'
  | 'slider'
  | 'verticalSlider'
  | 'stepSlider'
  | 'verticalStepSlider'
  | 'stepH'
  | 'stepV'
  | 'levelSlider'
  | 'joystick'
  | 'rgb'
  | 'color'
  | 'value'
  | 'labeled'
  | 'gauge'
  | 'radialGauge'
  | 'enhancedGauge'
  | 'led'
  | 'lcd'
  | 'level'
  | 'levelV'
  | 'chart'
  | 'terminal'
  | 'log'
  | 'image'
  | 'icon'
  | 'segmented'
  | 'menu'
  | 'textInput'
  | 'numericInput'
  | 'timeInput'
  | 'text'
  | 'spacer'
  | 'notification';

export type WidgetGroup = 'Controllers' | 'Displays' | 'Interface' | 'Other';

export interface Size {
  w: number;
  h: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export interface WidgetSpec {
  kind: WidgetKind;
  title: string;
  group: WidgetGroup;
  metricType: MetricTypeId;
  def: Size;
  min: Size;
  max: Size;
}

const spec = (kind: WidgetKind, title: string, group: WidgetGroup, metricType: MetricTypeId, def: string, min: string, max: string): WidgetSpec => {
  const size = (t: string): Size => {
    const [w, h] = t.split('x').map(Number);
    return { w, h };
  };
  return { kind, title, group, metricType, def: size(def), min: size(min), max: size(max) };
};

/** Default / min / max cells of each widget on the 24-column grid. */
export const WIDGET_SPECS: Record<WidgetKind, WidgetSpec> = {
  button: spec('button', 'Button', 'Controllers', 2, '6x6', '3x3', '24x50'),
  styledButton: spec('styledButton', 'Styled Button', 'Controllers', 2, '12x4', '4x3', '24x50'),
  iconButton: spec('iconButton', 'Icon Button', 'Controllers', 2, '6x6', '3x3', '24x50'),
  switch: spec('switch', 'Switch', 'Controllers', 2, '4x4', '4x2', '24x12'),
  slider: spec('slider', 'Slider', 'Controllers', 3, '12x4', '12x4', '24x4'),
  verticalSlider: spec('verticalSlider', 'Vertical Slider', 'Controllers', 3, '3x12', '3x12', '6x50'),
  stepSlider: spec('stepSlider', 'Step Slider', 'Controllers', 3, '12x4', '12x4', '24x4'),
  verticalStepSlider: spec('verticalStepSlider', 'Vertical Step Slider', 'Controllers', 3, '3x12', '3x12', '6x50'),
  stepH: spec('stepH', 'Step H', 'Controllers', 3, '6x4', '6x4', '24x12'),
  stepV: spec('stepV', 'Step V', 'Controllers', 3, '3x8', '3x8', '24x16'),
  levelSlider: spec('levelSlider', 'Level Slider', 'Controllers', 3, '6x16', '6x16', '24x36'),
  joystick: spec('joystick', 'Joystick', 'Controllers', 1, '12x12', '12x12', '24x24'),
  rgb: spec('rgb', 'zeRGBa', 'Controllers', 6, '12x12', '12x12', '24x18'),
  color: spec('color', 'Color Picker', 'Controllers', 6, '6x6', '3x3', '24x18'),
  value: spec('value', 'Value Display', 'Displays', 1, '6x4', '3x2', '24x12'),
  labeled: spec('labeled', 'Labeled Value', 'Displays', 1, '6x4', '3x2', '24x12'),
  led: spec('led', 'LED', 'Displays', 2, '4x4', '2x2', '24x50'),
  gauge: spec('gauge', 'Gauge', 'Displays', 3, '12x12', '8x8', '24x50'),
  radialGauge: spec('radialGauge', 'Radial Gauge', 'Displays', 3, '8x8', '3x3', '24x50'),
  enhancedGauge: spec('enhancedGauge', 'Enhanced Gauge', 'Displays', 3, '12x12', '8x8', '24x50'),
  lcd: spec('lcd', 'LCD', 'Displays', 1, '12x4', '6x2', '24x12'),
  level: spec('level', 'Level H', 'Displays', 3, '8x4', '4x1', '24x50'),
  levelV: spec('levelV', 'Level V', 'Displays', 3, '3x8', '1x4', '24x50'),
  chart: spec('chart', 'SimpleChart', 'Displays', 3, '24x14', '12x8', '24x50'),
  terminal: spec('terminal', 'Terminal', 'Displays', 1, '24x14', '12x8', '24x50'),
  log: spec('log', 'Log', 'Displays', 1, '24x14', '12x8', '24x50'),
  image: spec('image', 'Image', 'Displays', 5, '12x12', '1x1', '24x50'),
  icon: spec('icon', 'Icon', 'Displays', 2, '4x4', '2x2', '24x50'),
  segmented: spec('segmented', 'Segmented Switch', 'Interface', 4, '12x4', '8x2', '24x6'),
  menu: spec('menu', 'Menu', 'Interface', 4, '12x4', '8x4', '24x8'),
  textInput: spec('textInput', 'Text Input', 'Interface', 1, '12x4', '8x4', '24x8'),
  numericInput: spec('numericInput', 'Numeric Input', 'Interface', 1, '12x6', '8x4', '24x8'),
  timeInput: spec('timeInput', 'Time Input', 'Interface', 1, '12x6', '8x4', '24x8'),
  text: spec('text', 'Text', 'Interface', 1, '6x4', '3x2', '24x50'),
  spacer: spec('spacer', 'Dynamic Spacer', 'Interface', 1, '24x2', '24x1', '24x24'),
  notification: spec('notification', 'Notification', 'Other', 7, '6x4', '3x2', '24x12'),
};

/** Widget Box order: Controllers, Displays, Interface, Other. */
export const WIDGET_ORDER: WidgetKind[] = [
  'button', 'styledButton', 'iconButton', 'slider', 'verticalSlider', 'stepSlider', 'verticalStepSlider', 'joystick', 'rgb', 'color', 'stepH', 'stepV', 'switch', 'levelSlider',
  'value', 'labeled', 'led', 'gauge', 'radialGauge', 'enhancedGauge', 'lcd', 'chart', 'terminal', 'log', 'level', 'levelV', 'image', 'icon',
  'menu', 'textInput', 'numericInput', 'timeInput', 'segmented', 'text', 'spacer',
  'notification',
];

const LEGACY: Record<MetricTypeId, WidgetKind> = {
  1: 'value',
  2: 'switch',
  3: 'slider',
  4: 'segmented',
  5: 'image',
  6: 'color',
  7: 'notification',
};

export function widgetKindOf(m: Metric): WidgetKind {
  const kind = m.widget as WidgetKind | undefined;
  return kind && WIDGET_SPECS[kind]?.metricType === m.type ? kind : LEGACY[m.type];
}

export function clampSize(kind: WidgetKind, w: number, h: number): Size {
  const { min, max } = WIDGET_SPECS[kind];
  return { w: Math.min(Math.max(w, min.w), max.w), h: Math.min(Math.max(h, min.h), max.h) };
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function canPlace(rects: Map<string, Rect>, id: string, r: Rect): boolean {
  if (r.x < 0 || r.y < 0 || r.w < 1 || r.h < 1 || r.x + r.w > GRID_COLUMNS) return false;
  for (const [other, o] of rects) if (other !== id && overlaps(r, o)) return false;
  return true;
}

function storedRect(m: Metric): Rect | undefined {
  const { gx, gy, gw, gh } = m;
  return [gx, gy, gw, gh].every((n) => Number.isInteger(n)) ? { x: gx as number, y: gy as number, w: gw as number, h: gh as number } : undefined;
}

/** Occupancy bitmap of the 24-column grid: placement checks cost w x h cell reads instead of a scan of every rectangle. */
class Occupancy {
  private rows: Uint8Array[] = [];

  free(r: Rect): boolean {
    if (r.x < 0 || r.y < 0 || r.w < 1 || r.h < 1 || r.x + r.w > GRID_COLUMNS) return false;
    for (let y = r.y; y < r.y + r.h; y++) {
      const row = this.rows[y];
      if (!row) continue;
      for (let x = r.x; x < r.x + r.w; x++) if (row[x]) return false;
    }
    return true;
  }

  mark(r: Rect): void {
    for (let y = r.y; y < r.y + r.h; y++) {
      const row = (this.rows[y] ??= new Uint8Array(GRID_COLUMNS));
      row.fill(1, r.x, r.x + r.w);
    }
  }

  /** First free spot for a w x h widget, scanning row by row from the top-left. */
  firstFree(w: number, h: number): Rect {
    for (let y = 0; ; y++) {
      for (let x = 0; x + w <= GRID_COLUMNS; x++) {
        const r = { x, y, w, h };
        if (this.free(r)) return r;
      }
    }
  }
}

/**
 * Rectangle of every widget. Stored rectangles are kept (first come first served when they overlap or leave the grid);
 * the others are placed at their default size in the first free spot, row by row.
 */
export function layoutWidgets(list: Metric[]): Map<string, Rect> {
  const out = new Map<string, Rect>();
  const occ = new Occupancy();
  const loose: Metric[] = [];
  for (const m of list) {
    const r = storedRect(m);
    if (r && occ.free(r)) {
      out.set(m.id, r);
      occ.mark(r);
    } else loose.push(m);
  }
  for (const m of loose) {
    const { w, h } = WIDGET_SPECS[widgetKindOf(m)].def;
    const r = occ.firstFree(w, h);
    out.set(m.id, r);
    occ.mark(r);
  }
  return out;
}

/** Identity of everything `layoutWidgets` depends on: equal keys give equal layouts, so message updates can skip it. */
export function layoutKey(list: Metric[]): string {
  let k = '';
  for (const m of list) k += `${m.id}|${m.type}|${m.widget ?? ''}|${m.gx ?? ''}|${m.gy ?? ''}|${m.gw ?? ''}|${m.gh ?? ''};`;
  return k;
}

export function firstFree(rects: Map<string, Rect>, id: string, w: number, h: number): Rect {
  const occ = new Occupancy();
  for (const [other, o] of rects) if (other !== id) occ.mark(o);
  return occ.firstFree(w, h);
}

/**
 * Whether a widget's output depends on the current time: scripts and blink expressions read `secs`, image tiles reload
 * on an interval and a pending (intermediate) state times out. Every other widget can ignore the 1 s clock.
 */
export function needsClock(m: Metric): boolean {
  return m.jsOnDisplay.trim().length > 0 || m.jsBlinkExpression.trim().length > 0 || m.type === 5 || m.enteredIntermediateStateAt !== 0;
}
