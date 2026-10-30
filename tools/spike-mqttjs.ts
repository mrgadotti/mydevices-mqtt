import { createJsClient } from '../src/mqtt/mqttjs';
import { nodeTcp } from '../src/mqtt/tcp.node';

const host = process.argv[2] ?? 'broker.emqx.io';
const topic = `mqttiot/spike/${Date.now()}`;
const c = createJsClient(nodeTcp({ host, port: 1883, tls: false, trust: false }), {
  clientId: `spike-${Date.now()}`,
  keepalive: 30,
  clean: true,
});
const timer = setTimeout(() => { console.error('TIMEOUT'); process.exit(1); }, 15000);
c.on('error', (e) => console.error('error', e.message));
c.on('connect', () => {
  console.log('connected');
  c.subscribe(topic, { qos: 2 }, (err, g) => {
    console.log('subscribed', err?.message, JSON.stringify(g));
    c.publish(topic, 'hello-qos2', { qos: 2, retain: false }, (e) => console.log('publish done', e?.message));
  });
});
c.on('message', (t, p, pkt) => {
  console.log('message', t, p.toString(), 'qos', pkt.qos);
  clearTimeout(timer);
  c.end(false, {}, () => { console.log('ended'); process.exit(0); });
});
