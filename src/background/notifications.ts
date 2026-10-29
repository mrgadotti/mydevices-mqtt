import notifee, { AndroidForegroundServiceType, AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import type { NotificationContent } from '../domain/notification';

/** Local notifications only: Notifee draws them on the device, no push service, token or Firebase involved. */

const EVENTS_CHANNEL = 'mqtt-events';
const SERVICE_CHANNEL = 'mqtt-service';
const SERVICE_ID = 'mqtt-iot-service';

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
export async function startServiceNotification(brokerNames: string[]): Promise<void> {
  await requestNotificationPermission();
  await ensureChannels();
  await notifee.displayNotification({
    id: SERVICE_ID,
    title: 'myDevice MQTT',
    body: `Listening for notifications: ${brokerNames.join(', ')}`,
    android: {
      channelId: SERVICE_CHANNEL,
      asForegroundService: true,
      foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_DATA_SYNC],
      ongoing: true,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
    },
  });
}

export async function stopServiceNotification(): Promise<void> {
  await notifee.stopForegroundService();
}

/** Must run at app start, outside React: the service task never resolves, so the process stays alive. */
export function registerServiceTask(): void {
  notifee.registerForegroundService(() => new Promise<void>(() => {}));
  notifee.onBackgroundEvent(async () => {});
}
