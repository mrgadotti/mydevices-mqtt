import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from './icons/Icon';
import { useSkin } from './useSkin';

export interface ActionItem {
  icon: string;
  label: string;
  onPress: () => void;
  /** Highlights the button (the mode it toggles is on). */
  active?: boolean;
}

/** App bar actions: 32 dp rounded buttons with a 17 dp glyph; pressed state is a brand tint. */
export function ActionIcons({ items }: { items: ActionItem[] }) {
  const skin = useSkin();
  return (
    <View style={s.row}>
      {items.map((it) => (
        <Pressable
          key={it.label}
          accessibilityLabel={it.label}
          onPress={it.onPress}
          style={({ pressed }) => [s.hit, { backgroundColor: it.active ? skin.brand : pressed ? 'rgba(36,196,142,0.2)' : 'transparent' }]}
        >
          <Icon name={it.icon} size={20} color={it.active ? skin.onBrand : skin.text9} />
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  hit: { width: 32, height: 32, borderRadius: 8, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
});
