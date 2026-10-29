import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect } from 'react';
import { LANGS, U, updateSettings, useSettings } from '../i18n';
import type { RootStackParamList } from './navigation';
import { FormScroll, Label, Radio } from './widgets';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

/** App preferences: language and theme. They apply at once and are remembered between launches. */
export function SettingsScreen({ navigation }: Props) {
  const { language, theme } = useSettings();

  useLayoutEffect(() => {
    navigation.setOptions({ title: U.settings });
  }, [navigation, language]);

  return (
    <FormScroll>
      <Label>{U.language}</Label>
      <Radio selected={language === 'system'} onPress={() => updateSettings({ language: 'system' })}>
        {U.system_default}
      </Radio>
      {LANGS.map((l) => (
        <Radio key={l.code} selected={language === l.code} onPress={() => updateSettings({ language: l.code })}>
          {l.name}
        </Radio>
      ))}
      <Label top={16}>{U.theme}</Label>
      <Radio selected={theme === 'system'} onPress={() => updateSettings({ theme: 'system' })}>
        {U.system_default}
      </Radio>
      <Radio selected={theme === 'dark'} onPress={() => updateSettings({ theme: 'dark' })}>
        {U.theme_dark}
      </Radio>
      <Radio selected={theme === 'light'} onPress={() => updateSettings({ theme: 'light' })}>
        {U.theme_light}
      </Radio>
    </FormScroll>
  );
}
