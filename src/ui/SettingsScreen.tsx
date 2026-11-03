import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { LANGS, U, updateSettings, useSettings } from '../i18n';
import type { ParsedBackup } from '../domain/backup';
import { ActionIcons } from './ActionIcons';
import { ConfirmDialog } from './dialogs';
import { exportConfiguration, exportHistory } from './exportData';
import { GithubLink } from './GithubLink';
import { applyConfiguration, pickConfiguration } from './importData';
import type { RootStackParamList } from './navigation';
import { useToast } from './toast';
import { FlatButton, FormScroll, Label, Radio } from './widgets';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

/** App preferences: language and theme. They apply at once and are remembered between launches. */
export function SettingsScreen({ navigation }: Props) {
  const settings = useSettings();
  const { language, theme } = settings;
  const toast = useToast();
  const run = (job: () => Promise<boolean | void>) => () =>
    job().then(
      (ok) => {
        if (ok === false) toast(U.export_no_history);
      },
      () => toast(U.export_failed),
    );

  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const pickImport = () =>
    pickConfiguration().then(
      (r) => {
        if (r.status === 'ok') setPending(r);
        else if (r.status === 'error') toast(r.error === 'not_backup' || r.error === 'invalid_json' ? U.import_invalid : r.error === 'unsupported_version' ? U.import_unsupported : U.import_failed);
      },
      () => toast(U.import_failed),
    );
  const confirmImport = (backup: ParsedBackup) => {
    setPending(null);
    applyConfiguration(backup, settings).then(
      () => toast(U.import_done),
      () => toast(U.import_failed),
    );
  };
  const countWidgets = (b: ParsedBackup) => Object.values(b.metricsByBroker).reduce((n, l) => n + l.length, 0);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: U.settings,
      headerLeft: () => <ActionIcons items={[{ icon: 'arrow_back', label: U.back, onPress: () => navigation.goBack() }]} />,
    });
  }, [navigation, language]);

  return (
    <FormScroll>
      {pending ? (
        <ConfirmDialog
          message={U.import_ask.replace('{brokers}', String(pending.brokers.length)).replace('{widgets}', String(countWidgets(pending)))}
          onYes={() => confirmImport(pending)}
          onClose={() => setPending(null)}
        />
      ) : null}
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
      <Label top={16}>{U.export_section}</Label>
      <FlatButton title={U.export_config} onPress={run(() => exportConfiguration(settings))} />
      <FlatButton title={U.export_history} onPress={run(exportHistory)} />
      <FlatButton title={U.import_config} onPress={pickImport} />
      <GithubLink />
    </FormScroll>
  );
}
