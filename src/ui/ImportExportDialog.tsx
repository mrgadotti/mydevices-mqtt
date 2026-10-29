import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { parseMetrics, serializeMetrics } from '../domain/serialize';
import type { BrokerSession } from './useBrokerSession';
import { appStore } from './store';
import { S } from '../i18n';
import { useColors } from './colors';
import { useToast } from './toast';
import { Dialog, Description, Field, FlatButton, Label } from './widgets';

/** import_export_popup: share the tile definitions through an MQTT topic. */
export function ImportExportDialog({ brokerId, session, onClose }: { brokerId: string; session: BrokerSession; onClose: () => void }) {
  const c = useColors();
  const toast = useToast();
  const [topic, setTopic] = useState<string>(S.metrics_exchange_topic_name);
  const [waiting, setWaiting] = useState(false);
  const off = useRef<(() => void) | null>(null);

  useEffect(() => () => off.current?.(), []);

  const publish = (retained: boolean) => {
    const t = topic.trim();
    if (t.length === 0) return;
    const payload = serializeMetrics(appStore.getState().metrics[brokerId] ?? []);
    session
      .publishRaw(t, payload, retained, 0)
      .then(() => toast(S.published_successfully))
      .catch((e: Error) => toast(`${S.sorry_error_happened}${e.message}`));
  };

  const subscribe = () => {
    const t = topic.trim();
    if (t.length === 0) return;
    setWaiting(true);
    off.current?.();
    off.current = session.subscribeOnce(t, (payload) => {
      try {
        appStore.getState().replaceMetrics(brokerId, parseMetrics(payload));
        toast(S.metrics_data_received);
        onClose();
      } catch (e) {
        toast(`${S.sorry_error_happened}${(e as Error).message}`);
      }
    });
  };

  return (
    <Dialog onClose={onClose}>
      <Description>{S.import_export_metrics_description}</Description>
      <Label>{S.topic}</Label>
      <Field value={topic} onChangeText={setTopic} />
      <FlatButton title={S.publish_metrics} onPress={() => publish(false)} style={s.full} />
      <FlatButton title={S.publish_metrics_retained} onPress={() => publish(true)} style={s.full} />
      <FlatButton title={S.subscribe_and_wait_for_metrics} onPress={subscribe} style={s.full} />
      {waiting ? <Text style={[s.waiting, { color: c.textSecondary }]}>{S.subscribed_waiting_for_incoming_data}</Text> : null}
      <View style={s.close}>
        <FlatButton title={S.close} onPress={onClose} />
      </View>
    </Dialog>
  );
}

const s = StyleSheet.create({
  full: { alignSelf: 'stretch', marginTop: 4 },
  waiting: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  close: { alignItems: 'center', marginTop: 12 },
});
