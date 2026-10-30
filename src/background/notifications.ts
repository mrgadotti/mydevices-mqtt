import notifee, { AndroidForegroundServiceType, AndroidImportance, AuthorizationStatus, EventType, type Event } from '@notifee/react-native';
import { BackHandler } from 'react-native';
import type { NotificationContent } from '../domain/notification';
import { localBroker } from '../localBroker/LocalBroker';
import { quitApp } from './exit';

/** Local notifications only: Notifee draws them on the device, no push service, token or Firebase involved. */

const EVENTS_CHANNEL = 'mqtt-events';
const SERVICE_CHANNEL = 'mqtt-service';
const SERVICE_ID = 'mqtt-iot-service';
const EXIT_ACTION = 'exit';

let channels: Promise<void> | null = null;
function ensureChannels(): Promise<void> {
  channels ??= (async () => {
    await notifee.createChannel({ id: EVENTS_CHANNEL, name: 'MQTT events', importance: AndroidImportance.HIGH, vibration: true });
    await notifee.createChannel({ id: SERVICE_CHANNEL, name: 'Background connection', importance: AndroidImportance.LOW });
  })();
  return channels;
}

/** Android 13+ asks the user once; older versions grant by default. */
export async function requestNotificationPermission(): Promise<boolean> {
  const s = await notifee.requestPermission();
  return s.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

export async function showEventNotification(content: NotificationContent, tileId: string): Promise<void> {
  await ensureChannels();
  await notifee.displayNotification({
    id: `${tileId}-${Date.now()}`,
    title: content.title,
    body: content.body,
    android: { channelId: EVENTS_CHANNEL, importance: AndroidImportance.HIGH, pressAction: { id: 'default' }, autoCancel: true, smallIcon: 'ic_launcher' },
  });
}

/** The persistent notification that keeps the process alive while MQTT connections are watched. */
export async function startServiceNotification(brokerNames: string[], localBrokerText: string | null = null, exitLabel = 'Exit'): Promise<void> {
  await requestNotificationPermission();
  await ensureChannels();
  await notifee.displayNotification({
    id: SERVICE_ID,
    title: 'myDevice MQTT',
    body: [brokerNames.length > 0 ? `Listening for notifications: ${brokerNames.join(', ')}` : null, localBrokerText]
      .filter(Boolean)
      .join('\n'),
    android: {
      channelId: SERVICE_CHANNEL,
      asForegroundService: true,
      foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_DATA_SYNC],
      ongoing: true,
      pressAction: { id: 'default' },
      actions: [{ title: exitLabel, pressAction: { id: EXIT_ACTION } }],
      smallIcon: 'ic_launcher',
    },
  });
}

/** The notification's Exit button: stops the broker and the service and closes the app completely. */
export function exitApp(): Promise<void> {
  return quitApp({
    stopBroker: () => localBroker.stop(),
    stopService: async () => {
      await notifee.stopForegroundService();
      await notifee.cancelAllNotifications();
    },
    kill: () => {
      if (!localBroker.quit()) BackHandler.exitApp();
    },
  });
}

export async function stopServiceNotification(): Promise<void> {
  await notifee.stopForegroundService();
}

/** Must run at app start, outside React: the service task never resolves, so the process stays alive. */
export function registerServiceTask(): void {
  notifee.registerForegroundService(() => new Promise<void>(() => {}));
  const onEvent = async ({ type, detail }: Event) => {
    if (type === EventType.ACTION_PRESS && detail.pressAction?.id === EXIT_ACTION) await exitApp();
  };
  notifee.onBackgroundEvent(onEvent);
  notifee.onForegroundEvent((e) => void onEvent(e));
}
