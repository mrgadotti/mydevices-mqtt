import { newBroker } from '../domain/defaults';
import { LocalBroker, type LocalBrokerDriver } from './LocalBroker';
import { LocalBrokerUsage, localPort } from './usage';

function setup(failStart = false) {
  const calls: string[] = [];
  let running = false;
  const driver: LocalBrokerDriver = {
    start: async (p) => {
      if (failStart) throw new Error('boom');
      calls.push(`start:${p}`);
      running = true;
    },
    stop: async () => { calls.push('stop'); running = false; },
    isRunning: () => running,
    getNetworkInfo: () => ({ ips: [], hostname: null, alias: null }),
    onExit: () => () => {},
    onLog: () => () => {},
  };
  const usage = new LocalBrokerUsage(new LocalBroker(driver));
  return { usage, calls };
}

describe('LocalBrokerUsage', () => {
  it('runs until the last holder lets go', async () => {
    const { usage, calls } = setup();
    await usage.acquire('session:a', 1883);
    await usage.acquire('bg:a', 1883);
    await usage.release('session:a');
    expect(calls).toEqual(['start:1883']);
    await usage.release('bg:a');
    expect(calls).toEqual(['start:1883', 'stop']);
  });

  it('rejects when the start fails and holds nothing', async () => {
    const { usage, calls } = setup(true);
    await expect(usage.acquire('session:a', 1883)).rejects.toThrow('boom');
    await usage.release('session:a');
    expect(calls).toEqual([]);
  });

  it('keeps the broker running for auto-connect local brokers and stops when they go away', async () => {
    const { usage, calls } = setup();
    const a = newBroker({ localBroker: true, autoConnect: true });
    const plain = newBroker({ autoConnect: true });
    await usage.syncAuto([a, plain]);
    expect(calls).toEqual(['start:1883']);
    await usage.acquire('session:x', 1883);
    await usage.syncAuto([{ ...a, autoConnect: false }]);
    expect(calls).toEqual(['start:1883']);
    await usage.release('session:x');
    expect(calls).toEqual(['start:1883', 'stop']);
  });

  it('swallows start failures in syncAuto', async () => {
    const { usage } = setup(true);
    await expect(usage.syncAuto([newBroker({ localBroker: true, autoConnect: true })])).resolves.toBeUndefined();
  });

  it('parses the port with a fallback', () => {
    expect(localPort(newBroker({ port: '1884' }))).toBe(1884);
    expect(localPort(newBroker({ port: 'x' }))).toBe(1883);
  });
});
