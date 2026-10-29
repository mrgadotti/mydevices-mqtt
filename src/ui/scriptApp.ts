import { Linking } from 'react-native';
import type { HookEnv, ScriptApp } from '../scripting/hooks';
import type { BrokerSession } from './useBrokerSession';

/** `event.data` is shared by all hooks of a tile for the life of the app. */
const scriptData = new Map<string, unknown>();

/** AppScriptable: what the `app` object does for scripts. */
export function makeHookEnv(session: Pick<BrokerSession, 'publishRaw'>): HookEnv {
  const app: ScriptApp = {
    openUri(first, second) {
      void Linking.openURL(second ?? first).catch(() => {});
    },
    publish(topic, payload, retained, qos) {
      const q = qos > 1 || qos < 0 ? 0 : qos;
      void session.publishRaw(String(topic), String(payload), Boolean(retained), q).catch(() => {});
    },
  };
  return { app, data: scriptData };
}
