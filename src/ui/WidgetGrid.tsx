import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Metric } from '../domain/types';
import { canPlace, clampSize, GRID_COLUMNS, layoutKey, layoutWidgets, widgetKindOf, type Rect } from '../domain/widgets';
import { gridDotsPath } from './widgets/geometry';
import { markRender, perfMeasure } from './perf';
import type { Skin } from './skin';

interface Props {
  metrics: Metric[];
  /** Width of the grid in dp; the 24 columns share it (square cells). */
  width: number;
  /** Minimum visible height in dp (fills the screen so empty cells can be tapped). */
  minHeight: number;
  edit: boolean;
  selectedId: string | null;
  skin: Skin;
  renderWidget: (m: Metric, width: number, height: number) => React.ReactNode;
  onSelect: (id: string | null) => void;
  /** Tap on an empty cell in edit mode. */
  onEmptyTap: (cell: { x: number; y: number }) => void;
  onChangeRect: (id: string, rect: Rect) => void;
  onGesture: (active: boolean) => void;
}

type Gesture = { mode: 'move' | 'resize'; id: string; from: Rect; dx: number; dy: number };

const HANDLE = 32;
const EXTRA_ROWS = 6;

/**
 * Widget canvas: widgets sit on a 24-column grid of square cells. In edit mode a tap selects a widget, dragging the
 * selected widget moves it and dragging its corner handle resizes it, snapping to cells; overlapping drops are refused.
 */
export function WidgetGrid({ metrics, width, minHeight, edit, selectedId, skin, renderWidget, onSelect, onEmptyTap, onChangeRect, onGesture }: Props) {
  markRender('WidgetGrid');
  const cell = Math.floor(width / GRID_COLUMNS);
  const offset = Math.floor((width - cell * GRID_COLUMNS) / 2);
  const key = layoutKey(metrics);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rects = useMemo(() => layoutWidgets(metrics), [key]);
  const [g, setG] = useState<Gesture | null>(null);
  const live = useRef({ rects, cell, selectedId, edit, metrics, onChangeRect, onGesture, g });
  live.current = { rects, cell, selectedId, edit, metrics, onChangeRect, onGesture, g };

  let bottom = 0;
  for (const r of rects.values()) bottom = Math.max(bottom, r.y + r.h);
  const rows = Math.max(bottom + (edit ? EXTRA_ROWS : 0), Math.ceil(minHeight / cell));
  const height = rows * cell;

  const preview = (gs: Gesture): { rect: Rect; ok: boolean } => {
    const dxCells = Math.round(gs.dx / live.current.cell);
    const dyCells = Math.round(gs.dy / live.current.cell);
    const m = live.current.metrics.find((x) => x.id === gs.id);
    let rect: Rect;
    if (gs.mode === 'move') {
      rect = { ...gs.from, x: gs.from.x + dxCells, y: gs.from.y + dyCells };
    } else {
      const size = clampSize(m ? widgetKindOf(m) : 'value', gs.from.w + dxCells, gs.from.h + dyCells);
      rect = { ...gs.from, ...size };
    }
    return { rect, ok: canPlace(live.current.rects, gs.id, rect) };
  };

  const makeResponder = (mode: 'move' | 'resize') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => live.current.edit && live.current.selectedId !== null,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const id = live.current.selectedId;
        const from = id ? live.current.rects.get(id) : undefined;
        if (!id || !from) return;
        live.current.onGesture(true);
        setG({ mode, id, from, dx: 0, dy: 0 });
      },
      onPanResponderMove: (_e, gs) => setG((cur) => (cur ? { ...cur, dx: gs.dx, dy: gs.dy } : cur)),
      onPanResponderRelease: () => end(true),
      onPanResponderTerminate: () => end(false),
    });
  const moveResponder = useMemo(() => makeResponder('move'), []); // eslint-disable-line react-hooks/exhaustive-deps
  const resizeResponder = useMemo(() => makeResponder('resize'), []); // eslint-disable-line react-hooks/exhaustive-deps

  function end(commit: boolean) {
    const cur = live.current.g;
    setG(null);
    live.current.onGesture(false);
    if (!commit || !cur) return;
    const { rect, ok } = preview(cur);
    const moved = rect.x !== cur.from.x || rect.y !== cur.from.y || rect.w !== cur.from.w || rect.h !== cur.from.h;
    if (ok && moved) live.current.onChangeRect(cur.id, rect);
  }

  useEffect(() => {
    perfMeasure('edit-toggle');
  }, [edit]);
  const shown = g ? preview(g) : null;
  // One path of zero-length round-capped segments: thousands of grid dots cost one native element, not one each.
  const dotsPath = useMemo(() => (edit ? gridDotsPath(rows, cell, offset) : ''), [edit, rows, cell, offset]);

  return (
    <View style={{ width, height }}>
      {edit ? (
        <Pressable
          style={{ position: 'absolute', left: 0, top: 0, width, height }}
          onPress={(e) => {
            const x = Math.floor((e.nativeEvent.locationX - offset) / cell);
            const y = Math.floor(e.nativeEvent.locationY / cell);
            if (x >= 0 && x < GRID_COLUMNS && y >= 0) onEmptyTap({ x, y });
            onSelect(null);
          }}
        >
          <Svg width={width} height={height} pointerEvents="none">
            <Path d={dotsPath} stroke={skin.text5} strokeWidth={2} strokeLinecap="round" fill="none" />
          </Svg>
        </Pressable>
      ) : null}
      {metrics.map((m) => {
        const r = rects.get(m.id) as Rect;
        const active = g?.id === m.id;
        const draw = active && shown ? shown.rect : r;
        const selected = edit && selectedId === m.id;
        return (
          <View
            key={m.id}
            style={[
              { position: 'absolute', left: offset + draw.x * cell, top: draw.y * cell, width: draw.w * cell, height: draw.h * cell },
              active ? { zIndex: 5, elevation: 8, opacity: shown?.ok ? 1 : 0.5 } : null,
            ]}
          >
            <View pointerEvents={edit ? 'none' : 'auto'} style={{ flex: 1 }}>
              {renderWidget(m, draw.w * cell, draw.h * cell)}
            </View>
            {edit && !selected ? <Pressable style={s.fill} onPress={() => onSelect(m.id)} /> : null}
            {selected ? (
              <>
                <View
                  style={[s.fill, { borderWidth: 1, borderRadius: 4, borderColor: skin.brand }]}
                  {...moveResponder.panHandlers}
                />
                <View
                  style={{ position: 'absolute', right: -HANDLE / 2, bottom: -HANDLE / 2, width: HANDLE, height: HANDLE, alignItems: 'center', justifyContent: 'center' }}
                  {...resizeResponder.panHandlers}
                >
                  <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: skin.brand }} />
                </View>
              </>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({ fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 } });
