import { quitApp } from './exit';

describe('quitApp', () => {
  it('stops the broker, then the service, then kills the process', async () => {
    const calls: string[] = [];
    await quitApp({
      stopBroker: async () => void calls.push('broker'),
      stopService: async () => void calls.push('service'),
      kill: () => void calls.push('kill'),
    });
    expect(calls).toEqual(['broker', 'service', 'kill']);
  });

  it('still stops the service and kills the process when a step fails', async () => {
    const calls: string[] = [];
    await quitApp({
      stopBroker: async () => {
        throw new Error('broker');
      },
      stopService: async () => {
        calls.push('service');
        throw new Error('service');
      },
      kill: () => void calls.push('kill'),
    });
    expect(calls).toEqual(['service', 'kill']);
  });
});
