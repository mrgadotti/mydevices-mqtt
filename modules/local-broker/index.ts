import { requireOptionalNativeModule } from 'expo-modules-core';

export type LocalBrokerNetworkInfo = { ips: string[]; hostname: string | null; alias: string | null };

export type LocalBrokerExitEvent = { code: number; restarting: boolean };
export type LocalBrokerLogEvent = { line: string };

type Subscription = { remove(): void };

/** The native module (Android only); null in jest, iOS and builds without it. */
export interface LocalBrokerNative {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getNetworkInfo(): LocalBrokerNetworkInfo;
  addListener(event: 'onExit', listener: (e: LocalBrokerExitEvent) => void): Subscription;
  addListener(event: 'onLog', listener: (e: LocalBrokerLogEvent) => void): Subscription;
}

let native: LocalBrokerNative | null = null;
try {
  native = requireOptionalNativeModule<LocalBrokerNative>('LocalBroker');
} catch {
  native = null;
}

export default native;
