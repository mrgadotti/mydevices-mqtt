import React, { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { TileDisplay } from '../../domain/display';
import { formatFixed, rangeValue } from '../../domain/metrics';
import type { Metric, MultiSwitchMetric, RangeMetric } from '../../domain/types';
import type { WidgetKind } from '../../domain/widgets';
import { ListDialog } from '../dialogs';
import { Icon } from '../icons/Icon';
import { type, type Skin } from '../skin';
import { arcPath, fitFont } from './geometry';
import { opt } from '../../domain/widgetLogic';
import { ChartBody, EnhancedGaugeBody, IconBody, IconButtonBody, LcdBody, LevelVBody, RadialGaugeBody, SpacerBody, TerminalBody, TextBody } from './DisplayViews';
import { JoystickBody, LevelSliderBody, NumericInputBody, RgbBody, StepButtonsBody, StepSliderBody, TextInputBody, TimeInputBody, VerticalSliderBody } from './ControlViews';
import { WidgetCard } from './WidgetCard';
import type { BodyProps, WidgetViewProps } from './types';
import { U } from '../../i18n';

export type { WidgetViewProps } from './types';

const GAUGE_START = 135;
const GAUGE_SWEEP = 270;

export function WidgetView(p: WidgetViewProps) {
  const { display: d, skin } = p;
  const inner = { w: p.width - 10, h: p.height - 10 - 20 };
  if (p.kind === 'spacer') {
    return (
      <View style={{ width: p.width, height: p.height }}>
        <SpacerBody {...p} inner={inner} />
      </View>
    );
  }
  return (
    <WidgetCard skin={skin} label={d.name} width={p.width} height={p.height} blink={d.blink} pending={p.pending} error={d.error}>
      <Body {...p} inner={inner} />
    </WidgetCard>
  );
}

function Body(p: BodyProps) {
  switch (p.kind) {
    case 'button':
      return <ButtonBody {...p} />;
    case 'styledButton':
      return <StyledButtonBody {...p} />;
    case 'iconButton':
      return <IconButtonBody {...p} />;
    case 'verticalSlider':
      return <VerticalSliderBody {...p} />;
    case 'stepSlider':
      return <StepSliderBody {...p} />;
    case 'verticalStepSlider':
      return <VerticalSliderBody {...p} step={opt(p.metric.opts, 'step', 1)} />;
    case 'stepH':
      return <StepButtonsBody {...p} vertical={false} />;
    case 'stepV':
      return <StepButtonsBody {...p} vertical />;
    case 'levelSlider':
      return <LevelSliderBody {...p} />;
    case 'joystick':
      return <JoystickBody {...p} />;
    case 'rgb':
      return <RgbBody {...p} />;
    case 'radialGauge':
      return <RadialGaugeBody {...p} />;
    case 'enhancedGauge':
      return <EnhancedGaugeBody {...p} />;
    case 'lcd':
      return <LcdBody {...p} />;
    case 'levelV':
      return <LevelVBody {...p} />;
    case 'chart':
      return <ChartBody {...p} />;
    case 'terminal':
      return <TerminalBody {...p} />;
    case 'icon':
      return <IconBody {...p} />;
    case 'textInput':
      return <TextInputBody {...p} />;
    case 'numericInput':
      return <NumericInputBody {...p} />;
    case 'timeInput':
      return <TimeInputBody {...p} />;
    case 'text':
      return <TextBody {...p} />;
    case 'switch':
      return <SwitchBody {...p} />;
    case 'slider':
      return <SliderBody {...p} />;
    case 'gauge':
      return <GaugeBody {...p} />;
    case 'led':
      return <LedBody {...p} />;
    case 'level':
      return <LevelBody {...p} />;
    case 'segmented':
      return <SegmentedBody {...p} />;
    case 'menu':
      return <MenuBody {...p} />;
    case 'image':
      return <ImageBody {...p} />;
    case 'color':
      return <ColorBody {...p} />;
    case 'notification':
      return <NotificationBody {...p} />;
    case 'labeled':
      return <ValueBody {...p} left />;
    default:
      return <ValueBody {...p} />;
  }
}

const center = { flex: 1, alignItems: 'center', justifyContent: 'center' } as const;

function ValueBody({ display: d, skin, inner, left, onTap, interactive }: BodyProps & { left?: boolean }) {
  const size = fitFont(inner.h, left ? 28 : 48);
  return (
    <Pressable disabled={!interactive} onPress={onTap} style={[center, left ? { alignItems: 'flex-start' } : null]}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[left ? type.body1 : type.number, { color: skin.text9, fontSize: size, lineHeight: size * 1.25 }]}>
        {d.text.length > 0 ? d.text : '-'}
      </Text>
    </Pressable>
  );
}

/** Default button: solid, rounded; the widget color when on, a neutral fill when off. */
function ButtonBody({ display: d, skin, onTap, interactive, metric }: BodyProps) {
  const on = d.on;
  const label = metric.type === 2 ? (on ? 'ON' : 'OFF') : d.text;
  return (
    <Pressable
      disabled={!interactive}
      onPress={onTap}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: on ? (pressed ? '#1D9D72' : skin.brand) : pressed ? skin.stroke3 : skin.divider2, borderColor: on ? skin.brand : skin.stroke4 },
      ]}
    >
      <Text numberOfLines={1} style={[type.subtitle1, { color: on ? skin.onBrand : skin.text9 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Styled button: solid, outlined, solid + stroke or text, with pill, rounded or sharp corners. */
function StyledButtonBody({ display: d, skin, onTap, interactive, metric, inner }: BodyProps) {
  const style = opt<string>(metric.opts, 'style', 'solid');
  const edge = opt<string>(metric.opts, 'edge', 'rounded');
  const on = d.on;
  const label = on ? opt<string>(metric.opts, 'labelOn', 'ON') : opt<string>(metric.opts, 'labelOff', 'OFF');
  const fill = on ? skin.brand : skin.divider2;
  const radius = edge === 'pill' ? inner.h : edge === 'sharp' ? 0 : 8;
  const filled = style === 'solid' || style === 'solidStroke';
  return (
    <Pressable
      disabled={!interactive}
      onPress={onTap}
      style={[
        s.button,
        {
          borderRadius: radius,
          backgroundColor: filled ? fill : 'transparent',
          borderWidth: style === 'solid' || style === 'text' ? 0 : 1,
          borderColor: on ? skin.brand : skin.stroke4,
        },
      ]}
    >
      <Text numberOfLines={1} style={[type.subtitle1, { color: filled ? (on ? skin.onBrand : skin.text9) : on ? skin.brand : skin.text9 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SwitchBody({ display: d, skin, onTap, interactive, inner }: BodyProps) {
  const w = Math.min(44, inner.w);
  const h = Math.min(22, inner.h);
  return (
    <Pressable disabled={!interactive} onPress={onTap} style={center}>
      <View style={[s.track, { width: w, height: h, borderRadius: h / 2, backgroundColor: d.on ? skin.positive : skin.text6, alignItems: d.on ? 'flex-end' : 'flex-start' }]}>
        <View style={{ width: h - 4, height: h - 4, borderRadius: (h - 4) / 2, margin: 2, backgroundColor: skin.white }} />
      </View>
    </Pressable>
  );
}

/** Horizontal slider: value on the left, 4 dp track, 20 dp thumb, publishes when released. */
function SliderBody({ metric, display: d, skin, onSet, interactive }: BodyProps) {
  const m = metric as RangeMetric;
  const [drag, setDrag] = useState<number | null>(null);
  const trackW = useRef(1);
  const live = useRef({ m, onSet, drag: null as number | null });
  live.current = { m, onSet, drag };
  const toValue = (x: number) => {
    const cur = live.current.m;
    const ratio = Math.min(Math.max(x / trackW.current, 0), 1);
    return cur.minValue + ratio * (cur.maxValue - cur.minValue);
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => setDrag(toValue(e.nativeEvent.locationX)),
        onPanResponderMove: (e) => setDrag(toValue(e.nativeEvent.locationX)),
        onPanResponderRelease: () => {
          const v = live.current.drag;
          setDrag(null);
          if (v !== null) live.current.onSet(formatFixed(v, live.current.m.decimalPrecision));
        },
        onPanResponderTerminate: () => setDrag(null),
      }),
    [],
  );
  const value = drag ?? rangeValue(m);
  const span = m.maxValue - m.minValue;
  const ratio = span > 0 ? Math.min(Math.max((value - m.minValue) / span, 0), 1) : 0;
  const shown = drag !== null ? `${m.prefix}${formatFixed(drag, m.decimalPrecision)}${m.postfix}` : d.text;
  return (
    <View style={s.sliderRow}>
      <Text numberOfLines={1} style={[type.number, { color: skin.text9, minWidth: 40, marginHorizontal: 4 }]}>
        {shown}
      </Text>
      <View
        style={s.sliderHit}
        onLayout={(e) => {
          trackW.current = Math.max(e.nativeEvent.layout.width, 1);
        }}
        {...(interactive ? responder.panHandlers : {})}
      >
        <View pointerEvents="none" style={[s.sliderTrack, { backgroundColor: skin.stroke3 }]}>
          <View style={{ width: `${ratio * 100}%`, height: 4, borderRadius: 4, backgroundColor: d.color === '#FFFFFF' ? skin.brand : d.color }} />
        </View>
        <View pointerEvents="none" style={[s.thumb, { left: `${ratio * 100}%`, borderColor: skin.stroke4, backgroundColor: skin.white }]} />
      </View>
    </View>
  );
}

function GaugeBody({ display: d, skin, inner }: BodyProps) {
  const size = Math.max(Math.min(inner.w, inner.h), 24);
  const stroke = Math.max(size * 0.1, 4);
  const r = (size - stroke) / 2;
  const c = size / 2;
  const pct = Math.min(Math.max(d.progress, 0), 100);
  const color = d.color === '#FFFFFF' ? skin.brand : d.color;
  return (
    <View style={center}>
      <Svg width={size} height={size}>
        <Path d={arcPath(c, c, r, GAUGE_START, GAUGE_START + GAUGE_SWEEP)} stroke={skin.stroke3} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        {pct > 0 ? <Path d={arcPath(c, c, r, GAUGE_START, GAUGE_START + (GAUGE_SWEEP * pct) / 100)} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" /> : null}
      </Svg>
      <Text numberOfLines={1} style={[type.number, s.gaugeText, { color: skin.text9, fontSize: Math.max(size * 0.22, 12), lineHeight: Math.max(size * 0.22, 12) * 1.3 }]}>
        {d.text}
      </Text>
    </View>
  );
}

function LedBody({ display: d, skin, inner }: BodyProps) {
  const size = Math.max(Math.min(inner.w, inner.h) - 8, 10);
  const color = d.color === '#FFFFFF' ? skin.brand : d.color;
  return (
    <View style={center}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={color} fillOpacity={d.on ? 1 : 0.2} stroke={skin.stroke4} strokeWidth={1} />
      </Svg>
    </View>
  );
}

function LevelBody({ display: d, skin }: BodyProps) {
  const color = d.color === '#FFFFFF' ? skin.brand : d.color;
  return (
    <View style={[center, { justifyContent: 'center' }]}>
      <View style={[s.level, { backgroundColor: skin.stroke3 }]}>
        <View style={{ width: `${Math.min(Math.max(d.progress, 0), 100)}%`, height: '100%', backgroundColor: color }} />
      </View>
    </View>
  );
}

function SegmentedBody({ metric, skin, onSet, interactive }: BodyProps) {
  const m = metric as MultiSwitchMetric;
  const selected = m.lastPayload;
  if (m.items.length === 0) return <Text style={[type.body3, { color: skin.text7 }]}>{U.no_options}</Text>;
  return (
    <View style={[s.segments, { backgroundColor: skin.divider2 }]}>
      {m.items.map((it, i) => {
        const on = selected !== null && it.payload === selected;
        return (
          <Pressable
            key={`${it.payload}-${i}`}
            disabled={!interactive}
            onPress={() => onSet(it.payload)}
            style={[s.segment, { backgroundColor: on ? skin.primary : 'transparent', borderLeftWidth: i > 0 && !on ? 1 : 0, borderLeftColor: skin.stroke4 }]}
          >
            <Text numberOfLines={1} style={[type.subtitle2, { color: on ? skin.onPrimary : skin.text8 }]}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MenuBody({ metric, display: d, skin, onSet, interactive }: BodyProps) {
  const m = metric as MultiSwitchMetric;
  const [open, setOpen] = useState(false);
  return (
    <View style={center}>
      <Pressable disabled={!interactive} onPress={() => setOpen(true)} style={[s.menu, { backgroundColor: skin.divider2, borderColor: skin.stroke3 }]}>
        <Text numberOfLines={1} style={[type.body1, { color: d.text.length > 0 ? skin.text9 : skin.text6, flex: 1 }]}>
          {d.text.length > 0 ? d.text : 'Make a selection…'}
        </Text>
        <Icon name="glyph:chevron_down" size={16} color={skin.text8} />
      </Pressable>
      {open ? <ListDialog onClose={() => setOpen(false)} items={m.items.map((it) => ({ title: it.label, run: () => onSet(it.payload) }))} /> : null}
    </View>
  );
}

function ImageBody({ imageUri, onImageLoaded, onImageError, onTap, interactive }: BodyProps) {
  return (
    <Pressable disabled={!interactive} onPress={onTap} style={s.fill}>
      {imageUri !== null ? <Image source={{ uri: imageUri }} resizeMode="contain" style={s.fill} onLoad={onImageLoaded} onError={onImageError} /> : null}
    </Pressable>
  );
}

function ColorBody({ display: d, skin, onTap, interactive, inner }: BodyProps) {
  const size = Math.max(Math.min(inner.w, inner.h) - 8, 16);
  return (
    <Pressable disabled={!interactive} onPress={onTap} style={center}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: d.color, borderWidth: 1, borderColor: skin.stroke4 }} />
    </Pressable>
  );
}

function NotificationBody({ metric, display: d, skin, inner }: BodyProps) {
  const size = Math.max(Math.min(inner.h, 44), 16);
  return (
    <View style={center}>
      <Icon name={d.icon} size={size} color={d.on ? skin.brand : skin.text7} />
      {inner.h > 70 && metric.lastPayload ? (
        <Text numberOfLines={2} style={[type.body3, { color: skin.text8, textAlign: 'center' }]}>
          {metric.lastPayload}
        </Text>
      ) : null}
    </View>
  );
}


const s = StyleSheet.create({
  fill: { flex: 1 },
  button: { flex: 1, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  track: { justifyContent: 'center' },
  sliderRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  sliderHit: { flex: 1, height: 44, justifyContent: 'center', marginRight: 14 },
  sliderTrack: { height: 4, borderRadius: 4 },
  thumb: { position: 'absolute', width: 20, height: 20, marginLeft: -10, borderRadius: 10, borderWidth: 4, elevation: 4 },
  gaugeText: { position: 'absolute' },
  level: { width: '100%', height: '60%', borderRadius: 4, overflow: 'hidden' },
  segments: { flex: 1, flexDirection: 'row', borderRadius: 8, padding: 2, maxHeight: 48, alignSelf: 'stretch' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, minHeight: 24 },
  menu: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignSelf: 'stretch' },
});
