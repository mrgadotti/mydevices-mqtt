import { MqttConnection } from '../mqtt/MqttConnection';
import { clientOptionsFor } from '../mqtt/connect';
import { nativeTcp } from '../mqtt/tcp.native';
import { makeHookEnv } from '../ui/scriptApp';
import { appStore } from '../ui/store';
import { U } from '../i18n';
import { localBroker, localBrokerUsage } from '../localBroker/LocalBroker';
import { localPort } from '../localBroker/usage';
import { BackgroundMqtt } from './BackgroundMqtt';
import { showEventNotification, startServiceNotification, stopServiceNotification } from './notifications';

let started = false;
let watched: string[] = [];

/** The foreground service stays up while MQTT tiles are watched or the local broker runs. */
function refreshService(): void {
  const info = localBroker.notificationInfo();
  const brokerText = info
    ? info.ip
      ? U.local_broker_notification.replace('{address}', `${info.ip}:${info.port}`)
      : U.local_broker_notification_no_wifi.replace('{port}', String(info.port))
    : null;
  if (watched.length > 0 || brokerText) void startServiceNotification(watched, brokerText, U.exit_app).catch(() => {});
  else void stopServiceNotification().catch(() => {});
}

/** Keeps MQTT connections for notification tiles alive (with a foreground service) whatever screen is open. */
export function startBackground(): void {
  if (started) return;
  started = true;

  const bg = new BackgroundMqtt({
    createConnection: (broker) => {
      const conn = new MqttConnection(clientOptionsFor(broker, nativeTcp), { retryMs: 5000 });
      if (!broker.localBroker) return conn;
      // A local broker must be listening before the client dials localhost; the hold lasts as long as the watch.
      const key = `bg:${broker.id}`;
      let stopped = false;
      return Object.assign(conn, {
        start: () => {
          stopped = false;
          localBrokerUsage
            .acquire(key, localPort(broker))
            .then(() => {
              if (!stopped) MqttConnection.prototype.start.call(conn);
            })
            .catch(() => {});
        },
        stop: () => {
          stopped = true;
          MqttConnection.prototype.stop.call(conn);
          void localBrokerUsage.release(key).catch(() => {});
        },
      });
    },
    notify: (content, tileId) => void showEventNotification(content, tileId).catch(() => {}),
    applyRuntime: (brokerId, metric) => appStore.getState().applyRuntime(brokerId, metric),
    now: () => Math.floor(Date.now() / 1000),
    onActiveChange: (names) => {
      watched = names;
      refreshService();
    },
    hookEnv: (publish) => makeHookEnv({ publishRaw: async (topic, payload, retained, qos) => publish(topic, payload, retained, qos) }),
  });

  localBroker.subscribe(refreshService);

  let timer: ReturnType<typeof setTimeout> | null = null;
  const sync = () => {
    const s = appStore.getState();
    if (!s.ready) return;
    bg.sync(s.brokers, s.metrics);
    void localBrokerUsage.syncAuto(s.brokers);
  };
  appStore.subscribe((state, prev) => {
    if (state.brokers === prev.brokers && state.metrics === prev.metrics && state.ready === prev.ready) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(sync, 400);
  });
  sync();
}
