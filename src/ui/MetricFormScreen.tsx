import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { cssColor } from '../domain/android';
import { newMetric } from '../domain/defaults';
import type { ImageKind, Metric, MultiSwitchItem, TextSize } from '../domain/types';
import { ActionIcons } from './ActionIcons';
import { AlertMessage, ConfirmDialog, SpectrumDialog } from './dialogs';
import { Icon } from './icons/Icon';
import { widgetKindOf } from '../domain/widgets';
import { OPTION_FIELDS } from './widgets/optionFields';
import { setPickHandler, setScriptDraft, type RootStackParamList } from './navigation';
import { appStore } from './store';
import { S, U, X, tl } from '../i18n';
import { useColors } from './colors';
import { Check, ColorSurface, Description, Dialog, Field, FlatButton, FormScroll, Label, Radio } from './widgets';

type Props = NativeStackScreenProps<RootStackParamList, 'MetricForm'>;

/** Java's Double.toString for the values shown in the form ("100.0", "0.0"). */
const javaDouble = (n: number): string => (Number.isInteger(n) ? n.toFixed(1) : String(n));
const floatOr = (text: string, fallback: number): number => {
  const n = parseFloat(text);
  return Number.isFinite(n) ? n : fallback;
};
const intOr = (text: string, fallback: number): number => {
  const n = parseInt(text, 10);
  return Number.isFinite(n) ? n : fallback;
};

/** Read when rendering so the text follows the active language. */
const description = (type: number): string =>
  [
    '',
    S.text_metric_description,
    S.switch_metric_description,
    S.range_metric_description,
    S.multi_switch_metric_description,
    S.image_metric_description,
    S.color_metric_description,
    X.notification_metric_description,
  ][type] ?? '';

type ColorTarget = 'text' | 'progress' | 'on' | 'off';

/** The six Metric*SettingsActivity screens, sharing the MQTT sections the original repeats in each layout. */
export function MetricFormScreen({ navigation, route }: Props) {
  const c = useColors();
  const { brokerId, type, metricId, preset } = route.params;
  const [initial] = useState<Metric>(() => {
    const found = metricId ? (appStore.getState().metrics[brokerId] ?? []).find((m) => m.id === metricId) : undefined;
    return found ?? newMetric(type, preset);
  });
  const [m, setM] = useState<Metric>(initial);
  const patch = (p: Partial<Metric>) => setM((cur) => ({ ...cur, ...p }) as Metric);
  const [timeout, setTimeoutText] = useState(String(initial.intermediateStateTimeout));
  const [minText, setMinText] = useState(initial.type === 3 ? javaDouble(initial.minValue) : '');
  const [maxText, setMaxText] = useState(initial.type === 3 ? javaDouble(initial.maxValue) : '');
  const [precision, setPrecision] = useState(initial.type === 3 ? String(initial.decimalPrecision) : '');
  const [reload, setReload] = useState(initial.type === 5 ? String(initial.reloadInterval) : '');
  const [colorFor, setColorFor] = useState<ColorTarget | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [optionEdit, setOptionEdit] = useState<{ index: number; item: MultiSwitchItem } | null>(null);
  const [optionMenu, setOptionMenu] = useState<number | null>(null);
  const [optionDelete, setOptionDelete] = useState<number | null>(null);
  const draft = useRef(m);
  draft.current = m;

  const buildFinal = (): Metric => {
    let f: Metric = { ...m, intermediateStateTimeout: intOr(timeout, 0), jsonPath: m.jsonPath.trim(), jsBlinkExpression: m.jsBlinkExpression.trim() };
    if (f.jsonPath.length === 0) f = { ...f, lastJsonPathValue: null };
    if (f.type === 3) f = { ...f, minValue: floatOr(minText, 0), maxValue: floatOr(maxText, 100), decimalPrecision: intOr(precision, 0) };
    if (f.type === 5) f = { ...f, reloadInterval: intOr(reload, 5), openUrl: f.openUrl.trim() };
    return f;
  };

  useLayoutEffect(() => {
    const save = () => {
      const f = buildFinal();
      if (f.jsonPath.length > 0 && f.enablePub && (f.topicPub.length === 0 || f.topicPub === f.topic)) {
        setAlert(S.you_cant_use_same_topics_with_json_path);
        return;
      }
      if (metricId) appStore.getState().updateMetric(brokerId, f);
      else appStore.getState().addMetric(brokerId, f);
      navigation.goBack();
    };
    navigation.setOptions({
      title: S.app_name,
      headerRight: () => <ActionIcons items={[{ icon: 'menu_save', label: S.action_save, onPress: save }]} />,
    });
  });

  const pickIcon = (key: 'iconOn' | 'iconOff' | 'icon') => {
    setPickHandler((value) => patch({ [key]: value } as Partial<Metric>));
    navigation.navigate('IconSelector');
  };
  const editScript = (kind: 'receive' | 'display' | 'tap') => {
    const key = kind === 'receive' ? 'jsOnReceive' : kind === 'display' ? 'jsOnDisplay' : 'jsOnTap';
    setScriptDraft(draft.current[key]);
    setPickHandler((value) => patch({ [key]: value.trim() } as Partial<Metric>));
    navigation.navigate('JsEditor', { title: kind === 'receive' ? S.on_receive : kind === 'display' ? S.on_display : S.on_tap, kind, metricType: m.type });
  };

  const showMqttBasics = !(m.type === 5 && m.kind === 1);
  const showJsonPath = !(m.type === 5 && m.kind !== 2);
  const isImage = m.type === 5;
  const showPubSection = !isImage && m.type !== 7;
  const intermediateVisible = m.enablePub && !m.updateLastPayloadOnPub;

  const colorValue: Record<ColorTarget, number> = {
    text: m.type === 1 || m.type === 4 ? m.textColor : -1,
    progress: m.type === 3 ? m.progressColor : -1,
    on: m.type === 2 ? m.onColor : -1,
    off: m.type === 2 ? m.offColor : -1,
  };
  const setColor = (target: ColorTarget, argb: number) => {
    if (target === 'text') patch({ textColor: argb } as Partial<Metric>);
    if (target === 'progress') patch({ progressColor: argb } as Partial<Metric>);
    if (target === 'on') patch({ onColor: argb } as Partial<Metric>);
    if (target === 'off') patch({ offColor: argb } as Partial<Metric>);
  };

  const sizeRadios = (current: TextSize, set: (s: TextSize) => void) => (
    <>
      <Label top={6}>{S.main_text_size}</Label>
      <Radio selected={current === 'SMALL'} onPress={() => set('SMALL')}>{S.small}</Radio>
      <Radio selected={current === 'MEDIUM'} onPress={() => set('MEDIUM')}>{S.medium}</Radio>
      <Radio selected={current === 'LARGE'} onPress={() => set('LARGE')}>{S.large}</Radio>
    </>
  );

  return (
    <FormScroll>
      <Description>{description(m.type)}</Description>

      {m.type === 5 ? (
        <>
          <Radio selected={m.kind === 1} onPress={() => patch({ kind: 1 as ImageKind })}>{S.download_image_from_a_static_url}</Radio>
          <Radio selected={m.kind === 2} onPress={() => patch({ kind: 2 as ImageKind })}>{S.download_image_from_url_received_as_payload}</Radio>
          <Radio selected={m.kind === 3} onPress={() => patch({ kind: 3 as ImageKind })}>{S.image_file_data_received_as_binary_payload}</Radio>
        </>
      ) : null}

      <Label>{S.name}</Label>
      <Field value={m.name} onChangeText={(name) => patch({ name })} />

      {showMqttBasics ? (
        <>
          <Label>{S.topic_sub}</Label>
          <Field value={m.topic} onChangeText={(topic) => patch({ topic })} />
        </>
      ) : null}

      <WidgetOptions metric={m} patch={patch} />

      {showJsonPath ? (
        <>
          <Label>{S.json_path_if_payload_is_json}</Label>
          <Text style={[s.link, { color: c.accent }]} onPress={() => void Linking.openURL(S.json_path_help_link)}>{S.json_path_help_link}</Text>
          <Field value={m.jsonPath} onChangeText={(jsonPath) => patch({ jsonPath })} />
        </>
      ) : null}

      {m.type === 5 && m.kind === 1 ? (
        <>
          <Label>{S.image_url}</Label>
          <Field value={m.imageUrl} onChangeText={(imageUrl) => patch({ imageUrl })} keyboardType="url" />
        </>
      ) : null}
      {m.type === 5 && m.kind !== 3 ? (
        <>
          <Label>{S.refresh_interval_seconds}</Label>
          <Field value={reload} onChangeText={setReload} keyboardType="decimal-pad" center />
        </>
      ) : null}
      {m.type === 5 ? (
        <>
          <Label>{S.open_url_on_tap}</Label>
          <Field value={m.openUrl} onChangeText={(openUrl) => patch({ openUrl })} keyboardType="url" />
        </>
      ) : null}

      {showPubSection ? (
        <>
          <Check checked={m.enablePub} onChange={(enablePub) => patch({ enablePub })}>{S.enable_publishing}</Check>
          {m.enablePub ? (
            <>
              <Label top={10}>{S.topic_pub_keep_empty_if_the_same_as_sub}</Label>
              <Field value={m.topicPub} onChangeText={(topicPub) => patch({ topicPub })} />
              <Check checked={m.updateLastPayloadOnPub} onChange={(updateLastPayloadOnPub) => patch({ updateLastPayloadOnPub })}>
                {S.update_metric_on_publish_immediately_do_not_wait_for_incoming_message_to_update_visual_state}
              </Check>
            </>
          ) : null}
          {intermediateVisible ? (
            <>
              <Check
                checked={m.enableIntermediateState}
                onChange={(enableIntermediateState) => patch({ enableIntermediateState })}
                style={{ paddingVertical: 10 }}
              >
                {S.enable_intermediate_state_option}
              </Check>
              {m.enableIntermediateState ? (
                <>
                  <Label>{S.intermediate_state_timeout_option}</Label>
                  <Field value={timeout} onChangeText={setTimeoutText} keyboardType="number-pad" center />
                </>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {m.type === 1 ? (
        <>
          <View style={s.pair}>
            <View style={s.half}>
              <Label>{S.prefix}</Label>
              <Field value={m.prefix} onChangeText={(prefix) => patch({ prefix })} center maxLength={10} />
            </View>
            <View style={s.half}>
              <Label>{S.postfix}</Label>
              <Field value={m.postfix} onChangeText={(postfix) => patch({ postfix })} center maxLength={10} />
            </View>
          </View>
          {sizeRadios(m.mainTextSize, (mainTextSize) => patch({ mainTextSize }))}
          <Label top={6}>{S.main_text_color}</Label>
          <ColorSurface color={cssColor(colorValue.text)} onPress={() => setColorFor('text')} />
        </>
      ) : null}

      {m.type === 2 ? (
        <>
          <Label top={10}>{S.payload_and_icons}</Label>
          <View style={s.pair}>
            <View style={s.half}>
              <Label>{S.on}</Label>
              <Field value={m.payloadOn} onChangeText={(payloadOn) => patch({ payloadOn })} center />
              <Pressable onPress={() => pickIcon('iconOn')} style={s.iconBox}>
                <Icon name={m.iconOn} size={48} color={c.icon} />
              </Pressable>
              <ColorSurface color={cssColor(colorValue.on)} onPress={() => setColorFor('on')} />
            </View>
            <View style={s.half}>
              <Label>{S.off}</Label>
              <Field value={m.payloadOff} onChangeText={(payloadOff) => patch({ payloadOff })} center />
              <Pressable onPress={() => pickIcon('iconOff')} style={s.iconBox}>
                <Icon name={m.iconOff} size={48} color={c.icon} />
              </Pressable>
              <ColorSurface color={cssColor(colorValue.off)} onPress={() => setColorFor('off')} />
            </View>
          </View>
        </>
      ) : null}

      {m.type === 3 ? (
        <>
          <View style={s.pair}>
            <View style={s.half}>
              <Label>{S.min}</Label>
              <Field value={minText} onChangeText={setMinText} keyboardType="numbers-and-punctuation" center maxLength={10} />
            </View>
            <View style={s.half}>
              <Label>{S.max}</Label>
              <Field value={maxText} onChangeText={setMaxText} keyboardType="numbers-and-punctuation" center maxLength={10} />
            </View>
          </View>
          <View style={s.pair}>
            <View style={s.half}>
              <Label>{S.prefix}</Label>
              <Field value={m.prefix} onChangeText={(prefix) => patch({ prefix })} center maxLength={10} />
            </View>
            <View style={s.half}>
              <Label>{S.postfix}</Label>
              <Field value={m.postfix} onChangeText={(postfix) => patch({ postfix })} center maxLength={10} />
            </View>
          </View>
          <Label>{S.precision}</Label>
          <Field value={precision} onChangeText={setPrecision} keyboardType="number-pad" center width={100} />
          <Check checked={m.displayPayloadValue} onChange={(displayPayloadValue) => patch({ displayPayloadValue })} style={{ marginVertical: 10 }}>
            {S.display_payload_value_instead_of_percentage}
          </Check>
          <Label>{S.progress_color}</Label>
          <ColorSurface color={cssColor(colorValue.progress)} onPress={() => setColorFor('progress')} />
        </>
      ) : null}

      {m.type === 4 ? (
        <>
          {sizeRadios(m.mainTextSize, (mainTextSize) => patch({ mainTextSize }))}
          <Label top={6}>{S.main_text_color}</Label>
          <ColorSurface color={cssColor(colorValue.text)} onPress={() => setColorFor('text')} />
          <Label>{S.options}</Label>
          {m.items.length > 0 ? <Label style={{ opacity: 0.7 }}>{S.long_press_option_for_additional_actions}</Label> : null}
          <View style={{ paddingHorizontal: 15 }}>
            {m.items.map((it, i) => (
              <Pressable key={`${it.payload}-${i}`} style={[s.optionRow, { borderBottomColor: c.divider }]} onLongPress={() => setOptionMenu(i)} onPress={() => setOptionEdit({ index: i, item: it })}>
                <Text style={[s.optionLabel, { color: c.textPrimary }]}>{it.label}</Text>
                <Text style={[s.optionPayload, { color: c.textSecondary }]}>{it.payload}</Text>
              </Pressable>
            ))}
          </View>
          <FlatButton title={S.add_option} onPress={() => setOptionEdit({ index: -1, item: { label: '', payload: '' } })} style={{ marginBottom: 20 }} />
        </>
      ) : null}

      {m.type === 7 ? (
        <>
          <Label top={10}>{X.notification_title}</Label>
          <Field value={m.title} onChangeText={(title) => patch({ title })} />
          <Check checked={m.onlyOnChange} onChange={(onlyOnChange) => patch({ onlyOnChange })} style={{ marginVertical: 6 }}>
            {X.notification_only_on_change}
          </Check>
        </>
      ) : null}

      {m.type === 6 ? (
        <>
          <Label>{S.payload_format}</Label>
          <Radio selected={m.format === 0} onPress={() => patch({ format: 0 })}>{S.hex_string}</Radio>
          <Radio selected={m.format === 1} onPress={() => patch({ format: 1 })}>{S.numeric_string}</Radio>
          <Label top={6}>{S.icon}</Label>
          <Pressable onPress={() => pickIcon('icon')} style={s.iconBox}>
            <Icon name={m.icon} size={48} color={c.icon} />
          </Pressable>
        </>
      ) : null}

      {m.type !== 5 ? <Label top={10}>{S.other_settings}</Label> : null}
      {m.type !== 5 ? (
        <>
          <Radio selected={m.qos === 0} onPress={() => patch({ qos: 0 })}>{S.qos_0}</Radio>
          <Radio selected={m.qos === 1} onPress={() => patch({ qos: 1 })}>{S.qos_1}</Radio>
          <Radio selected={m.qos === 2} onPress={() => patch({ qos: 2 })}>{S.qos_2}</Radio>
          {m.enablePub && m.type !== 7 ? (
            <Check checked={m.retained} onChange={(retained) => patch({ retained })} style={{ marginTop: 16, marginBottom: 26 }}>
              {S.retained}
            </Check>
          ) : null}
        </>
      ) : null}

      <Label>{S.blink_expression}</Label>
      <Field value={m.jsBlinkExpression} onChangeText={(jsBlinkExpression) => patch({ jsBlinkExpression })} />

      <Label top={6}>{S.on_receive_description}</Label>
      <FlatButton title={S.on_receive} onPress={() => editScript('receive')} style={s.scriptButton} />
      <Label>{S.on_display_description}</Label>
      <FlatButton title={S.on_display} onPress={() => editScript('display')} style={s.scriptButton} />
      <Label>{S.on_tap_description}</Label>
      <FlatButton title={S.on_tap} onPress={() => editScript('tap')} style={s.scriptButton} />

      {colorFor ? (
        <SpectrumDialog selected={colorValue[colorFor]} onClose={() => setColorFor(null)} onOk={(argb) => setColor(colorFor, argb)} />
      ) : null}
      {alert ? <AlertMessage message={alert} onClose={() => setAlert(null)} /> : null}

      {optionEdit && m.type === 4 ? (
        <OptionDialog
          title={optionEdit.index < 0 ? S.add_new_option : S.edit_option}
          initial={optionEdit.item}
          onClose={() => setOptionEdit(null)}
          onDone={(item) => {
            const items = [...m.items];
            if (optionEdit.index < 0) items.push(item);
            else items[optionEdit.index] = item;
            patch({ items });
          }}
        />
      ) : null}
      {optionMenu !== null && m.type === 4 ? (
        <Dialog onClose={() => setOptionMenu(null)}>
          {[
            { title: S.edit, run: () => setOptionEdit({ index: optionMenu, item: m.items[optionMenu] }) },
            { title: S.delete, run: () => setOptionDelete(optionMenu) },
          ].map((it) => (
            <Pressable key={it.title} style={{ paddingVertical: 14 }} onPress={() => { setOptionMenu(null); it.run(); }}>
              <Text style={{ fontSize: 18, color: c.textPrimary }}>{it.title}</Text>
            </Pressable>
          ))}
        </Dialog>
      ) : null}
      {optionDelete !== null && m.type === 4 ? (
        <ConfirmDialog
          message={S.delete_metric_ask}
          onClose={() => setOptionDelete(null)}
          onYes={() => patch({ items: m.items.filter((_, i) => i !== optionDelete) })}
        />
      ) : null}
    </FormScroll>
  );
}

function OptionDialog({ title, initial, onDone, onClose }: { title: string; initial: MultiSwitchItem; onDone: (i: MultiSwitchItem) => void; onClose: () => void }) {
  const [payload, setPayload] = useState(initial.payload);
  const [label, setLabel] = useState(initial.label);
  return (
    <Dialog title={title} onClose={onClose}>
      <Label>{S.payload}</Label>
      <Field value={payload} onChangeText={setPayload} />
      <Label>{S.label}</Label>
      <Field value={label} onChangeText={setLabel} />
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <FlatButton
          title={S.action_done}
          onPress={() => {
            onClose();
            onDone({ label, payload });
          }}
        />
      </View>
    </Dialog>
  );
}

const s = StyleSheet.create({
  link: { fontSize: 14, marginTop: 2 },
  pair: { flexDirection: 'row', gap: 16 },
  half: { flex: 1 },
  iconBox: { alignItems: 'center', justifyContent: 'center', height: 64 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  optionLabel: { fontSize: 16 },
  optionPayload: { fontSize: 16 },
  scriptButton: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 12, paddingHorizontal: 16 },
});

/** Settings specific to the widget kind (stored in `opts`), shown as text fields, checkboxes and radio lists. */
function WidgetOptions({ metric, patch }: { metric: Metric; patch: (p: Partial<Metric>) => void }) {
  const fields = OPTION_FIELDS[widgetKindOf(metric)] ?? [];
  const set = (key: string, value: string | number | boolean) => patch({ opts: { ...metric.opts, [key]: value } });
  return (
    <>
      {fields.map((f) => {
        const raw = metric.opts?.[f.key];
        const value = typeof raw === typeof f.default ? raw : f.default;
        if (f.kind === 'bool') {
          return (
            <Check key={f.key} checked={value as boolean} onChange={(v) => set(f.key, v)}>
              {tl(`o_${f.key}`, f.label)}
            </Check>
          );
        }
        if (f.kind === 'choice') {
          return (
            <View key={f.key}>
              <Label top={10}>{tl(`o_${f.key}`, f.label)}</Label>
              {f.choices?.map((c) => (
                <Radio key={c} selected={value === c} onPress={() => set(f.key, c)}>
                  {tl(`c_${c}`, c)}
                </Radio>
              ))}
            </View>
          );
        }
        return <OptionText key={f.key} label={tl(`o_${f.key}`, f.label)} numeric={f.kind === 'number'} value={String(value)} fallback={f.default} onValue={(v) => set(f.key, v)} />;
      })}
    </>
  );
}

/** Text option that keeps its own text while typing ("-" or "1." are valid intermediate states of a number). */
function OptionText({ label, numeric, value, fallback, onValue }: { label: string; numeric: boolean; value: string; fallback: string | number | boolean; onValue: (v: string | number | boolean) => void }) {
  const [text, setText] = useState(value);
  return (
    <View>
      <Label top={10}>{label}</Label>
      <Field
        value={text}
        keyboardType={numeric ? 'numbers-and-punctuation' : undefined}
        onChangeText={(t) => {
          setText(t);
          if (!numeric) onValue(t);
          else {
            const n = parseFloat(t);
            onValue(Number.isFinite(n) ? n : fallback);
          }
        }}
      />
    </View>
  );
}
