import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { RangeMetric } from '../../domain/types';
import { chartPath, opt } from '../../domain/widgetLogic';
import { Icon } from '../icons/Icon';
import { type } from '../skin';
import { arcPath, fitFont } from './geometry';
import type { BodyProps } from './types';
import { useLog, useSeries } from './useHistory';
import { U } from '../../i18n';

const center = { flex: 1, alignItems: 'center', justifyContent: 'center' } as const;
const widgetColor = (p: BodyProps) => (p.display.color === '#FFFFFF' ? p.skin.brand : p.display.color);

/** Full circle ring with the value in the middle. */
export function RadialGaugeBody(p: BodyProps) {
  const size = Math.max(Math.min(p.inner.w, p.inner.h), 24);
  const stroke = Math.max(size * 0.12, 4);
  const r = (size - stroke) / 2;
  const pct = Math.min(Math.max(p.display.progress, 0), 100);
  const showLabel = opt(p.metric.opts, 'showLabel', true);
  return (
    <View style={center}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.skin.stroke3} strokeWidth={stroke} fill="none" />
        {pct > 0 ? <Path d={arcPath(size / 2, size / 2, r, -90, -90 + (359.9 * pct) / 100)} stroke={widgetColor(p)} strokeWidth={stroke} fill="none" strokeLinecap="round" /> : null}
      </Svg>
      {showLabel ? (
        <Text numberOfLines={1} style={[type.number, { position: 'absolute', color: p.skin.text9, fontSize: Math.max(size * 0.2, 12), lineHeight: Math.max(size * 0.2, 12) * 1.3 }]}>
          {p.display.text}
        </Text>
      ) : null}
    </View>
  );
}

/** 270 degree gauge with tick marks and min / max labels. */
export function EnhancedGaugeBody(p: BodyProps) {
  const m = p.metric as RangeMetric;
  const size = Math.max(Math.min(p.inner.w, p.inner.h), 40);
  const stroke = Math.max(size * 0.08, 4);
  const r = (size - stroke) / 2 - size * 0.06;
  const c = size / 2;
  const pct = Math.min(Math.max(p.display.progress, 0), 100);
  const ticks = Array.from({ length: 11 }, (_v, i) => {
    const a = ((135 + 27 * i) * Math.PI) / 180;
    const r1 = r + stroke / 2 + 2;
    const r2 = r1 + size * 0.04;
    return { x1: c + r1 * Math.cos(a), y1: c + r1 * Math.sin(a), x2: c + r2 * Math.cos(a), y2: c + r2 * Math.sin(a), i };
  });
  return (
    <View style={center}>
      <Svg width={size} height={size}>
        {ticks.map((t) => (
          <Line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={p.skin.text6} strokeWidth={1} />
        ))}
        <Path d={arcPath(c, c, r, 135, 405)} stroke={p.skin.stroke3} strokeWidth={stroke} fill="none" />
        {pct > 0 ? <Path d={arcPath(c, c, r, 135, 135 + (270 * pct) / 100)} stroke={widgetColor(p)} strokeWidth={stroke} fill="none" /> : null}
      </Svg>
      <Text numberOfLines={1} style={[type.number, { position: 'absolute', color: p.skin.text9, fontSize: Math.max(size * 0.2, 12), lineHeight: Math.max(size * 0.2, 12) * 1.3 }]}>
        {p.display.text}
      </Text>
      <View style={{ position: 'absolute', bottom: 0, left: 4, right: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[type.body3, { color: p.skin.text7 }]}>{m.minValue}</Text>
        <Text style={[type.body3, { color: p.skin.text7 }]}>{m.maxValue}</Text>
      </View>
    </View>
  );
}

/** Seven-segment style readout on an LCD-green panel. */
export function LcdBody(p: BodyProps) {
  const size = fitFont(p.inner.h, 40, 14);
  return (
    <View style={[center, { backgroundColor: '#B4C7A0', borderRadius: 4 }]}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: 'monospace', fontSize: size, color: '#1F2A17' }}>
        {p.display.text.length > 0 ? p.display.text : '--'}
      </Text>
    </View>
  );
}

export function LevelVBody(p: BodyProps) {
  return (
    <View style={[center, { flexDirection: 'row' }]}>
      <View style={{ width: '60%', height: '100%', borderRadius: 4, overflow: 'hidden', backgroundColor: p.skin.stroke3, justifyContent: 'flex-end' }}>
        <View style={{ width: '100%', height: `${Math.min(Math.max(p.display.progress, 0), 100)}%`, backgroundColor: widgetColor(p) }} />
      </View>
    </View>
  );
}

/** Line chart of the payloads received while the dashboard is open. */
export function ChartBody(p: BodyProps) {
  const data = useSeries(p.metric);
  const w = Math.max(p.inner.w - 8, 20);
  const h = Math.max(p.inner.h - 24, 20);
  const line = opt(p.metric.opts, 'line', 2);
  const d = chartPath(data, w, h);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[type.body3, { color: p.skin.text7 }]}>{data.length > 0 ? `min ${Math.min(...data)}  max ${Math.max(...data)}` : 'No data yet'}</Text>
        <Text style={[type.number, { color: p.skin.text9 }]}>{data.length > 0 ? data[data.length - 1] : ''}</Text>
      </View>
      <Svg width={w} height={h} style={{ marginTop: 4 }}>
        {d.length > 0 ? <Path d={d} stroke={widgetColor(p)} strokeWidth={line} fill="none" strokeLinejoin="round" /> : null}
      </Svg>
    </View>
  );
}

/** Terminal: received lines on top, an input line below that publishes what you type. */
export function TerminalBody(p: BodyProps) {
  const timestamps = opt(p.metric.opts, 'timestamps', false);
  const newline = opt(p.metric.opts, 'newline', false);
  const lines = useLog(p.metric, timestamps);
  const [text, setText] = React.useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  const bg = p.skin.scheme === 'dark' ? '#0E0F12' : '#03030A';
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scroll} style={{ backgroundColor: bg, borderRadius: 4, padding: 8 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {lines.map((l, i) => (
          <Text key={i} style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 16, color: '#FFFFFF' }}>
            {l}
          </Text>
        ))}
      </ScrollView>
      <TextInput
        editable={p.interactive}
        value={text}
        onChangeText={setText}
        placeholder={U.type_here}
        placeholderTextColor="rgba(255,255,255,0.4)"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="send"
        onSubmitEditing={() => {
          if (text.length > 0) p.onSet(newline ? `${text}\n` : text);
          setText('');
        }}
        style={{ marginTop: 4, backgroundColor: bg, color: '#FFFFFF', fontFamily: 'monospace', fontSize: 12, paddingHorizontal: 8, minHeight: 32, borderRadius: 4 }}
      />
    </View>
  );
}

/** Icon that follows the on/off state. */
export function IconBody(p: BodyProps) {
  const size = Math.max(Math.min(p.inner.w, p.inner.h) - 8, 16);
  return (
    <View style={center}>
      <Icon name={p.display.icon} size={size} color={p.display.on ? widgetColor(p) : p.skin.text6} />
    </View>
  );
}

/** Static or live text: the widget's own text option wins over the payload. */
export function TextBody(p: BodyProps) {
  const own = opt(p.metric.opts, 'text', '');
  return (
    <View style={center}>
      <Text style={[type.body2, { color: p.skin.text9, textAlign: 'center' }]}>{own.length > 0 ? own : p.display.text}</Text>
    </View>
  );
}

/** Dynamic Spacer: invisible, outlined while editing. */
export function SpacerBody(p: BodyProps) {
  return p.edit ? <View style={[StyleSheet.absoluteFill, { borderWidth: 1, borderStyle: 'dashed', borderColor: p.skin.text6 }]} /> : null;
}

/** Icon button: circular, filled with the widget color while on. */
export function IconButtonBody(p: BodyProps) {
  const size = Math.max(Math.min(p.inner.w, p.inner.h) - 4, 24);
  const on = p.display.on;
  return (
    <Pressable disabled={!p.interactive} onPress={p.onTap} style={center}>
      <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? widgetColor(p) : p.skin.divider2, borderWidth: 1, borderColor: on ? widgetColor(p) : p.skin.stroke4 }}>
        <Icon name={p.display.icon} size={size * 0.5} color={on ? p.skin.onBrand : p.skin.text9} />
      </View>
    </Pressable>
  );
}
