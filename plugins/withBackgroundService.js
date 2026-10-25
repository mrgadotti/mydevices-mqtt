// Notifee's foreground service defaults to the time-limited "shortService" type. MQTT needs to stay connected for as
// long as notification tiles exist, so the service is declared as "dataSync" (Android 14+ requires a type and permission).
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = (config) =>
  withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const permissions = manifest['uses-permission'] ?? (manifest['uses-permission'] = []);
    for (const name of [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.WAKE_LOCK',
    ]) {
      if (!permissions.some((p) => p.$['android:name'] === name)) permissions.push({ $: { 'android:name': name } });
    }

    const app = manifest.application[0];
    const services = app.service ?? (app.service = []);
    if (!services.some((s) => s.$['android:name'] === 'app.notifee.core.ForegroundService')) {
      services.push({
        $: {
          'android:name': 'app.notifee.core.ForegroundService',
          'android:foregroundServiceType': 'dataSync',
          'tools:replace': 'android:foregroundServiceType',
        },
      });
    }
    return c;
  });
