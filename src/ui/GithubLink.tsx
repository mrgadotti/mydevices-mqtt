import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { U } from '../i18n';
import { useColors } from './colors';
import { useToast } from './toast';

export const GITHUB_URL = 'https://github.com/mrgadotti/mydevices-mqtt';

/** The project's GitHub page: a label and the tappable address. */
export function GithubLink({ center }: { center?: boolean }) {
  const c = useColors();
  const toast = useToast();
  const align = center ? ('center' as const) : ('left' as const);
  return (
    <View style={s.box}>
      <Text style={[s.label, { color: c.textSecondary, textAlign: align }]}>{U.github_source}</Text>
      <Text style={[s.link, { color: c.accent, textAlign: align }]} onPress={() => void Linking.openURL(GITHUB_URL).catch((e: Error) => toast(e.message))}>
        {GITHUB_URL}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { marginTop: 16 },
  label: { fontSize: 14 },
  link: { fontSize: 16, textDecorationLine: 'underline', paddingVertical: 4 },
});
