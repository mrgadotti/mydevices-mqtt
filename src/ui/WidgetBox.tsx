import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WIDGET_ORDER, WIDGET_SPECS, type WidgetGroup, type WidgetKind } from '../domain/widgets';
import { Icon } from './icons/Icon';
import { type, type Skin } from './skin';
import { U, tl } from '../i18n';

const GLYPH: Record<WidgetKind, string> = {
  button: 'touch',
  styledButton: 'square',
  iconButton: 'power',
  switch: 'switch',
  slider: 'line',
  verticalSlider: 'align_bottom',
  stepSlider: 'step',
  verticalStepSlider: 'wave',
  stepH: 'arrow_right',
  stepV: 'arrow_up',
  levelSlider: 'layers',
  joystick: 'navigation',
  rgb: 'sun',
  color: 'drop',
  value: 'stream',
  labeled: 'tag',
  gauge: 'gauge',
  radialGauge: 'radar',
  enhancedGauge: 'gauge',
  led: 'circle',
  lcd: 'laptop',
  level: 'bars',
  levelV: 'bars',
  chart: 'chart_line',
  terminal: 'console',
  log: 'notes',
  image: 'picture',
  icon: 'lamp',
  segmented: 'list',
  menu: 'menu',
  textInput: 'keyboard',
  numericInput: 'edit',
  timeInput: 'clock',
  text: 'text',
  spacer: 'expand',
  notification: 'bell',
};

const GROUPS: WidgetGroup[] = ['Controllers', 'Displays', 'Interface', 'Other'];

const tint = (g: WidgetGroup, skin: Skin) => (g === 'Controllers' ? skin.brand : g === 'Displays' ? skin.primary : g === 'Interface' ? '#01B8F7' : skin.warning);

export const widgetGlyph = (k: WidgetKind): string => GLYPH[k];

/** The "Widget Box" bottom sheet: widgets grouped as Controllers, Displays, Interface and Other. */
export function WidgetBox({ skin, onPick, onClose }: { skin: Skin; onPick: (k: WidgetKind) => void; onClose: () => void }) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[s.scrim, { backgroundColor: skin.scheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(3,3,10,0.45)' }]} onPress={onClose}>
        <Pressable style={[s.sheet, { backgroundColor: skin.surface }]} onPress={() => {}}>
          <View style={[s.handle, { backgroundColor: skin.stroke4 }]} />
          <Text style={[type.headline2, s.title, { color: skin.text9 }]}>{U.widget_box}</Text>
          <ScrollView contentContainerStyle={s.listPad}>
            <View style={[s.list, { backgroundColor: skin.surface, borderColor: skin.divider2 }]}>
              {GROUPS.map((g) => {
                const kinds = WIDGET_ORDER.filter((k) => WIDGET_SPECS[k].group === g);
                if (kinds.length === 0) return null;
                return (
                  <View key={g}>
                    <View style={[s.sep, { backgroundColor: skin.stroke3 }]} />
                    <Text style={[type.body3, s.header, { color: skin.text6 }]}>{tl(`group_${g}`, g)}</Text>
                    {kinds.map((k) => (
                      <Pressable
                        key={k}
                        onPress={() => {
                          onClose();
                          onPick(k);
                        }}
                        style={({ pressed }) => [s.row, pressed ? { backgroundColor: skin.divider2 } : null]}
                      >
                        <View style={[s.iconBox, { backgroundColor: skin.surface, borderColor: skin.stroke4 }]}>
                          <Icon name={widgetGlyph(k)} size={24} color={tint(g, skin)} />
                        </View>
                        <Text numberOfLines={2} style={[type.body1, s.rowTitle, { color: skin.text8 }]}>
                          {tl(`w_${k}`, WIDGET_SPECS[k].title)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingTop: 16 },
  handle: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, marginBottom: 8 },
  title: { marginTop: 16, marginHorizontal: 24 },
  listPad: { padding: 8, paddingBottom: 34 },
  list: { borderRadius: 8, borderWidth: 1, paddingTop: 8, overflow: 'hidden' },
  sep: { height: 1, marginHorizontal: 8 },
  header: { paddingTop: 12, paddingBottom: 24, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, padding: 8, borderRadius: 8 },
  iconBox: { width: 48, height: 48, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, marginLeft: 8, marginRight: 12 },
});
