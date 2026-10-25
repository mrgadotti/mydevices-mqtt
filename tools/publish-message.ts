import { newBroker } from '../src/domain/defaults';
import { clientOptionsFor } from '../src/mqtt/connect';
import { MqttConnection } from '../src/mqtt/MqttConnection';
import { nodeTcp } from '../src/mqtt/tcp.node';

/** usage: tsx tools/publish-message.ts <host> <topic> <payload> [retained] */
async function main() {
  const [host, topic, payload, retained] = process.argv.slice(2);
  if (!host || !topic || payload === undefined) throw new Error('usage: publish-message <host> <topic> <payload> [retained]');
  const c = new MqttConnection(clientOptionsFor(newBroker({ address: host }), nodeTcp));
  c.start();
  await new Promise<void>((resolve) => {
    const t = setInterval(() => c.status === 'connected' && (clearInterval(t), resolve()), 50);
  });
  await c.publish(topic, payload, 1, retained === 'retained');
  console.log(`published ${JSON.stringify(payload)} to ${topic} on ${host}`);
  c.stop();
  process.exit(0);
}
void main();
