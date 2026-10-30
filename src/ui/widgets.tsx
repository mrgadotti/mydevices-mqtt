import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type KeyboardTypeOptions,
  type TextInputInstance,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { type, type Skin } from './skin';
import { useSkin } from './useSkin';

/** Form controls and dialogs of the widget UI: text fields, check/radio rows, text buttons, alert dialog, toast. */

/** Scrolling form. The window resizes with the keyboard (adjustResize), so Android scrolls the focused field into view. */
export function FormScroll({ children }: { children: React.ReactNode }) {
  const { s } = useStyles();
  return (
    <ScrollView style={s.fill} keyboardShouldPersistTaps="handled">
      <View style={s.form}>{children}</View>
    </ScrollView>
  );
}

/** Small label above a field. */
export function Label({ children, top, style }: { children: React.ReactNode; top?: number; style?: StyleProp<TextStyle> }) {
  const { s } = useStyles();
  return <Text style={[s.label, top ? { marginTop: top } : null, style]}>{children}</Text>;
}

/** Description at the top of the widget forms. */
export function Description({ children }: { children: React.ReactNode }) {
  const { s } = useStyles();
  return <Text style={s.description}>{children}</Text>;
}

export function Hint({ children }: { children: React.ReactNode }) {
  const { s } = useStyles();
  return <Text style={s.hint}>{children}</Text>;
}

interface FieldProps {
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: KeyboardTypeOptions;
  secure?: boolean;
  maxLength?: number;
  center?: boolean;
  width?: number;
  multiline?: boolean;
  autoFocus?: boolean;
  /** Read-only and greyed out. */
  disabled?: boolean;
}

export function Field({ value, onChangeText, keyboardType, secure, maxLength, center, width, multiline, autoFocus, disabled }: FieldProps) {
  const { s, skin } = useStyles();
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInputInstance>(null);
  // autoFocus inside a Modal does not raise the keyboard on Android, so focus explicitly once the window is up.
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => input.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [autoFocus]);
  return (
    <TextInput
      ref={input}
      value={value}
      onChangeText={onChangeText}
      editable={!disabled}
      // Topics, payloads, URLs and scripts must not be "corrected": this keyboard type switches suggestions off on Android.
      keyboardType={keyboardType ?? (secure ? undefined : 'visible-password')}
      secureTextEntry={secure}
      maxLength={maxLength}
      multiline={multiline}
      autoCapitalize="none"
      autoCorrect={false}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      underlineColorAndroid="transparent"
      cursorColor={skin.brand}
      selectionColor={skin.brand}
      placeholderTextColor={skin.text6}
      style={[
        s.field,
        { borderColor: focused ? skin.brand : skin.stroke3 },
        center ? { textAlign: 'center' } : null,
        width ? { width } : null,
        disabled ? { opacity: 0.45 } : null,
      ]}
    />
  );
}

/** Checkbox: 22 dp box, brand fill when checked. */
export function Check({ checked, onChange, children, style, disabled }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const { s } = useStyles();
  return (
    <Pressable disabled={disabled} onPress={() => onChange(!checked)} style={[s.row, disabled ? { opacity: 0.45 } : null, style]} android_ripple={{ color: 'rgba(36,196,142,0.2)' }}>
      <View style={[s.box, checked ? s.boxOn : null]}>{checked ? <View style={s.tick} /> : null}</View>
      <Text style={s.rowText}>{children}</Text>
    </Pressable>
  );
}

/** Radio button. */
export function Radio({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: React.ReactNode }) {
  const { s } = useStyles();
  return (
    <Pressable onPress={onPress} style={s.row} android_ripple={{ color: 'rgba(36,196,142,0.2)' }}>
      <View style={[s.radio, selected ? s.radioOn : null]}>{selected ? <View style={s.radioDot} /> : null}</View>
      <Text style={s.rowText}>{children}</Text>
    </Pressable>
  );
}

export function FlatButton({ title, onPress, style }: { title: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { s } = useStyles();
  return (
    <Pressable onPress={onPress} style={[s.button, style]} android_ripple={{ color: 'rgba(36,196,142,0.2)' }}>
      <Text style={s.buttonText}>{title.toUpperCase()}</Text>
    </Pressable>
  );
}

export interface DialogButton {
  title: string;
  onPress?: () => void;
}

/** Alert dialog: surface card, Headline2 title, ALL CAPS text buttons. */
export function Dialog({ title, message, children, buttons, onClose, list }: { title?: string; message?: string; children?: React.ReactNode; buttons?: DialogButton[]; onClose: () => void; list?: boolean }) {
  const { s } = useStyles();
  const { height } = useWindowDimensions();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[s.scrim, list ? s.scrimList : null, { paddingBottom: list ? 25 : 16 }]} onPress={onClose}>
        <Pressable style={[s.dialog, list ? s.dialogList : null, { maxHeight: height - 48 }]} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {title ? <Text style={[s.dialogTitle, list ? s.dialogTitleList : null]}>{title}</Text> : null}
            {message ? <Text style={s.dialogMessage}>{message}</Text> : null}
            {children}
            {buttons && buttons.length > 0 ? (
              <View style={s.dialogButtons}>
                {buttons.map((b) => (
                  <FlatButton
                    key={b.title}
                    title={b.title}
                    onPress={() => {
                      onClose();
                      b.onPress?.();
                    }}
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Android Toast look-alike. */
export function Toast({ message }: { message: string | null }) {
  const { s } = useStyles();
  if (!message) return null;
  return (
    <View pointerEvents="none" style={s.toastWrap}>
      <View style={s.toast}>
        <Text style={s.toastText}>{message}</Text>
      </View>
    </View>
  );
}

export function ColorSurface({ color, onPress, style }: { color: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { s } = useStyles();
  return <Pressable onPress={onPress} style={[s.surface, { backgroundColor: color }, style]} />;
}

const makeStyles = (k: Skin) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: k.listBackground },
    form: { padding: 16, paddingBottom: 48 },
    label: { ...type.body3, color: k.text8, marginTop: 12, marginBottom: 4 },
    description: { ...type.body2, color: k.text8, marginBottom: 10 },
    hint: { ...type.body3, color: k.text8, marginTop: 8 },
    field: { ...type.body1, color: k.text9, backgroundColor: k.divider2, borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, minHeight: 48 },
    row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, minHeight: 48 },
    rowText: { ...type.body1, flex: 1, color: k.text9, paddingLeft: 12, paddingTop: 0 },
    box: { width: 22, height: 22, borderWidth: 2, borderColor: k.text6, borderRadius: 4, marginTop: 0, alignItems: 'center', justifyContent: 'center' },
    boxOn: { backgroundColor: k.brand, borderColor: k.brand },
    tick: { width: 6, height: 11, borderRightWidth: 2, borderBottomWidth: 2, borderColor: k.onBrand, transform: [{ rotate: '45deg' }, { translateY: -1 }] },
    radio: { width: 22, height: 22, borderWidth: 2, borderColor: k.text6, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: k.brand },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: k.brand },
    button: { minHeight: 36, minWidth: 64, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    buttonText: { ...type.subtitle1, color: k.primary },
    scrim: { flex: 1, backgroundColor: k.scheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(3,3,10,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    dialog: { width: '100%', maxWidth: 560, backgroundColor: k.surface, borderRadius: 8, padding: 24, elevation: 24 },
    scrimList: { padding: 25 },
    dialogList: { padding: 0, paddingTop: 18, paddingBottom: 8, maxWidth: 620 },
    dialogTitleList: { paddingHorizontal: 24, marginBottom: 6 },
    dialogTitle: { ...type.headline2, color: k.text9, marginBottom: 16 },
    dialogMessage: { ...type.body1, color: k.text9, marginBottom: 12 },
    dialogButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, marginRight: -8 },
    toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 64, alignItems: 'center' },
    toast: { backgroundColor: k.text9, borderRadius: 8, borderWidth: 1, borderColor: k.stroke3, paddingHorizontal: 20, paddingVertical: 12, maxWidth: '85%' },
    toastText: { ...type.body2, color: k.surface },
    surface: { height: 48, marginVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: k.stroke4 },
  });

/** Styles of the current skin (rebuilt only when the theme changes). */
function useStyles() {
  const skin = useSkin();
  return { s: useMemo(() => makeStyles(skin), [skin]), skin };
}
