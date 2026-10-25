import { newBroker } from '../src/domain/defaults';
import { clientOptionsFor } from '../src/mqtt/connect';
import { MqttConnection } from '../src/mqtt/MqttConnection';
import { fromUtf8 } from '../src/mqtt/packets';
import { nodeTcp } from '../src/mqtt/tcp.node';

/** usage: tsx tools/watch.ts <host> <seconds> <topic-filter>...  (prints every received message) */
const [host, seconds, ...filters] = process.argv.slice(2);
const c = new MqttConnection(clientOptionsFor(newBroker({ address: host }), nodeTcp));
c.onMessage((t, p, r) => console.log(`${new Date().toISOString().slice(11, 19)} ${t} ${JSON.stringify(fromUtf8(p))}${r ? ' (retained)' : ''}`));
c.setSubscriptions(filters.map((topic) => ({ topic, qos: 1 })));
c.start();
console.log(`watching ${filters.join(', ')} on ${host} for ${seconds}s`);
setTimeout(() => process.exit(0), Number(seconds) * 1000);
