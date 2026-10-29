import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Broker } from '../domain/types';
import { ActionIcons } from './ActionIcons';
import type { RootStackParamList } from './navigation';
import { S, U } from '../i18n';
import { appStore, useApp } from './store';
import { useColors } from './colors';
import { Icon } from './icons/Icon';
import { type } from './skin';
import { useSkin } from './useSkin';
import { useToast } from './toast';
import { Reorderable } from './Reorderable';
import { Dialog } from './widgets';

type Props = NativeStackScreenProps<RootStackParamList, 'Brokers'>;

/** Connects to the broker marked as default only once per launch, like App.connectToDefaultConnection. */
let autoConnectPending = true;
export const cancelAutoConnect = (): void => {
  autoConnectPending = false;
};

export function BrokersListScreen({ navigation }: Props) {
  const c = useColors();
  const skin = useSkin();
  const brokers = useApp((s) => s.brokers);
  const ready = useApp((s) => s.ready);
  const toast = useToast();
  const [rearranging, setRearranging] = useState(false);
  const [menuFor, setMenuFor] = useState<Broker | null>(null);
  const [deleting, setDeleting] = useState<Broker | null>(null);
  const [about, setAbout] = useState(false);

  useEffect(() => {
    if (!ready || !autoConnectPending) return;
    autoConnectPending = false;
    const def = brokers.find((b) => b.autoConnect);
    if (def) navigation.navigate('Dashboard', { brokerId: def.id });
  }, [ready, brokers, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: S.app_name,
      headerRight: () => (
        <ActionIcons
          items={[
            { icon: 'gear', label: U.settings, onPress: () => navigation.navigate('Settings') },
            { icon: 'about', label: S.action_about, onPress: () => setAbout(true) },
            {
              icon: rearranging ? 'check' : 'move',
              active: rearranging,
              label: S.action_rearrange,
              onPress: () => {
                const next = !rearranging;
                setRearranging(next);
                if (next) toast(S.you_can_now_rearrange_brokers);
              },
            },
            { icon: 'plus', label: S.action_add, onPress: () => navigation.navigate('BrokerForm', {}) },
          ]}
        />
      ),
    });
  }, [navigation, rearranging, toast]);

  const card = (b: Broker) => (
    <Pressable
      onPress={() => navigation.navigate('Dashboard', { brokerId: b.id })}
      onLongPress={() => setMenuFor(b)}
      style={({ pressed }) => [s.card, { backgroundColor: pressed ? skin.divider2 : skin.surface, borderColor: skin.stroke4 }]}
    >
      <Text numberOfLines={2} style={[type.headline4, s.cardTitle, { color: skin.text9 }]}>
        {b.name}
      </Text>
      <Text numberOfLines={1} style={[type.body3, { color: skin.text8 }]}>
        {b.address}
      </Text>
      {b.autoConnect ? (
        <View style={[s.chip, { backgroundColor: skin.divider2, borderColor: skin.stroke3 }]}>
          <Text style={[type.subtitle3, { color: skin.text9 }]}>{U.default_badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <View style={[s.screen, { backgroundColor: skin.listBackground }]}>
      {ready && brokers.length === 0 ? (
        <View style={s.empty}>
          <Icon name="cube" size={44} color={skin.primary} />
          <Text style={[type.headline2, s.emptyTitle, { color: skin.text9 }]}>{U.no_devices_yet}</Text>
          <Text style={[type.body2, s.emptyText, { color: skin.text9 }]}>{U.add_broker_hint}</Text>
          <Pressable style={[s.primaryButton, { backgroundColor: skin.primary }]} onPress={() => navigation.navigate('BrokerForm', {})}>
            <Icon name="plus" size={16} color={skin.onPrimary} />
            <Text style={[type.subtitle1, { color: skin.onPrimary, marginLeft: 8 }]}>{U.add_new_broker}</Text>
          </Pressable>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={s.list}>
        {rearranging ? (
          <Reorderable
            data={brokers}
            keyOf={(b) => b.id}
            enabled
            onMove={(from, to) => appStore.getState().moveBroker(from, to)}
            renderItem={(b) => <View style={{ margin: 8 }}>{card(b)}</View>}
          />
        ) : (
          <View style={s.grid}>
            {brokers.map((b) => (
              <View key={b.id} style={s.cell}>
                {card(b)}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {menuFor ? (
        <Dialog onClose={() => setMenuFor(null)}>
          {[
            { title: S.edit, run: () => navigation.navigate('BrokerForm', { brokerId: menuFor.id }) },
            { title: S.delete_dotted, run: () => setDeleting(menuFor) },
          ].map((item) => (
            <Pressable
              key={item.title}
              style={s.menuItem}
              android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
              onPress={() => {
                setMenuFor(null);
                item.run();
              }}
            >
              <Text style={[s.menuText, { color: c.textPrimary }]}>{item.title}</Text>
            </Pressable>
          ))}
        </Dialog>
      ) : null}

      {deleting ? (
        <Dialog
          message={S.delete_broker_ask}
          onClose={() => setDeleting(null)}
          buttons={[{ title: U.no }, { title: U.yes, onPress: () => appStore.getState().removeBroker(deleting.id) }]}
        />
      ) : null}

      {about ? (
        <Dialog title={S.about} onClose={() => setAbout(false)}>
          <AboutBody />
        </Dialog>
      ) : null}
    </View>
  );
}

function AboutBody() {
  const c = useColors();
  const small = (t: string) => (
    <Text key={t} style={[s.aboutSmall, { color: c.textSecondary }]}>
      {t}
    </Text>
  );
  return (
    <ScrollView style={{ maxHeight: 420 }}>
      <Text style={[s.aboutLarge, { color: c.textPrimary }]}>{S.mqtt_dash}</Text>
      {small('MQTT client and dashboard for Android')}
      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <Image source={require('../../assets/icon.png')} style={{ width: 50, height: 50 }} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', padding: 8 },
  card: { borderRadius: 8, borderWidth: 1, padding: 16, minHeight: 110 },
  cardTitle: { height: 44, marginBottom: 8 },
  chip: { alignSelf: 'flex-start', marginTop: 8, minHeight: 24, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 120 },
  emptyTitle: { marginTop: 40, textAlign: 'center' },
  emptyText: { marginTop: 8, textAlign: 'center' },
  primaryButton: { marginTop: 40, minHeight: 48, paddingHorizontal: 32, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  menuItem: { paddingVertical: 14 },
  menuText: { fontSize: 18 },
  aboutLarge: { fontSize: 22, textAlign: 'center', marginTop: 8 },
  aboutSmall: { fontSize: 14, textAlign: 'center' },
});
