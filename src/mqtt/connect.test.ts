import { newBroker } from '../domain/defaults';
import { clientOptionsFor, transportFor, type TcpDriver } from './connect';

const noopDriver: TcpDriver = () => () => ({ send() {}, close() {} });

describe('clientOptionsFor (connect options)', () => {
  it('uses keepalive 30 and the broker client id', () => {
    const o = clientOptionsFor(newBroker({ clientId: 'abc' }), noopDriver);
    expect(o).toMatchObject({ clientId: 'abc', keepAlive: 30, cleanSession: true });
    expect(o.username).toBeUndefined();
    expect(o.password).toBeUndefined();
  });

  it('sends user and password only when non-blank after trimming', () => {
    const f = noopDriver;
    expect(clientOptionsFor(newBroker({ user: ' u ', password: 'p' }), f)).toMatchObject({ username: ' u ', password: 'p' });
    const blank = clientOptionsFor(newBroker({ user: '  ', password: '  ' }), f);
    expect(blank.username).toBeUndefined();
    expect(blank.password).toBeUndefined();
  });

  it('omits a password that has no user name', () => {
    const f = noopDriver;
    expect(clientOptionsFor(newBroker({ user: '', password: 'p' }), f).password).toBeUndefined();
  });
});

describe('transportFor', () => {
  const calls: unknown[] = [];
  const tcp: TcpDriver = (o) => {
    calls.push(o);
    return () => ({ send() {}, close() {} });
  };
  beforeEach(() => (calls.length = 0));

  it('uses plain tcp on the broker port', () => {
    transportFor(newBroker({ address: 'test.mosquitto.org', port: '1883' }), tcp);
    expect(calls).toEqual([{ host: 'test.mosquitto.org', port: 1883, tls: false, trust: false }]);
  });

  it('uses tls when ssl is set and passes the trust flag', () => {
    transportFor(newBroker({ address: ' h ', port: '8883', ssl: true, trust: true }), tcp);
    expect(calls).toEqual([{ host: 'h', port: 8883, tls: true, trust: true }]);
  });

  it('falls back to 1883 for an invalid port', () => {
    transportFor(newBroker({ address: 'h', port: 'abc' }), tcp);
    expect(calls).toEqual([{ host: 'h', port: 1883, tls: false, trust: false }]);
  });

  it('treats ws:// and wss:// addresses as websocket urls and skips tcp', () => {
    const f = transportFor(newBroker({ address: 'ws://test.mosquitto.org:8080' }), tcp);
    expect(typeof f).toBe('function');
    expect(calls).toEqual([]);
  });
});
