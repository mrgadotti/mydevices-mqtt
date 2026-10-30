import { LocalBroker, LocalBrokerDriver, nativeDriver, stubDriver } from './LocalBroker';

function fakeDriver() {
  let running = false;
  const calls: string[] = [];
  const driver: LocalBrokerDriver = {
    start: async (port) => { calls.push(`start:${port}`); running = true; },
    stop: async () => { calls.push('stop'); running = false; },
    isRunning: () => running,
    getNetworkInfo: () => ({ ips: ['192.168.1.20'], hostname: null, alias: null }),
    onExit: () => () => {},
    onLog: () => () => {},
  };
  return { driver, calls };
}

describe('LocalBroker', () => {
  it('start is idempotent for the same port and restarts for a different one', async () => {
    const { driver, calls } = fakeDriver();
    const b = new LocalBroker(driver);
    await Promise.all([b.start(1883), b.start(1883)]);
    expect(calls).toEqual(['start:1883']);
    await b.start(1884);
    expect(calls).toEqual(['start:1883', 'stop', 'start:1884']);
  });

  it('stop is idempotent and toggles active, notifying subscribers', async () => {
    const { driver, calls } = fakeDriver();
    const b = new LocalBroker(driver);
    let changes = 0;
    b.subscribe(() => changes++);
    await b.stop();
    expect(calls).toEqual([]);
    await b.start(1883);
    expect(b.active).toBe(true);
    expect(b.notificationText()).toBe('Local broker running at 192.168.1.20:1883');
    await Promise.all([b.stop(), b.stop()]);
    expect(b.active).toBe(false);
    expect(b.notificationText()).toBeNull();
    expect(calls).toEqual(['start:1883', 'stop']);
    expect(changes).toBe(2);
  });

  it('a failed start leaves the broker inactive', async () => {
    const { driver } = fakeDriver();
    driver.start = async () => { throw new Error('port in use'); };
    const b = new LocalBroker(driver);
    await expect(b.start(1883)).rejects.toThrow('port in use');
    expect(b.active).toBe(false);
    await expect(b.start(1883)).rejects.toThrow('port in use');
  });

  it('falls back to a throws-free stub without the native module', async () => {
    const d = nativeDriver(null);
    expect(d).toBe(stubDriver);
    await d.start(1883);
    expect(d.isRunning()).toBe(false);
    expect(d.getNetworkInfo().ips).toEqual([]);
  });
});
