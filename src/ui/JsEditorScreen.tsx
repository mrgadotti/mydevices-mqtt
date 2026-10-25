import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deliverPick, getScriptDraft, type RootStackParamList } from './navigation';
import { S } from '../i18n';
import { useColors } from './colors';
import { useToast } from './toast';

type Props = NativeStackScreenProps<RootStackParamList, 'JsEditor'>;

const SLUG: Record<number, string> = {
  1: 'text-metric',
  2: 'switch-metric',
  3: 'range-progress-metric',
  4: 'multi-choice-metric',
  5: 'image-metric',
  6: 'color-metric',
};

/** The help page the original opens for a metric type and hook. */
export function helpUrl(metricType: number, kind: 'receive' | 'display' | 'tap'): string {
  const slug = SLUG[metricType];
  return slug ? `https://byte1974.github.io/mqttdash/js/${slug}-on-${kind}.html` : 'https://byte1974.github.io/mqttdash/js/';
}

/** JsEditorActivity: a monospace editor with Help and OK. */
export function JsEditorScreen({ navigation, route }: Props) {
  const c = useColors();
  const [text, setText] = useState(getScriptDraft());
  const toast = useToast();
  const { kind, metricType, title } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerRight: () => (
        <View style={s.actions}>
          <Pressable style={s.action} onPress={() => void Linking.openURL(helpUrl(metricType, kind)).catch((e: Error) => toast(e.message))}>
            <Text style={[s.actionText, { color: c.textPrimary }]}>{S.help.toUpperCase()}</Text>
          </Pressable>
          <Pressable
            style={s.action}
            onPress={() => {
              deliverPick(text);
              navigation.goBack();
            }}
          >
            <Text style={[s.actionText, { color: c.textPrimary }]}>{S.ok}</Text>
          </Pressable>
        </View>
      ),
    });
  });

  return (
    <TextInput
      value={text}
      onChangeText={setText}
      multiline
      keyboardType="visible-password"
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      textAlignVertical="top"
      scrollEnabled
      style={[s.editor, { backgroundColor: c.windowBackground, color: c.textPrimary }]}
      cursorColor={c.accent}
      underlineColorAndroid="transparent"
    />
  );
}

const s = StyleSheet.create({
  editor: { flex: 1, fontFamily: 'monospace', fontSize: 14, padding: 8 },
  actions: { flexDirection: 'row' },
  action: { paddingHorizontal: 12, height: 48, justifyContent: 'center' },
  actionText: { fontSize: 14, fontWeight: '500' },
});
