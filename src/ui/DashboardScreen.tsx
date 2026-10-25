import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { toBase64 } from '../domain/base64';
import { buildDisplay } from '../domain/display';
import { currentValue, isPending, nextSwitchPayload, parseJavaFloat, rangeValue } from '../domain/metrics';
import type { ImageMetric, Metric } from '../domain/types';
import { ActionIcons } from './ActionIcons';
import { AlertMessage, ConfirmDialog, HsvColorDialog, ImagePopup, ListDialog, MultiDialog, RangeDialog, SetValueDialog } from './dialogs';
import { evalBlink, runOnDisplay, runOnTap } from '../scripting/hooks';
import { makeHookEnv } from './scriptApp';
import { runtimeStore, useTileRuntime } from './runtime';
import { ImportExportDialog } from './ImportExportDialog';
import type { RootStackParamList } from './navigation';
import { type, type Skin } from './skin';
import { markRender, perfMark } from './perf';
import { WidgetBox } from './WidgetBox';
import { WidgetGrid } from './WidgetGrid';
import { WidgetView } from './widgets/WidgetViews';
import { Icon } from './icons/Icon';
import { useSkin } from './useSkin';
import { canPlace, firstFree, layoutWidgets, needsClock, widgetKindOf, WIDGET_SPECS, type Rect, type WidgetKind } from '../domain/widgets';
import { appStore, useApp } from './store';
import { S, U, X } from '../i18n';
import { useToast } from './toast';
import { useBrokerSession, type BrokerSession } from './useBrokerSession';
import { cancelAutoConnect } from './BrokersListScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

type Overlay =
  | { kind: 'choose'; at?: { x: number; y: number } }
  | { kind: 'delete'; metric: Metric }
  | { kind: 'retained'; metric: Metric }
  | { kind: 'alert'; message: string }
  | { kind: 'text'; metric: Metric }
  | { kind: 'range'; metric: Metric }
  | { kind: 'multi'; metric: Metric }
  | { kind: 'color'; metric: Metric }
  | { kind: 'image'; uri: string | null }
  | { kind: 'importExport' };

const nowSec = () => Math.floor(Date.now() / 1000);

/** The current second, ticking only while `enabled` (no widget needs the clock = no timer, no re-render). */
function useNowSec(enabled: boolean): number {
  const [now, setNow] = useState(nowSec());
  useEffect(() => {
    if (!enabled) return;
    setNow(nowSec());
    const t = setInterval(() => setNow(nowSec()), 1000);
    return () => clearInterval(t);
  }, [enabled]);
  return now;
}

/** Image tile sources: the URL (reloaded every `reloadInterval` seconds) or the binary payload as a data URI. */
function useImageSource(metric: Metric, session: BrokerSession, now: number, brokerId: string) {
  const [token, setToken] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const img: ImageMetric | null = metric.type === 5 ? metric : null;
  const url = img ? img.imageUrl.trim() : '';
  const isUrlKind = img !== null && (img.kind === 1 || img.kind === 2);
  const due = img !== null && now - img.lastActivity >= img.reloadInterval;

  useEffect(() => {
    if (!isUrlKind || url.length === 0) return;
    if (!loaded || due) setToken((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due, url]);

  const data = img && img.kind === 3 ? session.imageData.get(img.id) : undefined;
  const uri = isUrlKind ? (url.length > 0 ? url : null) : data ? `data:image/png;base64,${toBase64(data)}` : null;
  return {
    uri,
    key: `${metric.id}-${token}`,
    onLoad: () => {
      setLoaded(true);
      if (img && isUrlKind) appStore.getState().applyRuntime(brokerId, { ...img, lastActivity: nowSec() });
    },
    onError: () => setLoaded(false),
  };
}

interface HostProps {
  metric: Metric;
  brokerId: string;
  width: number;
  height: number;
  now: number;
  session: BrokerSession;
  onTap: (m: Metric, display: ReturnType<typeof buildDisplay>) => void;
  onSet: (m: Metric, payload: string) => void;
  edit: boolean;
}

const WidgetHost = React.memo(function WidgetHost({ metric, brokerId, width, height, now, session, onTap, onSet, edit }: HostProps) {
  markRender('WidgetHost');
  const skin = useSkin();
  const rt = useTileRuntime(metric.id);
  const { display, blinkError } = useMemo(() => {
    let d = buildDisplay(metric, now);
    d = { ...d, blink: rt.blink };
    let bErr = '';
    if (metric.jsBlinkExpression.trim().length > 0 && !rt.onTap && !rt.onReceive && !rt.blinkExpression) {
      const r = evalBlink(metric.jsBlinkExpression, currentValue(metric), now - metric.lastActivity);
      if ('error' in r) bErr = r.error;
      else d = { ...d, blink: r.value };
    }
    const scriptError = rt.onTap || rt.onReceive || rt.blinkExpression || bErr;
    if (scriptError) return { display: { ...d, error: scriptError }, blinkError: bErr };
    const out = runOnDisplay(metric, d, now, makeHookEnv({ publishRaw: session.publishRaw }));
    return { display: out.display, blinkError: bErr };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, now, rt]);

  useEffect(() => {
    if (blinkError) runtimeStore.getState().set(metric.id, { blinkExpression: blinkError });
    else if (display.blink !== rt.blink) runtimeStore.getState().set(metric.id, { blink: display.blink });
  }, [blinkError, display.blink, metric.id, rt.blink]);

  const image = useImageSource(metric, session, now, brokerId);
  return (
    <WidgetView
      key={metric.type === 5 ? image.key : metric.id}
      metric={metric}
      display={display}
      kind={widgetKindOf(metric)}
      width={width}
      height={height}
      skin={skin}
      pending={isPending(metric, now) && metric.type !== 5}
      imageUri={metric.type === 5 ? (display.url.length > 0 && metric.kind !== 3 ? display.url : image.uri) : null}
      interactive={!edit && (metric.enablePub || metric.type === 5)}
      edit={edit}
      onTap={() => onTap(metric, display)}
      onSet={(payload) => onSet(metric, payload)}
      onImageLoaded={image.onLoad}
      onImageError={image.onError}
    />
  );
});

export function DashboardScreen({ navigation, route }: Props) {
  markRender('Dashboard');
  const { brokerId } = route.params;
  const broker = useApp((s) => s.brokers.find((b) => b.id === brokerId));
  const metrics = useApp((s) => s.metrics[brokerId]) ?? [];
  const session = useBrokerSession(brokerId);
  const toast = useToast();
  const clock = metrics.some(needsClock);
  const now = useNowSec(clock);
  const { width, height } = useWindowDimensions();
  const skin = useSkin();
  const [edit, setEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gesture, setGesture] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  useKeepAwake(broker?.keepScreenOn ? 'dashboard' : undefined);

  useEffect(() => session.onToast(toast), [session, toast]);
  useEffect(() => {
    cancelAutoConnect();
  }, []);

  const editable = broker?.metricsEditable ?? true;

  const unplaced = metrics.length > 0 && metrics.some((m) => m.gx === undefined || m.gw === undefined);
  useEffect(() => {
    if (unplaced) appStore.getState().materializeLayout(brokerId);
  }, [unplaced, metrics.length, brokerId]);

  useLayoutEffect(() => {
    if (!broker) return;
    navigation.setOptions({
      title: broker.name,
      headerShown: editable || broker.neverHideBrokerName,
      statusBarHidden: false,
      headerRight: () =>
        editable ? (
          <ActionIcons
            items={[
              {
                icon: 'glyph:edit',
                label: U.edit,
                active: edit,
                onPress: () => {
                  perfMark('edit-toggle');
                  setEdit(!edit);
                  setSelectedId(null);
                },
              },
              { icon: 'glyph:upload', label: S.action_import_export, onPress: () => setOverlay({ kind: 'importExport' }) },
              { icon: 'glyph:plus', label: S.action_add, onPress: () => setOverlay({ kind: 'choose' }) },
            ]}
          />
        ) : null,
    });
  }, [navigation, broker, editable, edit, toast]);

  const tap = useCallback(
    (m: Metric, display: ReturnType<typeof buildDisplay>) => {
      if (display.error.length > 0 && m.type !== 5 && m.type !== 6) setOverlay({ kind: 'alert', message: display.error });
      if (isPending(m, nowSec())) return;
      runtimeStore.getState().set(m.id, { onTap: '' });
      const hook = runOnTap(m, makeHookEnv(session));
      if (hook.error) runtimeStore.getState().set(m.id, { onTap: hook.error });
      if (hook.preventDefault) return;
      if (m.type === 5) {
        if (m.openUrl.length > 0) void Linking.openURL(m.openUrl).catch((e: Error) => toast(e.message));
        else setOverlay({ kind: 'image', uri: m.kind === 3 && session.imageData.has(m.id) ? `data:image/png;base64,${toBase64(session.imageData.get(m.id)!)}` : m.imageUrl || null });
        return;
      }
      if (!m.enablePub) return;
      switch (m.type) {
        case 1:
          setOverlay({ kind: 'text', metric: m });
          return;
        case 2:
          session.publish(m, nextSwitchPayload(m), m.retained);
          return;
        case 3:
          setOverlay({ kind: 'range', metric: m });
          return;
        case 4:
          setOverlay({ kind: 'multi', metric: m });
          return;
        case 6:
          setOverlay({ kind: 'color', metric: m });
          return;
        default:
          return;
      }
    },
    [session, toast],
  );

  const onSet = useCallback(
    (m: Metric, payload: string) => {
      if (m.enablePub) session.publish(m, payload, m.retained);
    },
    [session],
  );

  if (!broker) return null;

  const close = () => setOverlay(null);
  const selected = metrics.find((m) => m.id === selectedId);
  const addWidget = (kind: WidgetKind, at?: { x: number; y: number }) => {
    const spec = WIDGET_SPECS[kind];
    const rects = layoutWidgets(metrics);
    const want = at ? { x: Math.min(at.x, 24 - spec.def.w), y: at.y, w: spec.def.w, h: spec.def.h } : null;
    const rect: Rect = want && canPlace(rects, '', want) ? want : firstFree(rects, '', spec.def.w, spec.def.h);
    navigation.navigate('MetricForm', {
      brokerId,
      type: spec.metricType,
      preset: { widget: kind, gx: rect.x, gy: rect.y, gw: rect.w, gh: rect.h, name: spec.title },
    });
  };

  return (
    <View style={[s.screen, { backgroundColor: skin.listBackground }]}>
      {session.state === 'connecting' ? (
        <View style={s.connecting}>
          <ActivityIndicator size="small" color={skin.brand} />
          <Text style={[type.body3, { color: skin.text8, marginLeft: 8 }]}>{S.connecting}</Text>
        </View>
      ) : null}
      {true ? (
        <ScrollView contentContainerStyle={{ paddingBottom: edit ? 96 : 0 }} scrollEnabled={!gesture}>
          {metrics.length === 0 && !edit ? (
            <View style={s.empty}>
              <Icon name="glyph:cube" size={44} color={skin.primary} />
              <Text style={[type.headline2, s.emptyTitle, { color: skin.text9 }]}>{U.no_widgets_yet}</Text>
              <Text style={[type.body2, s.emptyText, { color: skin.text9 }]}>{U.add_widget_hint}</Text>
              {editable ? (
                <Pressable style={[s.primaryButton, { backgroundColor: skin.primary }]} onPress={() => setOverlay({ kind: 'choose' })}>
                  <Icon name="glyph:plus" size={16} color={skin.onPrimary} />
                  <Text style={[type.subtitle1, { color: skin.onPrimary, marginLeft: 8 }]}>{U.add_widget}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <WidgetGrid
              metrics={metrics}
              width={width}
              minHeight={height - 160}
              edit={edit}
              selectedId={selectedId}
              skin={skin}
              onSelect={setSelectedId}
              onEmptyTap={(cell) => setOverlay({ kind: 'choose', at: cell })}
              onChangeRect={(id, rect) => appStore.getState().setWidgetRect(brokerId, id, rect)}
              onGesture={setGesture}
              renderWidget={(m, w, h) => (
                <WidgetHost metric={m} brokerId={brokerId} width={w} height={h} now={needsClock(m) ? now : 0} session={session} edit={edit} onTap={tap} onSet={onSet} />
              )}
            />
          )}
        </ScrollView>
      ) : null}

      {overlay?.kind === 'choose' ? <WidgetBox skin={skin} onClose={close} onPick={(k) => addWidget(k, overlay.at)} /> : null}

      {edit ? (
        <View pointerEvents="box-none" style={s.toolboxWrap}>
          <View style={[s.toolbox, { backgroundColor: skin.scheme === 'dark' ? '#D9FFFFFF' : skin.text9, borderColor: 'rgba(255,255,255,0.65)' }]}>
            <ToolButton icon="glyph:plus" primary skin={skin} onPress={() => setOverlay({ kind: 'choose' })} />
            <ToolButton
              icon="glyph:tool"
              skin={skin}
              disabled={!selected}
              onPress={() => selected && navigation.navigate('MetricForm', { brokerId, type: selected.type, metricId: selected.id })}
            />
            <ToolButton
              icon="glyph:copy"
              skin={skin}
              disabled={!selected}
              onPress={() => {
                if (!selected) return;
                const copy = appStore.getState().cloneMetric(brokerId, selected.id);
                if (copy) {
                  appStore.getState().updateMetric(brokerId, { ...copy, gx: undefined, gy: undefined } as Metric);
                  appStore.getState().materializeLayout(brokerId);
                  setSelectedId(copy.id);
                }
              }}
            />
            <ToolButton icon="glyph:trash" skin={skin} disabled={!selected} onPress={() => selected && setOverlay({ kind: 'delete', metric: selected })} />
            <ToolButton
              icon="glyph:data_removal"
              skin={skin}
              disabled={!selected || (selected.topic.trim().length === 0 && selected.topicPub.trim().length === 0)}
              onPress={() => selected && setOverlay({ kind: 'retained', metric: selected })}
            />
            <ToolButton icon="glyph:check" skin={skin} onPress={() => { setEdit(false); setSelectedId(null); }} />
          </View>
        </View>
      ) : null}

      {overlay?.kind === 'delete' ? (
        <ConfirmDialog message={S.delete_metric_ask} onClose={close} onYes={() => {
            appStore.getState().removeMetric(brokerId, overlay.metric.id);
            setSelectedId(null);
          }} />
      ) : null}

      {overlay?.kind === 'retained' ? (
        <ConfirmDialog
          message={S.delete_retained_message_question}
          onClose={close}
          onYes={() => {
            const m = overlay.metric;
            if (m.topic.trim().length > 0) void session.publishRaw(m.topic, '', true, 0).catch(() => {});
            if (m.topicPub.trim().length > 0) void session.publishRaw(m.topicPub, '', true, 0).catch(() => {});
          }}
        />
      ) : null}

      {overlay?.kind === 'alert' ? <AlertMessage message={overlay.message} onClose={close} /> : null}

      {overlay?.kind === 'text' ? <SetValueDialog onClose={close} onSet={(v) => session.publish(overlay.metric, v, overlay.metric.retained)} /> : null}

      {overlay?.kind === 'range' && overlay.metric.type === 3 ? (
        <RangeDialog
          metric={overlay.metric}
          initial={rangeValue(overlay.metric)}
          toast={toast}
          onClose={close}
          onSet={(v) => session.publish(overlay.metric, v, overlay.metric.retained)}
        />
      ) : null}

      {overlay?.kind === 'multi' && overlay.metric.type === 4 ? (
        <MultiDialog
          metric={overlay.metric}
          current={currentValue(overlay.metric)}
          onClose={close}
          onPick={(p) => session.publish(overlay.metric, p, overlay.metric.retained)}
        />
      ) : null}

      {overlay?.kind === 'color' && overlay.metric.type === 6 ? (
        <HsvColorDialog
          initial={initialColor(overlay.metric)}
          onClose={close}
          onOk={(argb) => {
            const rgb = argb & 0xffffff;
            const payload = overlay.metric.type === 6 && overlay.metric.format === 0 ? `#${rgb.toString(16).toUpperCase().padStart(6, '0')}` : String(rgb);
            session.publish(overlay.metric, payload, overlay.metric.retained);
          }}
        />
      ) : null}

      {overlay?.kind === 'image' ? <ImagePopup uri={overlay.uri} onClose={close} /> : null}

      {overlay?.kind === 'importExport' ? <ImportExportDialog brokerId={brokerId} session={session} onClose={close} /> : null}
    </View>
  );
}

/** Color the picker starts at: the current payload (numeric or Android color string) or white. */
function initialColor(m: Metric): number {
  const v = currentValue(m);
  if (v === null) return -1;
  if (/^\d+(?:\.\d+)?$/.test(v)) {
    const n = parseJavaFloat(v);
    return n === null ? -1 : (0xff000000 | (Math.trunc(n) & 0xffffff)) | 0;
  }
  const hex = /^#([0-9a-fA-F]{6})$/.exec(v);
  return hex ? (0xff000000 + parseInt(hex[1], 16)) | 0 : -1;
}

function ToolButton({ icon, skin, onPress, primary, disabled }: { icon: string; skin: Skin; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[s.toolButton, { backgroundColor: primary ? skin.brand : skin.scheme === 'dark' ? '#303136' : '#FFFFFF', opacity: disabled ? 0.4 : 1 }]}
    >
      <Icon name={icon} size={16} color={primary ? skin.onBrand : skin.scheme === 'dark' ? '#FFFFFF' : skin.surface} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  connecting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 120 },
  emptyTitle: { marginTop: 40, textAlign: 'center' },
  emptyText: { marginTop: 8, textAlign: 'center' },
  primaryButton: { marginTop: 40, minHeight: 48, paddingHorizontal: 32, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  toolboxWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  toolbox: { flexDirection: 'row', padding: 4, borderRadius: 28, borderWidth: 1, elevation: 8 },
  toolButton: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 2, alignItems: 'center', justifyContent: 'center' },
});
