import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { formatFixed, parseJavaFloat, rangeValue } from '../../domain/metrics';
import type { ColorMetric, RangeMetric } from '../../domain/types';
import { hexToHsv, hsvToHex, joystickPayload, joystickPosition, opt, stepValue } from '../../domain/widgetLogic';
import { Icon } from '../icons/Icon';
import { type } from '../skin';
import { fitFont } from './geometry';
import type { BodyProps } from './types';

const center = { flex: 1, alignItems: 'center', justifyContent: 'center' } as const;
const widgetColor = (p: BodyProps) => (p.display.color === '#FFFFFF' ? p.skin.brand : p.display.color);

/** Drag on a track: tracks a live value (snapped to `step` when > 0) and publishes it on release. */
function useTrackDrag(m: RangeMetric, vertical: boolean, step: number, onSet: (payload: string) => void) {
  const [drag, setDrag] = useState<number | null>(null);
  const size = useRef(1);
  const live = useRef({ m, onSet, drag, step, vertical });
  live.current = { m, onSet, drag, step, vertical };
  const toValue = (x: number, y: number) => {
    const c = live.current;
    const pos = c.vertical ? 1 - y / size.current : x / size.current;
    let v = c.m.minValue + Math.min(Math.max(pos, 0), 1) * (c.m.maxValue - c.m.minValue);
    if (c.step > 0) v = Math.min(c.m.minValue + Math.round((v - c.m.minValue) / c.step) * c.step, c.m.maxValue);
    return v;
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => setDrag(toValue(e.nativeEvent.locationX, e.nativeEvent.locationY)),
        onPanResponderMove: (e) => setDrag(toValue(e.nativeEvent.locationX, e.nativeEvent.locationY)),
        onPanResponderRelease: () => {
          const v = live.current.drag;
          setDrag(null);
          if (v !== null) live.current.onSet(formatFixed(v, live.current.m.decimalPrecision));
        },
        onPanResponderTerminate: () => setDrag(null),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const onLayout = (e: LayoutChangeEvent) => {
    size.current = Math.max(vertical ? e.nativeEvent.layout.height : e.nativeEvent.layout.width, 1);
  };
  return { drag, onLayout, handlers: responder.panHandlers };
}

const ratioOf = (v: number, m: RangeMetric) => (m.maxValue > m.minValue ? Math.min(Math.max((v - m.minValue) / (m.maxValue - m.minValue), 0), 1) : 0);

export function VerticalSliderBody(p: BodyProps & { step?: number }) {
  const m = p.metric as RangeMetric;
  const t = useTrackDrag(m, true, p.step ?? 0, p.onSet);
  const ratio = ratioOf(t.drag ?? rangeValue(m), m);
  const color = widgetColor(p);
  return (
    <View style={s.vRow}>
      <View style={s.vHit} onLayout={t.onLayout} {...(p.interactive ? t.handlers : {})}>
        <View pointerEvents="none" style={[s.vTrack, { backgroundColor: p.skin.stroke3 }]}>
          <View style={{ position: 'absolute', bottom: 0, width: 4, height: `${ratio * 100}%`, borderRadius: 4, backgroundColor: color }} />
        </View>
        <View pointerEvents="none" style={[s.thumb, { left: 12, marginLeft: 0, bottom: `${ratio * 100}%`, marginBottom: -10, borderColor: p.skin.stroke4, backgroundColor: p.skin.white }]} />
      </View>
    </View>
  );
}

/** Slider with -/+ buttons that move by `step` (snapping while dragging). */
export function StepSliderBody(p: BodyProps) {
  const m = p.metric as RangeMetric;
  const step = Math.max(opt(m.opts, 'step', 1), 0.000001);
  const t = useTrackDrag(m, false, step, p.onSet);
  const value = t.drag ?? rangeValue(m);
  const ratio = ratioOf(value, m);
  const color = widgetColor(p);
  const nudge = (dir: 1 | -1) => p.onSet(formatFixed(stepValue(rangeValue(m), dir, step, m.minValue, m.maxValue, false), m.decimalPrecision));
  return (
    <View style={s.row}>
      <Pressable disabled={!p.interactive} onPress={() => nudge(-1)} style={s.stepBtn}>
        <Icon name="glyph:minus" size={16} color={p.skin.text9} />
      </Pressable>
      <View style={s.hHit} onLayout={t.onLayout} {...(p.interactive ? t.handlers : {})}>
        <View pointerEvents="none" style={[s.hTrack, { backgroundColor: p.skin.stroke3 }]}>
          <View style={{ width: `${ratio * 100}%`, height: 4, borderRadius: 4, backgroundColor: color }} />
        </View>
        <View pointerEvents="none" style={[s.thumb, { left: `${ratio * 100}%`, borderColor: p.skin.stroke4, backgroundColor: p.skin.white }]} />
      </View>
      <Pressable disabled={!p.interactive} onPress={() => nudge(1)} style={s.stepBtn}>
        <Icon name="glyph:plus" size={16} color={p.skin.text9} />
      </Pressable>
    </View>
  );
}

/** Step H / Step V: two buttons that publish current value -/+ step. */
export function StepButtonsBody(p: BodyProps & { vertical: boolean }) {
  const m = p.metric as RangeMetric;
  const step = opt(m.opts, 'step', 1);
  const loop = opt(m.opts, 'loop', false);
  const go = (dir: 1 | -1) => p.onSet(formatFixed(stepValue(rangeValue(m), dir, step, m.minValue, m.maxValue, loop), m.decimalPrecision));
  const btn = (dir: 1 | -1) => (
    <Pressable key={dir} disabled={!p.interactive} onPress={() => go(dir)} style={({ pressed }) => [s.flowBtn, pressed ? { backgroundColor: p.skin.divider2 } : null]}>
      <Icon name={dir === 1 ? 'glyph:plus' : 'glyph:minus'} size={20} color={p.skin.text9} />
    </Pressable>
  );
  const div = <View key="d" style={p.vertical ? { height: 1, marginVertical: 4, backgroundColor: p.skin.stroke4 } : { width: 1, marginHorizontal: 4, backgroundColor: p.skin.stroke4 }} />;
  return <View style={{ flex: 1, flexDirection: p.vertical ? 'column' : 'row' }}>{p.vertical ? [btn(1), div, btn(-1)] : [btn(-1), div, btn(1)]}</View>;
}

/** Vertical bar of segments; tap or drag to set the level, published on release. */
export function LevelSliderBody(p: BodyProps) {
  const m = p.metric as RangeMetric;
  const segments = Math.max(Math.round(opt(m.opts, 'segments', 10)), 2);
  const t = useTrackDrag(m, true, 0, p.onSet);
  const ratio = ratioOf(t.drag ?? rangeValue(m), m);
  const color = widgetColor(p);
  const lit = Math.round(ratio * segments);
  return (
    <View style={s.lsWrap} onLayout={t.onLayout} {...(p.interactive ? t.handlers : {})}>
      {Array.from({ length: segments }, (_v, i) => (
        <View key={i} pointerEvents="none" style={[s.segment, { backgroundColor: segments - i <= lit ? color : p.skin.stroke3 }]} />
      ))}
    </View>
  );
}

/** Round field with a draggable handle; publishes "x,y" (throttled while moving) and re-centers on release. */
export function JoystickBody(p: BodyProps) {
  const min = opt(p.metric.opts, 'min', 0);
  const max = opt(p.metric.opts, 'max', 255);
  const auto = opt(p.metric.opts, 'autoreturn', true);
  const size = Math.max(Math.min(p.inner.w, p.inner.h) - 8, 40);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const live = useRef({ size, min, max, auto, onSet: p.onSet, last: 0 });
  live.current = { size, min, max, auto, onSet: p.onSet, last: live.current.last };
  const at = (lx: number, ly: number) => {
    const half = live.current.size / 2;
    let x = (lx - half) / half;
    let y = -(ly - half) / half;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  };
  const send = (v: { x: number; y: number }, force: boolean) => {
    const now = Date.now();
    if (!force && now - live.current.last < 100) return;
    live.current.last = now;
    live.current.onSet(joystickPayload(v.x, v.y, live.current.min, live.current.max));
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const v = at(e.nativeEvent.locationX, e.nativeEvent.locationY);
          setPos(v);
          send(v, true);
        },
        onPanResponderMove: (e) => {
          const v = at(e.nativeEvent.locationX, e.nativeEvent.locationY);
          setPos(v);
          send(v, false);
        },
        onPanResponderRelease: () => {
          if (live.current.auto) {
            setPos(null);
            send({ x: 0, y: 0 }, true);
          }
        },
        onPanResponderTerminate: () => setPos(null),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const stored = joystickPosition(p.metric.lastPayload, min, max);
  const v = pos ?? stored;
  const half = size / 2;
  const handle = Math.max(size * 0.28, 24);
  return (
    <View style={center}>
      <View
        style={{ width: size, height: size, borderRadius: half, backgroundColor: p.skin.stroke3, borderWidth: 6, borderColor: p.skin.white }}
        {...(p.interactive ? responder.panHandlers : {})}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: handle,
            height: handle,
            borderRadius: handle / 2,
            left: half - 6 + v.x * (half - 6 - handle / 2) - handle / 2,
            top: half - 6 - v.y * (half - 6 - handle / 2) - handle / 2,
            backgroundColor: widgetColor(p),
            borderWidth: 4,
            borderColor: p.skin.white,
          }}
        />
      </View>
    </View>
  );
}

/** zeRGBa: a hue bar and a brightness bar; the chosen color is published on release. */
export function RgbBody(p: BodyProps) {
  const m = p.metric as ColorMetric;
  const start = hexToHsv(p.display.color);
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number } | null>(null);
  const cur = hsv ?? start;
  const bars = useRef({ w: 1, cur, onSet: p.onSet, fmt: m.format });
  bars.current = { w: bars.current.w, cur, onSet: p.onSet, fmt: m.format };
  const payload = (c: { h: number; s: number; v: number }) => {
    const hex = hsvToHex(c.h, c.s, c.v);
    return bars.current.fmt === 0 ? hex : String(parseInt(hex.slice(1), 16));
  };
  const make = (which: 'h' | 'v') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => upd(which, e.nativeEvent.locationX),
      onPanResponderMove: (e) => upd(which, e.nativeEvent.locationX),
      onPanResponderRelease: () => {
        setHsv((c) => {
          if (c) bars.current.onSet(payload(c));
          return null;
        });
      },
    });
  function upd(which: 'h' | 'v', x: number) {
    const r = Math.min(Math.max(x / bars.current.w, 0), 1);
    setHsv((c) => {
      const base = c ?? bars.current.cur;
      const next = which === 'h' ? { ...base, h: r * 360, s: base.s === 0 ? 1 : base.s } : { ...base, v: r };
      bars.current.cur = next;
      return next;
    });
  }
  const hueR = useMemo(() => make('h'), []); // eslint-disable-line react-hooks/exhaustive-deps
  const valR = useMemo(() => make('v'), []); // eslint-disable-line react-hooks/exhaustive-deps
  const swatch = hsvToHex(cur.h, cur.s, cur.v);
  const hueStops = [0, 60, 120, 180, 240, 300, 360].map((h) => hsvToHex(h, 1, 1));
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <View style={[s.swatch, { backgroundColor: swatch, borderColor: p.skin.stroke4 }]} />
      <View style={s.rgbBar} onLayout={(e) => (bars.current.w = Math.max(e.nativeEvent.layout.width, 1))} {...(p.interactive ? hueR.panHandlers : {})}>
        <View pointerEvents="none" style={{ flex: 1, flexDirection: 'row', borderRadius: 8, overflow: 'hidden' }}>
          {hueStops.slice(0, 6).map((c, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>
        <View pointerEvents="none" style={[s.marker, { left: `${(cur.h / 360) * 100}%`, backgroundColor: p.skin.white }]} />
      </View>
      <View style={s.rgbBar} {...(p.interactive ? valR.panHandlers : {})}>
        <View pointerEvents="none" style={{ flex: 1, borderRadius: 8, backgroundColor: hsvToHex(cur.h, cur.s, 1), overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${(1 - cur.v) * 100}%`, backgroundColor: 'rgba(0,0,0,0.85)' }} />
        </View>
        <View pointerEvents="none" style={[s.marker, { left: `${cur.v * 100}%`, backgroundColor: p.skin.white }]} />
      </View>
    </View>
  );
}

function InputShell({ p, children }: { p: BodyProps; children: React.ReactNode }) {
  return <View style={[center, { alignItems: 'stretch' }]}>{children}</View>;
}

/** Text Input: sends on the keyboard's send key. */
export function TextInputBody(p: BodyProps) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? p.metric.lastPayload ?? '';
  return (
    <InputShell p={p}>
      <TextInput
        editable={p.interactive}
        value={shown}
        onChangeText={setText}
        placeholder={opt(p.metric.opts, 'hint', 'Input value here')}
        placeholderTextColor={p.skin.text6}
        returnKeyType="send"
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={() => {
          p.onSet(shown);
          setText(null);
        }}
        style={[type.body1, s.input, { color: p.skin.text9, backgroundColor: p.skin.divider2, borderColor: p.skin.stroke3 }]}
      />
    </InputShell>
  );
}

/** Numeric Input: a number field with -/+ buttons. */
export function NumericInputBody(p: BodyProps) {
  const step = opt(p.metric.opts, 'step', 1);
  const min = opt(p.metric.opts, 'min', -1000000);
  const max = opt(p.metric.opts, 'max', 1000000);
  const loop = opt(p.metric.opts, 'loop', false);
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? p.metric.lastPayload ?? '';
  const num = parseJavaFloat(shown) ?? 0;
  const send = (n: number) => {
    setText(null);
    p.onSet(String(Math.min(Math.max(n, min), max)));
  };
  return (
    <View style={[s.row, { alignItems: 'center' }]}>
      <Pressable disabled={!p.interactive} onPress={() => send(stepValue(num, -1, step, min, max, loop))} style={s.stepBtn}>
        <Icon name="glyph:minus" size={16} color={p.skin.text9} />
      </Pressable>
      <TextInput
        editable={p.interactive}
        value={shown}
        keyboardType="numeric"
        onChangeText={setText}
        returnKeyType="send"
        onSubmitEditing={() => {
          const n = parseJavaFloat(shown);
          if (n !== null && !Number.isNaN(n)) send(n);
        }}
        style={[type.body1, s.input, { flex: 1, textAlign: 'center', color: p.skin.text9, backgroundColor: p.skin.divider2, borderColor: p.skin.stroke3 }]}
      />
      <Pressable disabled={!p.interactive} onPress={() => send(stepValue(num, 1, step, min, max, loop))} style={s.stepBtn}>
        <Icon name="glyph:plus" size={16} color={p.skin.text9} />
      </Pressable>
    </View>
  );
}

/** Time Input: hour and minute steppers publishing "HH:MM". */
export function TimeInputBody(p: BodyProps) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(p.metric.lastPayload ?? '');
  const h = m ? Math.min(Number(m[1]), 23) : 0;
  const mi = m ? Math.min(Number(m[2]), 59) : 0;
  const send = (hh: number, mm: number) => p.onSet(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  const col = (label: string, up: () => void, down: () => void, value: number) => (
    <View style={{ alignItems: 'center', marginHorizontal: 8 }}>
      <Pressable disabled={!p.interactive} onPress={up}>
        <Icon name="glyph:chevron_up" size={16} color={p.skin.text8} />
      </Pressable>
      <Text style={[type.numberMedium, { color: p.skin.text9, fontSize: fitFont(p.inner.h, 28), lineHeight: fitFont(p.inner.h, 28) * 1.3 }]}>{String(value).padStart(2, '0')}</Text>
      <Pressable disabled={!p.interactive} onPress={down}>
        <Icon name="glyph:chevron_down" size={16} color={p.skin.text8} />
      </Pressable>
      <Text style={[type.body3, { color: p.skin.text7 }]}>{label}</Text>
    </View>
  );
  return (
    <View style={[center, { flexDirection: 'row' }]}>
      {col('h', () => send((h + 1) % 24, mi), () => send((h + 23) % 24, mi), h)}
      <Text style={[type.numberMedium, { color: p.skin.text9 }]}>:</Text>
      {col('m', () => send(h, (mi + 1) % 60), () => send(h, (mi + 59) % 60), mi)}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  hHit: { flex: 1, height: 44, justifyContent: 'center', marginHorizontal: 8 },
  hTrack: { height: 4, borderRadius: 4 },
  vRow: { flex: 1, alignItems: 'center' },
  vHit: { flex: 1, width: 44, alignItems: 'center', marginVertical: 14 },
  vTrack: { flex: 1, width: 4, borderRadius: 4 },
  thumb: { position: 'absolute', width: 20, height: 20, marginLeft: -10, borderRadius: 10, borderWidth: 4, elevation: 4 },
  flowBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  lsWrap: { flex: 1, paddingVertical: 4 },
  segment: { flex: 1, marginVertical: 1, borderRadius: 3 },
  swatch: { height: 24, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  rgbBar: { height: 32, justifyContent: 'center', marginVertical: 6 },
  marker: { position: 'absolute', width: 8, height: 32, marginLeft: -4, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.4)' },
  input: { minHeight: 40, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
});
