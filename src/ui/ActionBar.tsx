import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type } from './skin';
import { useSkin } from './useSkin';

/** App bar: 48 dp below the status bar, a one-line Headline1 title 16 dp from the left and 32 dp action buttons on the right. */
export function ActionBar({ options }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const skin = useSkin();
  const title = typeof options.title === 'string' ? options.title : '';
  return (
    <View style={[s.bar, { paddingTop: insets.top, backgroundColor: skin.background }]}>
      <View style={s.inner}>
        <Text numberOfLines={1} style={[type.headline1, s.title, { color: skin.text9 }]}>
          {title}
        </Text>
        {options.headerRight ? options.headerRight({ canGoBack: false }) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { elevation: 4 },
  inner: { height: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8 },
  title: { flex: 1 },
});
