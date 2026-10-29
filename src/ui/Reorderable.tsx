import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View, type HostInstance, type LayoutRectangle, type StyleProp, type ViewStyle } from 'react-native';

interface Props<T> {
  data: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  enabled: boolean;
  onMove: (from: number, to: number) => void;
  style?: StyleProp<ViewStyle>;
}

/** Drag-to-reorder container for lists and wrapping grids: press an item, drag it over another one, release. */
export function Reorderable<T>({ data, keyOf, renderItem, enabled, onMove, style }: Props<T>) {
  const rects = useRef<Record<string, LayoutRectangle>>({});
  const box = useRef<HostInstance>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ index: number; dx: number; dy: number; hover: number } | null>(null);
  const live = useRef({ data, keyOf, enabled, onMove });
  live.current = { data, keyOf, enabled, onMove };
  const dragRef = useRef<typeof drag>(null);
  dragRef.current = drag;

  const indexAt = (x: number, y: number): number => {
    const { data: d, keyOf: k } = live.current;
    return d.findIndex((item) => {
      const r = rects.current[k(item)];
      return r && x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
    });
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => live.current.enabled,
        onMoveShouldSetPanResponder: () => live.current.enabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (_e, g) => {
          box.current?.measureInWindow((x, y) => {
            origin.current = { x, y };
            const index = indexAt(g.x0 - x, g.y0 - y);
            if (index >= 0) setDrag({ index, dx: 0, dy: 0, hover: index });
          });
        },
        onPanResponderMove: (_e, g) => {
          const cur = dragRef.current;
          if (!cur) return;
          const { data: d, keyOf: k } = live.current;
          const r = rects.current[k(d[cur.index])];
          const hover = r ? indexAt(r.x + r.width / 2 + g.dx, r.y + r.height / 2 + g.dy) : cur.hover;
          setDrag({ index: cur.index, dx: g.dx, dy: g.dy, hover: hover >= 0 ? hover : cur.hover });
        },
        onPanResponderRelease: () => {
          const cur = dragRef.current;
          setDrag(null);
          if (cur && cur.hover !== cur.index) live.current.onMove(cur.index, cur.hover);
        },
        onPanResponderTerminate: () => setDrag(null),
      }),
    [],
  );

  return (
    <View ref={box} style={style} {...(enabled ? responder.panHandlers : {})}>
      {data.map((item, index) => {
        const key = keyOf(item);
        const dragging = drag?.index === index;
        const target = drag && drag.hover === index && drag.index !== index;
        return (
          <View
            key={key}
            onLayout={(e) => {
              rects.current[key] = e.nativeEvent.layout;
            }}
            pointerEvents={enabled ? 'none' : 'auto'}
            style={[
              dragging ? { transform: [{ translateX: drag.dx }, { translateY: drag.dy }], zIndex: 10, opacity: 0.85, elevation: 8 } : null,
              target ? { opacity: 0.5 } : null,
            ]}
          >
            {renderItem(item, index)}
          </View>
        );
      })}
    </View>
  );
}
