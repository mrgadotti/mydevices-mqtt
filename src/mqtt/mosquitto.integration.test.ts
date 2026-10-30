import { newBroker, uuid } from '../domain/defaults';
import { clientOptionsFor } from './connect';
import { MqttConnection } from './MqttConnection';
import { fromUtf8 } from './text';
import { nodeTcp } from './tcp.node';

/** Talks to the public broker test.mosquitto.org (needs network). */
const HOST = process.env.MQTT_IT_HOST ?? 'test.mosquitto.org';
const topicBase = () => `mqttiot/it/${uuid()}`;

const conn = (address: string, port: string) =>
  new MqttConnection(clientOptionsFor(newBroker({ address, port }), nodeTcp), { retryMs: 1000 });

const until = <T>(fn: () => T | undefined, ms = 15000): Promise<T> =>
  new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      const v = fn();
      if (v !== undefined) return resolve(v);
      if (Date.now() - t0 > ms) return reject(new Error('timeout'));
      setTimeout(tick, 50);
    };
    tick();
  });

const waitConnected = (c: MqttConnection) => until(() => (c.status === 'connected' ? true : undefined));

describe.each([
  ['tcp', HOST, '1883'],
  ['websocket', `ws://${HOST}:8080`, '8080'],
])('test.mosquitto.org over %s', (_name, address, port) => {
  it('delivers a qos 1 message between two clients', async () => {
    const topic = `${topicBase()}/q1`;
    const sub = conn(address, port);
    const pub = conn(address, port);
    const got: string[] = [];
    sub.onMessage((t, p) => t === topic && got.push(fromUtf8(p)));
    sub.setSubscriptions([{ topic, qos: 1 }]);
    sub.start();
    pub.start();
    try {
      await Promise.all([waitConnected(sub), waitConnected(pub)]);
      await new Promise((r) => setTimeout(r, 500));
      await pub.publish(topic, 'olá ✓', 1, false);
      await until(() => (got.length > 0 ? true : undefined));
      expect(got).toEqual(['olá ✓']);
    } finally {
      sub.stop();
      pub.stop();
    }
  });

  it('delivers a retained message to a late subscriber and clears it', async () => {
    const topic = `${topicBase()}/retained`;
    const pub = conn(address, port);
    pub.start();
    await waitConnected(pub);
    await pub.publish(topic, 'kept', 1, true);
    const late = conn(address, port);
    const got: [string, boolean][] = [];
    late.onMessage((t, p, r) => t === topic && got.push([fromUtf8(p), r]));
    late.setSubscriptions([{ topic, qos: 0 }]);
    late.start();
    try {
      await until(() => (got.length > 0 ? true : undefined));
      expect(got[0]).toEqual(['kept', true]);
    } finally {
      await pub.publish(topic, '', 1, true);
      late.stop();
      pub.stop();
    }
  });
});

it('reports an unreachable broker and keeps retrying', async () => {
  const c = new MqttConnection(clientOptionsFor(newBroker({ address: '127.0.0.1', port: '1' }), nodeTcp), { retryMs: 200 });
  const statuses: string[] = [];
  c.onStatus((s) => statuses.push(s));
  c.start();
  await until(() => (statuses.filter((s) => s === 'connecting').length >= 2 ? true : undefined), 5000);
  expect(c.status).not.toBe('connected');
  expect(c.lastError).not.toBe('');
  c.stop();
});
