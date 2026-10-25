import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { Skin } from '../skin';
import { type } from '../skin';

interface Props {
  skin: Skin;
  label: string;
  width: number;
  height: number;
  blink: boolean;
  pending: boolean;
  error: string;
  children: React.ReactNode;
}

/** Blink: toggles every 500 ms while enabled. */
function useBlink(enabled: boolean): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setOn(false);
      return;
    }
    const t = setInterval(() => setOn((v) => !v), 500);
    return () => clearInterval(t);
  }, [enabled]);
  return on;
}

/** Widget chrome: surface card, 1 dp stroke, 4 dp padding, a one-line label on top and the content below it. */
export function WidgetCard({ skin, label, width, height, blink, pending, error, children }: Props) {
  const blinkOn = useBlink(blink);
  return (
    <View
      style={[
        s.card,
        { width, height, backgroundColor: blinkOn ? skin.divider2 : skin.surface, borderColor: skin.stroke3 },
      ]}
    >
      <Text numberOfLines={1} style={[type.body3, s.label, { color: skin.text8 }]}>
        {label}
      </Text>
      <View style={s.content}>{children}</View>
      {pending ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.center]}>
          <ActivityIndicator color={skin.brand} />
        </View>
      ) : null}
      {error.length > 0 ? (
        <View style={[StyleSheet.absoluteFill, s.center, s.error, { backgroundColor: skin.surface }]}>
          <Text numberOfLines={4} style={[type.body3, { color: skin.critical, textAlign: 'center' }]}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 4, borderWidth: 1, overflow: 'hidden' },
  label: { paddingBottom: 4 },
  content: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  error: { padding: 8 },
});
