/** Texts for the notification feature. */
export const X_EN = {
  notification: 'Notification',
  notification_metric_description:
    'This metric is intended for notifications: every message received on the topic raises a notification on this device, even when the app is in the background. No push service is involved: the app keeps its own connection to the broker.',
  notification_title: 'Notification title (empty - use the metric name)',
  notification_only_on_change: 'Notify only if the payload changed since the previous message',
  notification_permission_denied: 'Notifications are disabled for this app in the system settings',
} as const;
