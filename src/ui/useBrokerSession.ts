import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { applyMessage, publishQos, pubTopic, recordPublished } from '../domain/metrics';
import { routeMessage } from '../domain/routing';
import type { Metric } from '../domain/types';
import { localBrokerUsage } from '../localBroker/LocalBroker';
import { localPort } from '../localBroker/usage';
import { clientOptionsFor } from '../mqtt/connect';
import { MqttConnection } from '../mqtt/MqttConnection';
import { fromUtf8 } from '../mqtt/text';
import { nativeTcp } from '../mqtt/tcp.native';
import { U } from '../i18n';
import { runOnReceive } from '../scripting/hooks';
import { runtimeStore } from './runtime';
import { makeHookEnv } from './scriptApp';
import { appStore, useApp } from './store';
import { feedLogs } from './widgets/logStore';

export type SessionState = 'connecting' | 'connected' | 'failed';

const nowSec = () => Math.floor(Date.now() / 1000);

export interface BrokerSession {
  state: SessionState;
  /** Latest binary image payload per tile id (image tiles of kind "data in payload"). */
  imageData: Map<string, Uint8Array>;
  /** Bumps whenever imageData changes. */
  imageVersion: number;
  publish(metric: Metric, payload: string, retained: boolean): void;
  /** Publishes to an arbitrary topic (import/export, retained message deletion, scripts). */
  publishRaw(topic: string, payload: string, retained: boolean, qos: number): Promise<void>;
  subscribeOnce(topic: string, onMessage: (payload: string) => void): () => void;
  /** Called once with the toast text when a connection attempt fails. */
  onToast(cb: (message: string) => void): () => void;
}

/**
 * One MQTT connection for the dashboard of `brokerId`: subscribes every tile topic, routes messages into the tiles
 * (the way MetricsListActivity does) and publishes on behalf of tiles.
 */
export function useBrokerSession(brokerId: string): BrokerSession {
  const broker = useApp((s) => s.brokers.find((b) => b.id === brokerId));
  // Only the topic list matters here: a string key keeps this hook (and the dashboard) from re-rendering on every message.
  const subKey = useApp((s) => JSON.stringify((s.metrics[brokerId] ?? []).filter((m) => m.topic.length > 0).map((m) => [m.topic, m.qos])));
  const [state, setState] = useState<SessionState>('connecting');
  const [imageVersion, setImageVersion] = useState(0);
  const conn = useRef<MqttConnection | null>(null);
  const imageData = useRef(new Map<string, Uint8Array>());
  const toasts = useRef(new Set<(m: string) => void>());
  const extra = useRef(new Map<string, (payload: string) => void>());
  const publishRawRef = useRef<BrokerSession['publishRaw']>(() => Promise.reject(new Error('Not connected')));

  const connectionKey = broker
    ? JSON.stringify([broker.localBroker, broker.address, broker.port, broker.ssl, broker.trust, broker.user, broker.password, broker.clientId])
    : '';

  // Entering the dashboard clears every pending (intermediate) state, does.
  useEffect(() => {
    const list = appStore.getState().metrics[brokerId] ?? [];
    for (const m of list) if (m.enteredIntermediateStateAt !== 0) appStore.getState().applyRuntime(brokerId, { ...m, enteredIntermediateStateAt: 0 });
  }, [brokerId]);

  useEffect(() => {
    const b = appStore.getState().brokers.find((x) => x.id === brokerId);
    if (!b) return;
    const c = new MqttConnection(clientOptionsFor(b, nativeTcp), { retryMs: 5000 });
    conn.current = c;
    setState('connecting');
    const offAppState = AppState.addEventListener('change', (st) => {
      if (st === 'active') c.reconnectNow();
    });
    const offStatus = c.onStatus((s, error) => {
      if (s === 'connected') setState('connected');
      else if (s === 'connecting') setState('connecting');
      else {
        setState('failed');
        if (error !== undefined) for (const cb of toasts.current) cb('Connection failed');
      }
    });
    // Message bursts: scripts run per message, but the store (and so every render) is written once per flush.
    const pending = new Map<string, Metric>();
    let imagesChanged = false;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      flushTimer = null;
      if (pending.size > 0) {
        const batch = [...pending.values()];
        pending.clear();
        appStore.getState().applyRuntimeBatch(brokerId, batch);
      }
      if (imagesChanged) {
        imagesChanged = false;
        setImageVersion((v) => v + 1);
      }
    };
    const offMsg = c.onMessage((topic, payload, retained, qos) => {
      const t = nowSec();
      const stored = appStore.getState().metrics[brokerId] ?? [];
      // Log widgets see every message matching their (wildcard) filter, not only exact-topic ones.
      feedLogs(stored, topic, fromUtf8(payload), qos, retained, Date.now());
      const list = pending.size === 0 ? stored : stored.map((m) => pending.get(m.id) ?? m);
      for (const r of routeMessage(list, topic, payload, t)) {
        let metric = r.metric;
        let changed = r.changed;
        runtimeStore.getState().set(metric.id, { onReceive: '' });
        if (metric.type === 5 && metric.kind === 3) {
          imageData.current.set(metric.id, payload);
          imagesChanged = true;
        }
        if (r.jsonError.length === 0 && metric.jsOnReceive.trim().length > 0) {
          const out = runOnReceive(metric, topic, r.payloadText, makeHookEnv({ publishRaw: (...a) => publishRawRef.current(...a) }));
          if (out.error.length > 0) runtimeStore.getState().set(metric.id, { onReceive: out.error });
          else {
            const again = applyMessage(metric, out.payload, t);
            metric = again.metric;
            changed = changed || again.changed;
          }
        }
        if (changed || r.wasPending) pending.set(metric.id, metric);
      }
      if ((pending.size > 0 || imagesChanged) && !flushTimer) flushTimer = setTimeout(flush, 50);
      const handler = extra.current.get(topic);
      handler?.(fromUtf8(payload));
    });
    let cancelled = false;
    const lease = `session:${brokerId}`;
    if (b.localBroker) {
      // The embedded broker must listen before the client dials localhost; a failed start is a failed connection.
      setState('connecting');
      localBrokerUsage.acquire(lease, localPort(b)).then(
        () => {
          if (!cancelled) c.start();
        },
        () => {
          if (cancelled) return;
          setState('failed');
          for (const cb of toasts.current) cb(U.local_broker_start_failed);
        },
      );
    } else c.start();
    return () => {
      cancelled = true;
      if (b.localBroker) void localBrokerUsage.release(lease).catch(() => {});
      offAppState.remove();
      offStatus();
      offMsg();
      if (flushTimer) clearTimeout(flushTimer);
      flush();
      c.stop();
      if (conn.current === c) conn.current = null;
      void appStore.getState().flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brokerId, connectionKey]);

  const subscriptions = useMemo(() => (JSON.parse(subKey) as [string, number][]).map(([topic, qos]) => ({ topic, qos })), [subKey]);
  useEffect(() => {
    const topics = [...subscriptions, ...[...extra.current.keys()].map((topic) => ({ topic, qos: 0 }))];
    conn.current?.setSubscriptions(topics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subKey, connectionKey, state]);

  const publishRaw = useCallback((topic: string, payload: string, retained: boolean, qos: number) => {
    const c = conn.current;
    if (!c) return Promise.reject(new Error('Not connected'));
    return c.publish(topic, payload, qos, retained);
  }, []);

  publishRawRef.current = publishRaw;

  const publish = useCallback(
    (metric: Metric, payload: string, retained: boolean) => {
      if ((metric.topic.length === 0 && metric.topicPub.length === 0)) return;
      const topic = pubTopic(metric);
      void publishRaw(topic, payload, retained, publishQos(metric))
        .then(() => {
          const list = appStore.getState().metrics[brokerId] ?? [];
          const next = recordPublished(list, topic, payload, nowSec());
          next.forEach((m, i) => {
            if (m !== list[i]) appStore.getState().applyRuntime(brokerId, m);
          });
        })
        .catch(() => {});
    },
    [brokerId, publishRaw],
  );

  const subscribeOnce = useCallback((topic: string, onMessage: (payload: string) => void) => {
    extra.current.set(topic, onMessage);
    conn.current?.setSubscriptions([
      ...(appStore.getState().metrics[brokerId] ?? []).filter((m) => m.topic).map((m) => ({ topic: m.topic, qos: m.qos })),
      ...[...extra.current.keys()].map((t) => ({ topic: t, qos: 1 })),
    ]);
    return () => {
      extra.current.delete(topic);
    };
  }, [brokerId]);

  const onToast = useCallback((cb: (m: string) => void) => {
    toasts.current.add(cb);
    return () => {
      toasts.current.delete(cb);
    };
  }, []);

  return useMemo(
    () => ({ state, imageData: imageData.current, imageVersion, publish, publishRaw, subscribeOnce, onToast }),
    [state, imageVersion, publish, publishRaw, subscribeOnce, onToast],
  );
}
