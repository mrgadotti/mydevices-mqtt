import React, { useMemo, useState } from 'react';
import { Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { argbFromHex, hexRgb } from '../domain/android';
import { formatFixed } from '../domain/metrics';
import type { MultiSwitchMetric, RangeMetric } from '../domain/types';
import { ringPercent } from './ringAngle';
import { S, U } from '../i18n';
import { useColors } from './colors';
import { RangeRing } from './tiles/RangeRing';
import { PALETTE_RAMPS, PALETTE_RAMP_ORDER, recentColors, rememberColor } from './paletteColors';
import { Dialog, Field, FlatButton, Label, Radio } from './widgets';

/** Rows of a plain list dialog ("Choose type", tile and broker menus). */
export function ListDialog({ title, items, onClose }: { title?: string; items: { title: string; run: () => void }[]; onClose: () => void }) {
  const c = useColors();
  return (
    <Dialog title={title} onClose={onClose} list>
      {items.map((it) => (
        <Pressable
          key={it.title}
          style={s.listItem}
          android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
          onPress={() => {
            onClose();
            it.run();
          }}
        >
          <Text style={[s.listText, { color: c.textPrimary }]}>{it.title}</Text>
        </Pressable>
      ))}
    </Dialog>
  );
}

export function ConfirmDialog({ message, onYes, onClose }: { message: string; onYes: () => void; onClose: () => void }) {
  return <Dialog message={message} onClose={onClose} buttons={[{ title: U.no }, { title: U.yes, onPress: onYes }]} />;
}

export function AlertMessage({ message, onClose }: { message: string; onClose: () => void }) {
  return <Dialog title={S.alert} message={message} onClose={onClose} buttons={[{ title: S.ok }]} />;
}

/** text_metric_popup: a text field and a Set button. */
export function SetValueDialog({ onSet, onClose }: { onSet: (value: string) => void; onClose: () => void }) {
  const [value, setValue] = useState('');
  return (
    <Dialog title={S.set_new_value} onClose={onClose}>
      <Field value={value} onChangeText={setValue} center autoFocus />
      <View style={s.centerRow}>
        <FlatButton
          title={S.set}
          onPress={() => {
            onClose();
            onSet(value);
          }}
        />
      </View>
    </Dialog>
  );
}

/** range_metric_popup: a numeric field and an interactive ring (the original's SeekArc, 170 dp). */
export function RangeDialog({ metric, initial, onSet, onClose, toast }: { metric: RangeMetric; initial: number; onSet: (payload: string) => void; onClose: () => void; toast: (m: string) => void }) {
  const min = metric.minValue;
  const max = metric.maxValue;
  const span = max - min;
  const [percent, setPercent] = useState(0);
  const [text, setText] = useState(formatFixed(metric.displayPayloadValue ? initial : 0, metric.decimalPrecision));
  const size = 170;

  const setFromTouch = (px: number, py: number) => {
    const p = ringPercent(px, py, size);
    setPercent(p);
    const value = min + p * (span / 100);
    setText(formatFixed(metric.displayPayloadValue ? value : p, metric.decimalPrecision));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setFromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderMove: (e) => setFromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const set = () => {
    if (text.length === 0) {
      toast(S.empty_value_not_allowed);
      return;
    }
    const v = parseFloat(text);
    if (metric.displayPayloadValue) {
      if (!(v >= min && v <= max)) {
        const f = (n: number) => formatFixed(n, metric.decimalPrecision);
        toast(`${S.value_out_of_range} [${f(min)}..${f(max)}]`);
        return;
      }
      onClose();
      onSet(formatFixed(v, metric.decimalPrecision));
    } else {
      if (!(v >= 0 && v <= 100)) {
        toast(S.percentage_range_error_text);
        return;
      }
      onClose();
      onSet(formatFixed(v * (span / 100) + min, metric.decimalPrecision));
    }
  };

  return (
    <Dialog title={S.set_new_value} onClose={onClose}>
      <Field value={text} onChangeText={setText} keyboardType="numbers-and-punctuation" center width={150} />
      <View {...responder.panHandlers} style={{ width: size, height: size, alignSelf: 'center', marginVertical: 8 }}>
        <View pointerEvents="none">
          <RangeRing size={size} stroke={15} progress={percent} color={hexRgb(metric.progressColor)} />
        </View>
      </View>
      <View style={s.centerRow}>
        <FlatButton title={S.set} onPress={set} />
      </View>
    </Dialog>
  );
}

/** "Set option": single choice list with the current item selected; choosing publishes immediately. */
export function MultiDialog({ metric, current, onPick, onClose }: { metric: MultiSwitchMetric; current: string | null; onPick: (payload: string) => void; onClose: () => void }) {
  const selected = current === null ? -1 : metric.items.findIndex((i) => i.payload === current);
  return (
    <Dialog title={S.set_option} onClose={onClose}>
      <ScrollView style={{ maxHeight: 360 }}>
        {metric.items.map((it, i) => (
          <Radio
            key={`${it.payload}-${i}`}
            selected={i === selected}
            onPress={() => {
              onClose();
              onPick(it.payload);
            }}
          >
            {it.label}
          </Radio>
        ))}
      </ScrollView>
    </Dialog>
  );
}

/** image_metric_popup: the picture full screen, any tap closes it. */
export function ImagePopup({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.imagePopup} onPress={onClose}>
        {uri ? <Image source={{ uri }} resizeMode="contain" style={StyleSheet.absoluteFill} /> : null}
      </Pressable>
    </Modal>
  );
}

/* ---------- AmbilWarna HSV picker (240 dp square + 30 dp hue bar), used by the Color tile ---------- */

function hsvToRgb(h: number, sat: number, v: number): [number, number, number] {
  const c = v * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const d = max - Math.min(rn, gn, bn);
  const h = d === 0 ? 0 : max === rn ? 60 * (((gn - bn) / d + 6) % 6) : max === gn ? 60 * ((bn - rn) / d + 2) : 60 * ((rn - gn) / d + 4);
  return [h, max === 0 ? 0 : d / max, max];
}

const hexOf = (rgb: [number, number, number]): string => `#${rgb.map((n) => n.toString(16).padStart(2, '0')).join('')}`;

export function HsvColorDialog({ initial, onOk, onClose }: { initial: number; onOk: (argb: number) => void; onClose: () => void }) {
  const c = useColors();
  const [h0, s0, v0] = rgbToHsv((initial >> 16) & 255, (initial >> 8) & 255, initial & 255);
  const [hsv, setHsv] = useState<[number, number, number]>([h0, s0, v0]);
  const SIZE = 240;
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const square = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setHsv((c) => [c[0], clamp(e.nativeEvent.locationX / SIZE), clamp(1 - e.nativeEvent.locationY / SIZE)]),
        onPanResponderMove: (e) => setHsv((c) => [c[0], clamp(e.nativeEvent.locationX / SIZE), clamp(1 - e.nativeEvent.locationY / SIZE)]),
      }),
    [],
  );
  const hue = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setHsv((c) => [clamp(e.nativeEvent.locationY / SIZE) * 359.99, c[1], c[2]]),
        onPanResponderMove: (e) => setHsv((c) => [clamp(e.nativeEvent.locationY / SIZE) * 359.99, c[1], c[2]]),
      }),
    [],
  );
  const rgb = hsvToRgb(hsv[0], hsv[1], hsv[2]);
  const newHex = hexOf(rgb);
  const pure = hexOf(hsvToRgb(hsv[0], 1, 1));
  return (
    <Dialog onClose={onClose}>
      <View style={{ flexDirection: 'row', alignSelf: 'center' }}>
        <View {...square.panHandlers} style={{ width: SIZE, height: SIZE }}>
          <Svg width={SIZE} height={SIZE} pointerEvents="none">
            <Defs>
              <LinearGradient id="sat" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#ffffff" />
                <Stop offset="1" stopColor={pure} />
              </LinearGradient>
              <LinearGradient id="val" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                <Stop offset="1" stopColor="#000000" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width={SIZE} height={SIZE} fill="url(#sat)" />
            <Rect width={SIZE} height={SIZE} fill="url(#val)" />
          </Svg>
          <View pointerEvents="none" style={[s.target, { left: hsv[1] * SIZE - 7, top: (1 - hsv[2]) * SIZE - 7 }]} />
        </View>
        <View {...hue.panHandlers} style={{ width: 30, height: SIZE, marginLeft: 8 }}>
          <Svg width={30} height={SIZE} pointerEvents="none">
            <Defs>
              <LinearGradient id="hue" x1="0" y1="0" x2="0" y2="1">
                {[0, 60, 120, 180, 240, 300, 360].map((d) => (
                  <Stop key={d} offset={d / 360} stopColor={hexOf(hsvToRgb(d % 360, 1, 1))} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect width={30} height={SIZE} fill="url(#hue)" />
          </Svg>
          <View pointerEvents="none" style={[s.hueCursor, { top: (hsv[0] / 360) * SIZE - 2 }]} />
        </View>
      </View>
      <View style={s.previewRow}>
        <View style={[s.preview, { backgroundColor: hexOf([(initial >> 16) & 255, (initial >> 8) & 255, initial & 255]) }]} />
        <Text style={[s.arrow, { color: c.textSecondary }]}>▶</Text>
        <View style={[s.preview, { backgroundColor: newHex }]} />
      </View>
      <View style={s.buttons}>
        <FlatButton title={U.cancel} onPress={onClose} />
        <FlatButton
          title={S.ok}
          onPress={() => {
            onClose();
            onOk(argbFromHex(newHex));
          }}
        />
      </View>
    </Dialog>
  );
}

/* ---------- Spectrum palette picker (the original's R.array.metric_colors), used by tile forms ---------- */

export const METRIC_COLORS = [
  '#ffffff', '#c0c0c0', '#808080', '#606060', '#ffffc0', '#ffff80', '#ffff40', '#ffc000', '#c0ffc0',
  '#c0ff80', '#c0ff40', '#40ff00', '#408000', '#c0ffff', '#80ffff', '#00c0ff', '#0080ff', '#0040c0',
  '#ffc0ff', '#ff80ff', '#ff40ff', '#ff00c0', '#800080', '#ff4040', '#ff0040', '#ff0000', '#c00040',
];

export function SpectrumDialog({ selected, onOk, onClose }: { selected: number; onOk: (argb: number) => void; onClose: () => void }) {
  const [pick, setPick] = useState(hexRgb(selected).toLowerCase());
  const [hex, setHex] = useState(pick);
  const choose = (c: string) => {
    setPick(c);
    setHex(c);
  };
  const dot = (c: string, i: number) => <Pressable key={`${c}${i}`} onPress={() => choose(c)} style={[s.dot, { backgroundColor: c }, pick === c ? s.swatchOn : null]} />;
  return (
    <Dialog title={S.default_dialog_title} onClose={onClose}>
      {recentColors().length > 0 ? (
        <>
          <Label>{U.last_selected_colors}</Label>
          <View style={s.dots}>{recentColors().map(dot)}</View>
        </>
      ) : null}
      {PALETTE_RAMP_ORDER.map((r) => (
        <View key={r} style={s.dots}>
          {PALETTE_RAMPS[r].map(dot)}
        </View>
      ))}
      <Label top={8}>{U.classic_palette}</Label>
      <View style={s.grid}>
        {METRIC_COLORS.map((c) => (
          <Pressable key={c} onPress={() => choose(c)} style={[s.swatch, { backgroundColor: c }, pick === c ? s.swatchOn : null]} />
        ))}
      </View>
      <Label top={8}>{U.hex}</Label>
      <Field
        value={hex}
        maxLength={7}
        onChangeText={(t) => {
          setHex(t);
          if (/^#[0-9a-fA-F]{6}$/.test(t)) setPick(t.toLowerCase());
        }}
      />
      <View style={s.buttons}>
        <FlatButton title={U.cancel} onPress={onClose} />
        <FlatButton
          title={S.select}
          onPress={() => {
            onClose();
            rememberColor(pick);
            onOk(argbFromHex(pick));
          }}
        />
      </View>
    </Dialog>
  );
}

const s = StyleSheet.create({
  listItem: { height: 48, paddingHorizontal: 24, justifyContent: 'center' },
  listText: { fontSize: 16 },
  centerRow: { alignItems: 'center', marginTop: 8 },
  imagePopup: { flex: 1, backgroundColor: '#000' },
  target: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  hueCursor: { position: 'absolute', left: -3, right: -3, height: 4, borderWidth: 1, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.4)' },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  preview: { width: 60, height: 30 },
  arrow: { paddingHorizontal: 8 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  swatch: { width: 44, height: 44, margin: 4, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginVertical: 2 },
  dot: { width: 24, height: 24, marginHorizontal: 1, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  swatchOn: { borderWidth: 3, borderColor: '#fff' },
});
