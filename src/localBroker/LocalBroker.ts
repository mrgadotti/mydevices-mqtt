import { LocalBrokerUsage } from './usage';

/** Controls the embedded Mosquitto broker (Android only). Everything degrades to a no-op where the native module is missing. */

export type LocalBrokerNetworkInfo = { ips: string[]; hostname: string | null; alias: string | null };

/** The platform side. Injectable so the logic below is testable without a device. */
export interface LocalBrokerDriver {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getNetworkInfo(): LocalBrokerNetworkInfo;
  /** Stops the broker and ends the whole app process (Android). Optional: absent in stubs. */
  quit?(): void;
  /** Subscribes to unexpected exits of the broker process; returns the unsubscribe function. */
  onExit(listener: (e: { code: number; restarting: boolean }) => void): () => void;
  /** Subscribes to the broker's log lines; returns the unsubscribe function. */
  onLog(listener: (line: string) => void): () => void;
}

export const NO_NETWORK: LocalBrokerNetworkInfo = { ips: [], hostname: null, alias: null };

/** Driver for jest, iOS and builds without the native module. */
export const stubDriver: LocalBrokerDriver = {
  start: async () => {},
  stop: async () => {},
  isRunning: () => false,
  getNetworkInfo: () => NO_NETWORK,
  onExit: () => () => {},
  onLog: () => () => {},
};

type NativeModule = typeof import('../../modules/local-broker').default;

function loadNative(): NativeModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('../../modules/local-broker') as { default: NativeModule }).default;
  } catch {
    return null;
  }
}

export function nativeDriver(native: NativeModule = loadNative()): LocalBrokerDriver {
  if (!native) return stubDriver;
  return {
    start: (port) => native.start(port),
    stop: () => native.stop(),
    isRunning: () => {
      try { return native.isRunning(); } catch { return false; }
    },
    getNetworkInfo: () => {
      try { return native.getNetworkInfo(); } catch { return NO_NETWORK; }
    },
    quit: () => native.quit(),
    onExit: (l) => {
      const sub = native.addListener('onExit', l);
      return () => sub.remove();
    },
    onLog: (l) => {
      const sub = native.addListener('onLog', (e) => l(e.line));
      return () => sub.remove();
    },
  };
}

/**
 * Idempotent start/stop around a driver, plus a small observable "active" flag. The foreground service consults it so
 * the notification stays up while the broker runs.
 */
export class LocalBroker {
  private port: number | null = null;
  private chain: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  private logListeners = new Set<(line: string) => void>();
  private offLog: (() => void) | null = null;

  constructor(private readonly driver: LocalBrokerDriver) {}

  /** True from a successful start() until stop(), whatever the process does in between (it is restarted on crashes). */
  get active(): boolean {
    return this.port !== null;
  }

  isRunning(): boolean {
    return this.driver.isRunning();
  }

  getNetworkInfo(): LocalBrokerNetworkInfo {
    return this.driver.getNetworkInfo();
  }

  /** Ends the app process through the platform side; false where that is not available. */
  quit(): boolean {
    if (!this.driver.quit) return false;
    this.driver.quit();
    return true;
  }

  /** Starts the broker on `port`; no-op when already running there, restarts when the port differs. */
  start(port: number): Promise<void> {
    return this.enqueue(async () => {
      if (this.port === port && this.driver.isRunning()) return;
      if (this.port !== null && this.port !== port) await this.driver.stop();
      await this.driver.start(port);
      this.port = port;
      this.offLog ??= this.driver.onLog((line) => this.logListeners.forEach((l) => l(line)));
      this.emit();
    });
  }

  /** Stops the broker; no-op when it is not running. */
  stop(): Promise<void> {
    return this.enqueue(async () => {
      if (this.port === null) return;
      this.port = null;
      this.offLog?.();
      this.offLog = null;
      try {
        await this.driver.stop();
      } finally {
        this.emit();
      }
    });
  }

  onExit(listener: (e: { code: number; restarting: boolean }) => void): () => void {
    return this.driver.onExit(listener);
  }

  onLog(listener: (line: string) => void): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  /** Notified whenever `active` changes. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Text for the foreground service notification, or null when the broker is not active. */
  notificationText(): string | null {
    if (this.port === null) return null;
    const ip = this.driver.getNetworkInfo().ips[0];
    return ip ? `Local broker running at ${ip}:${this.port}` : `Local broker running on port ${this.port} (no Wi-Fi)`;
  }

  /** Port and first Wi-Fi address for the notification text (formatted by the caller, so it can be translated). */
  notificationInfo(): { ip: string | null; port: number } | null {
    if (this.port === null) return null;
    return { ip: this.driver.getNetworkInfo().ips[0] ?? null, port: this.port };
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  private enqueue(job: () => Promise<void>): Promise<void> {
    const run = this.chain.then(job);
    this.chain = run.catch(() => {});
    return run;
  }
}

/** The app-wide instance, backed by the native module when present. */
export const localBroker = new LocalBroker(nativeDriver());

/** Shared lifecycle manager for the app-wide broker. */
export const localBrokerUsage = new LocalBrokerUsage(localBroker);
