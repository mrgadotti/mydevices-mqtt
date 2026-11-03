import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAnimatedReaction, useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { Circle, Line as SkLine, matchFont, vec } from 'react-native-skia';
import { scheduleOnRN } from 'react-native-worklets';
import { AreaRange, CartesianChart, Line, useChartPressState } from 'victory-native';
import { opt } from '../../domain/widgetLogic';
import { formatAxisTime, formatTooltipTime, formatValueLabel, windowToMs } from '../../history/chartAxis';
import { DEFAULT_WINDOW } from '../../history/HistoryRecorder';
import { U } from '../../i18n';
import { type } from '../skin';
import type { BodyProps } from './types';
import { useHistoryBuckets } from './useHistoryBuckets';

/** Finger must rest this long before the chart claims the touch, so vertical swipes still scroll the dashboard. */
const PRESS_DELAY_MS = 150;
const HEADER_H = 18;
const TOOLTIP_W = 124;

interface Tip {
  active: boolean;
  index: number;
  x: number;
}

function Cursor({ x, top, bottom, y, color }: { x: SharedValue<number>; top: number; bottom: number; y: SharedValue<number>; color: string }) {
  const p1 = useDerivedValue(() => vec(x.value, top));
  const p2 = useDerivedValue(() => vec(x.value, bottom));
  return (
    <>
      <SkLine p1={p1} p2={p2} color={color} strokeWidth={1} />
      <Circle cx={x} cy={y} r={4} color={color} />
    </>
  );
}

/** History chart: line (and min/max band) of the stored samples of the window, with a touch cursor and tooltip. */
export function HistoryChartBody(p: BodyProps) {
  const { skin, metric } = p;
  const win = windowToMs(opt(metric.opts, 'window', DEFAULT_WINDOW));
  const line = opt(metric.opts, 'line', 2);
  const color = p.display.color === '#FFFFFF' ? skin.brand : p.display.color;
  const { buckets, from, to, loaded } = useHistoryBuckets(metric.id, win, metric.lastActivity);
  const font = useMemo(() => matchFont({ fontFamily: 'sans-serif', fontSize: 10 }), []);
  const { state } = useChartPressState({ x: 0, y: { avg: 0, min: 0, max: 0 } });
  const [tip, setTip] = useState<Tip>({ active: false, index: 0, x: 0 });

  const onTip = useCallback((active: boolean, index: number, x: number) => setTip({ active, index, x }), []);
  useAnimatedReaction(
    () => ({ a: state.isActive.value, i: state.matchedIndex.value, x: state.x.position.value }),
    (cur, prev) => {
      if (!prev || cur.a !== prev.a || cur.i !== prev.i) scheduleOnRN(onTip, cur.a, cur.i, cur.x);
    },
  );

  const data = useMemo(() => buckets.map((b) => ({ ts: b.ts, avg: b.avg, min: b.min, max: b.max })), [buckets]);
  const chartH = Math.max(p.inner.h - HEADER_H, 20);
  const chartW = Math.max(p.inner.w, 20);
  const hit = tip.active ? buckets[tip.index] : undefined;
  const tipLeft = Math.min(Math.max(tip.x - TOOLTIP_W / 2, 0), chartW - TOOLTIP_W);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={[type.body3, { color: skin.text7 }]}>{opt(metric.opts, 'window', DEFAULT_WINDOW)}</Text>
        <Text numberOfLines={1} style={[type.number, s.value, { color: skin.text9 }]}>
          {p.display.text}
        </Text>
      </View>
      {data.length === 0 ? (
        <View style={s.empty}>
          <Text style={[type.body3, { color: skin.text7 }]}>{loaded ? U.history_no_data : ''}</Text>
        </View>
      ) : (
        <View style={{ width: chartW, height: chartH }} pointerEvents={p.interactive ? 'auto' : 'none'}>
          <CartesianChart
            data={data}
            xKey="ts"
            yKeys={['avg', 'min', 'max']}
            domain={{ x: [from, to] }}
            domainPadding={{ top: 6, bottom: 6 }}
            padding={{ left: 2, right: 10, top: 4, bottom: 0 }}
            chartPressState={state}
            gestureLongPressDelay={PRESS_DELAY_MS}
            axisOptions={{
              font,
              tickCount: { x: 3, y: 4 },
              labelColor: skin.text7,
              lineColor: { grid: skin.stroke3, frame: skin.stroke3 },
              lineWidth: { grid: 1, frame: 1 },
              formatXLabel: (v) => formatAxisTime(Number(v), win),
              formatYLabel: (v) => formatValueLabel(Number(v)),
            }}
          >
            {({ points, chartBounds }) => (
              <>
                <AreaRange upperPoints={points.max} lowerPoints={points.min} color={color} opacity={0.18} curveType="monotoneX" />
                <Line points={points.avg} color={color} strokeWidth={line} curveType="monotoneX" />
                {tip.active ? <Cursor x={state.x.position} y={state.y.avg.position} top={chartBounds.top} bottom={chartBounds.bottom} color={skin.text8} /> : null}
              </>
            )}
          </CartesianChart>
          {hit ? (
            <View pointerEvents="none" style={[s.tip, { left: tipLeft, width: TOOLTIP_W, backgroundColor: skin.background, borderColor: skin.stroke4 }]}>
              <Text style={[type.subtitle1, { color: skin.text9 }]}>{formatValueLabel(hit.avg)}</Text>
              <Text style={[type.body3, { color: skin.text8 }]}>{formatTooltipTime(hit.ts, win)}</Text>
              {hit.count > 1 ? <Text style={[type.body3, { color: skin.text7 }]}>{U.history_minmax.replace('{min}', formatValueLabel(hit.min)).replace('{max}', formatValueLabel(hit.max))}</Text> : null}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { height: HEADER_H, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { flexShrink: 1, marginLeft: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tip: { position: 'absolute', top: 2, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
});
