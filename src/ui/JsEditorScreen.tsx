import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deliverPick, getScriptDraft, type RootStackParamList } from './navigation';
import { S } from '../i18n';
import { useColors } from './colors';
import { useToast } from './toast';

type Props = NativeStackScreenProps<RootStackParamList, 'JsEditor'>;

const SCRIPTING_GUIDE = 'https://github.com/mrgadotti/mydevices-mqtt/blob/main/docs/scripting.md';

/** The scripting guide, opened at the section of the hook being edited. */
export function helpUrl(kind: 'receive' | 'display' | 'tap'): string {
  return `${SCRIPTING_GUIDE}#on-${kind}`;
}

/** JsEditorActivity: a monospace editor with Help and OK. */
export function JsEditorScreen({ navigation, route }: Props) {
  const c = useColors();
  const [text, setText] = useState(getScriptDraft());
  const toast = useToast();
  const { kind, title } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerRight: () => (
        <View style={s.actions}>
          <Pressable style={s.action} onPress={() => void Linking.openURL(helpUrl(kind)).catch((e: Error) => toast(e.message))}>
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
