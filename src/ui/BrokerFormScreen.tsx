import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { Text } from 'react-native';
import { newBroker } from '../domain/defaults';
import type { Broker, TileWidth } from '../domain/types';
import { ActionIcons } from './ActionIcons';
import type { RootStackParamList } from './navigation';
import { S } from '../i18n';
import { appStore } from './store';
import { Check, Field, FormScroll, Label, Radio } from './widgets';

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

  return (
    <FormScroll>
      <Check checked={autoConnect} onChange={setAutoConnect}>{S.default_auto_connect}</Check>
      <Check checked={keepScreenOn} onChange={setKeepScreenOn}>{S.keep_screen_on_when_connected}</Check>
      <Check checked={metricsEditable} onChange={setMetricsEditable}>{S.allow_metrics_management_description}</Check>
      {!metricsEditable ? <Check checked={neverHide} onChange={setNeverHide}>{S.never_hide_broker_name}</Check> : null}

      <Label top={10}>{S.name}</Label>
      <Field value={name} onChangeText={setName} />
      <Label>{S.address}</Label>
      <Field value={address} onChangeText={setAddress} />
      <Label>{S.port}</Label>
      <Field value={port} onChangeText={setPort} keyboardType="decimal-pad" />
      <Check checked={ssl} onChange={setSsl} style={{ marginBottom: 10 }}>{S.enable_ssl_tls}</Check>
      {ssl ? <Check checked={trust} onChange={setTrust}>{S.trust_certificate}</Check> : null}

      <Label top={10}>{S.user_name}</Label>
      <Field value={user} onChangeText={setUser} />
      <Label>{S.user_password}</Label>
      <Field value={password} onChangeText={setPassword} secure />
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
