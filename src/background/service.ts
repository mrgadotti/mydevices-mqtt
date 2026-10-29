import { MqttConnection } from '../mqtt/MqttConnection';
import { clientOptionsFor } from '../mqtt/connect';
import { nativeTcp } from '../mqtt/tcp.native';
import { makeHookEnv } from '../ui/scriptApp';
import { appStore } from '../ui/store';
import { BackgroundMqtt } from './BackgroundMqtt';
import { showEventNotification, startServiceNotification, stopServiceNotification } from './notifications';

let started = false;

/** Keeps MQTT connections for notification tiles alive (with a foreground service) whatever screen is open. */
export function startBackground(): void {
  if (started) return;
  started = true;

  const bg = new BackgroundMqtt({
    createConnection: (broker) => new MqttConnection(clientOptionsFor(broker, nativeTcp), { retryMs: 5000 }),
    notify: (content, tileId) => void showEventNotification(content, tileId).catch(() => {}),
    applyRuntime: (brokerId, metric) => appStore.getState().applyRuntime(brokerId, metric),
    now: () => Math.floor(Date.now() / 1000),
    onActiveChange: (names) => {
      if (names.length > 0) void startServiceNotification(names).catch(() => {});
      else void stopServiceNotification().catch(() => {});
    },
    hookEnv: (publish) => makeHookEnv({ publishRaw: async (topic, payload, retained, qos) => publish(topic, payload, retained, qos) }),
  });

  let timer: ReturnType<typeof setTimeout> | null = null;
  const sync = () => {
    const s = appStore.getState();
    if (s.ready) bg.sync(s.brokers, s.metrics);
  };
  appStore.subscribe((state, prev) => {
    if (state.brokers === prev.brokers && state.metrics === prev.metrics && state.ready === prev.ready) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(sync, 400);
  });
  sync();
}
