import { hexRgb } from './android';
import { colorDisplay, isSwitchOn, multiLabel, rangeLabel, rangeProgress, relativeTimeSpan, textDisplay } from './metrics';
import type { Metric } from './types';

export interface TileDisplay {
  kind: 'text' | 'switch' | 'range' | 'multi' | 'image' | 'color' | 'notification';
  name: string;
  /** Relative time of the last activity (empty before any). */
  bottom: string;
  blink: boolean;
  /** Text shown by text, range and multi-choice tiles. */
  text: string;
  /** Opaque "#RRGGBB" of the main color (text, icon tint or progress). */
  color: string;
  icon: string;
  on: boolean;
  /** Range percentage 0..100. */
  progress: number;
  url: string;
  /** Message shown over the tile (the original's logTextView). */
  error: string;
}

/** The per-type display values MetricsAdapter.onBindViewHolder computes before scripts run. */
export function buildDisplay(m: Metric, nowSec: number): TileDisplay {
  const d: TileDisplay = {
    kind: 'text',
    name: m.name,
    bottom: relativeTimeSpan(m.lastActivity, nowSec),
    blink: false,
    text: '',
    color: '#FFFFFF',
    icon: '',
    on: false,
    progress: 0,
    url: '',
    error: '',
  };
  switch (m.type) {
    case 1:
      return { ...d, kind: 'text', text: textDisplay(m), color: hexRgb(m.textColor) };
    case 2: {
      const on = isSwitchOn(m);
      return { ...d, kind: 'switch', on, icon: on ? m.iconOn : m.iconOff, color: hexRgb(on ? m.onColor : m.offColor) };
    }
    case 3:
      return { ...d, kind: 'range', progress: rangeProgress(m), text: rangeLabel(m), color: hexRgb(m.progressColor) };
    case 4:
      return { ...d, kind: 'multi', text: multiLabel(m), color: hexRgb(m.textColor) };
    case 5:
      return { ...d, kind: 'image', url: m.imageUrl };
    case 7: {
      const got = m.lastPayload !== null;
      return { ...d, kind: 'notification', on: got, icon: got ? 'ic_bell_on' : 'ic_bell_off', color: '#C0C0C0' };
    }
    case 6: {
      const c = colorDisplay(m);
      return { ...d, kind: 'color', icon: m.icon, color: hexRgb(c.color), error: c.invalid ? 'Invalid color format' : '' };
    }
  }
}
