import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Linking, Text } from 'react-native';
import { newBroker } from '../domain/defaults';
import type { Broker, TileWidth } from '../domain/types';
import { ActionIcons } from './ActionIcons';
import type { RootStackParamList } from './navigation';
import { S, U } from '../i18n';
import { ConfirmDialog } from './dialogs';
import { localBroker } from '../localBroker/LocalBroker';
import type { LocalBrokerNetworkInfo } from '../localBroker/LocalBroker';
import { appStore } from './store';
import { Check, Field, FlatButton, FormScroll, Hint, Label, Radio } from './widgets';

type Props = NativeStackScreenProps<RootStackParamList, 'BrokerForm'>;

const toLong = (text: string): number => {
  const n = parseInt(text, 10);
  return Number.isFinite(n) ? n : 0;
};

/** BrokerSettingsActivity. */
export function BrokerFormScreen({ navigation, route }: Props) {
  const [initial] = useState<Broker>(() => {
    const existing = route.params.brokerId ? appStore.getState().brokers.find((b) => b.id === route.params.brokerId) : undefined;
    return existing ?? newBroker();
  });
  const isNew = !route.params.brokerId;
  const [autoConnect, setAutoConnect] = useState(initial.autoConnect);
  const [replaceDefault, setReplaceDefault] = useState<Broker | null>(null);
  const [keepScreenOn, setKeepScreenOn] = useState(initial.keepScreenOn);
  const [metricsEditable, setMetricsEditable] = useState(initial.metricsEditable);
  const [neverHide, setNeverHide] = useState(initial.neverHideBrokerName);
  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [port, setPort] = useState(initial.port);
  const [ssl, setSsl] = useState(initial.ssl);
  const [trust, setTrust] = useState(initial.trust);
  const [user, setUser] = useState(initial.user);
  const [password, setPassword] = useState(initial.password);
  const [clientId, setClientId] = useState(initial.clientId);
  const [tile, setTile] = useState<TileWidth>(initial.tileWidth);
  const [colsV, setColsV] = useState(String(initial.colsCount));
  const [colsH, setColsH] = useState(String(initial.colsCountHorizontal));
  const [local, setLocal] = useState(initial.localBroker);
  const [confirmLocal, setConfirmLocal] = useState(false);
  const [net, setNet] = useState<LocalBrokerNetworkInfo>(() => localBroker.getNetworkInfo());
  /** Connection fields as they were before "Local broker" was ticked, to restore on untick. */
  const saved = useRef<{ address: string; port: string; user: string; password: string; ssl: boolean; trust: boolean } | null>(null);

  useFocusEffect(useCallback(() => setNet(localBroker.getNetworkInfo()), []));

  const applyLocal = () => {
    saved.current = { address, port, user, password, ssl, trust };
    setLocal(true);
    setAddress('localhost');
    setPort('1883');
    setUser('');
    setPassword('');
    setSsl(false);
    setTrust(false);
  };
  const onLocalToggle = (on: boolean) => {
    if (on) {
      setNet(localBroker.getNetworkInfo());
      setConfirmLocal(true);
      return;
    }
    const prev = saved.current;
    setLocal(false);
    // Nothing worth restoring when the broker was already local on open: start from a blank address.
    setAddress(prev?.address ?? '');
    setPort(prev?.port ?? '1883');
    setUser(prev?.user ?? '');
    setPassword(prev?.password ?? '');
    setSsl(prev?.ssl ?? false);
    setTrust(prev?.trust ?? false);
  };

  useLayoutEffect(() => {
    const save = () => {
      const broker: Broker = {
        ...initial,
        name,
        address,
        port,
        user,
        password,
        clientId,
        colsCount: toLong(colsV),
        colsCountHorizontal: toLong(colsH),
        autoConnect,
        metricsEditable,
        neverHideBrokerName: neverHide,
        keepScreenOn,
        tileWidth: tile,
        ssl,
        trust,
        localBroker: local,
      };
      if (isNew) appStore.getState().addBroker(broker);
      else appStore.getState().updateBroker(broker);
      navigation.goBack();
    };
    navigation.setOptions({
      title: S.app_name,
      headerRight: () => <ActionIcons items={[{ icon: 'menu_save', label: S.action_save, onPress: save }]} />,
    });
  });

  /** Only one broker can be the default: ask before taking the flag from another one. */
  const onDefaultToggle = (on: boolean) => {
    const other = on ? appStore.getState().brokers.find((b) => b.autoConnect && b.id !== initial.id) : undefined;
    if (other) setReplaceDefault(other);
    else setAutoConnect(on);
  };

  return (
    <FormScroll>
      {replaceDefault ? (
        <ConfirmDialog
          message={U.replace_default_ask.replace('{name}', replaceDefault.name)}
          onYes={() => {
            setAutoConnect(true);
            setReplaceDefault(null);
          }}
          onClose={() => setReplaceDefault(null)}
        />
      ) : null}
      {confirmLocal ? (
        <ConfirmDialog
          message={U.local_broker_warning.replace('{address}', `${net.ips[0] ?? U.local_broker_no_wifi}:1883`)}
          onYes={() => {
            setConfirmLocal(false);
            applyLocal();
          }}
          onClose={() => setConfirmLocal(false)}
        />
      ) : null}
      <Check checked={autoConnect} onChange={onDefaultToggle}>{S.default_auto_connect}</Check>
      <Check checked={keepScreenOn} onChange={setKeepScreenOn}>{S.keep_screen_on_when_connected}</Check>
      <Check checked={metricsEditable} onChange={setMetricsEditable}>{S.allow_metrics_management_description}</Check>
      {!metricsEditable ? <Check checked={neverHide} onChange={setNeverHide}>{S.never_hide_broker_name}</Check> : null}

      <Label top={10}>{S.name}</Label>
      <Field value={name} onChangeText={setName} />
      <Check checked={local} onChange={onLocalToggle} style={{ marginTop: 10 }}>{U.local_broker}</Check>
      {local ? (
        <>
          <Label top={10}>{U.local_broker_connect_to}</Label>
          <Hint>{net.ips.length > 0 ? net.ips.map((ip) => `${ip}:${port}`).join('\n') : U.local_broker_no_wifi}</Hint>
          <Hint>{net.alias ? `${net.alias}:${port}` : U.local_broker_no_alias}</Hint>
        </>
      ) : null}
      <Label>{S.address}</Label>
      <Field value={address} onChangeText={setAddress} disabled={local} />
      <Label>{S.port}</Label>
      <Field value={port} onChangeText={setPort} keyboardType="decimal-pad" disabled={local} />
      <Check checked={ssl} onChange={setSsl} disabled={local} style={{ marginBottom: 10 }}>{S.enable_ssl_tls}</Check>
      {ssl ? <Check checked={trust} onChange={setTrust} disabled={local}>{S.trust_certificate}</Check> : null}

      <Label top={10}>{S.user_name}</Label>
      <Field value={user} onChangeText={setUser} disabled={local} />
      <Label>{S.user_password}</Label>
      <Field value={password} onChangeText={setPassword} secure disabled={local} />
      {local ? (
        <>
          <Hint>{U.local_broker_battery_hint}</Hint>
          <FlatButton title={U.local_broker_battery_button} onPress={() => void Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => {})} />
        </>
      ) : null}
      <Label>{S.client_id}</Label>
      <Field value={clientId} onChangeText={setClientId} />

      <Label>{S.tile_size}</Label>
      <Radio selected={tile === -1} onPress={() => setTile(-1)}>{S.small}</Radio>
      <Radio selected={tile === 0} onPress={() => setTile(0)}>{S.medium}</Radio>
      <Radio selected={tile === 1} onPress={() => setTile(1)}>{S.large}</Radio>

      <Label top={10}>{S.metrics_columns_count_vert}</Label>
      <Field value={colsV} onChangeText={setColsV} keyboardType="number-pad" center width={50} />
      <Label>{S.metrics_columns_count_horz}</Label>
      <Field value={colsH} onChangeText={setColsH} keyboardType="number-pad" center width={50} />
      <Text />
    </FormScroll>
  );
}
