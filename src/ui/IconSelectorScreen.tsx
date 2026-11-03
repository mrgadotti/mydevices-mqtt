import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActionIcons } from './ActionIcons';
import { S, U } from '../i18n';
import { Icon, ICON_ORDER } from './icons/Icon';
import { deliverPick, type RootStackParamList } from './navigation';
import { useColors } from './colors';

type Props = NativeStackScreenProps<RootStackParamList, 'IconSelector'>;

/** IconSelectorActivity: a 2-column grid of the available icons. */
export function IconSelectorScreen({ navigation }: Props) {
  const c = useColors();
  useLayoutEffect(() => {
    navigation.setOptions({
      title: S.app_name,
      headerLeft: () => <ActionIcons items={[{ icon: 'arrow_back', label: U.back, onPress: () => navigation.goBack() }]} />,
    });
  }, [navigation]);
  return (
    <FlatList
      style={[s.list, { backgroundColor: c.windowBackground }]}
      contentContainerStyle={{ padding: 16 }}
      data={ICON_ORDER}
      keyExtractor={(n) => n}
      numColumns={2}
      initialNumToRender={24}
      renderItem={({ item }) => (
        <Pressable
          style={s.cell}
          onPress={() => {
            deliverPick(item);
            navigation.goBack();
          }}
        >
          <View style={s.icon}>
            <Icon name={item} size={65} color={c.icon} />
          </View>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  list: { flex: 1 },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 75, height: 75, alignItems: 'center', justifyContent: 'center' },
});
