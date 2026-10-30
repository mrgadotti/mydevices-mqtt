import { Buffer } from 'buffer';
import process from 'process';
(globalThis as any).Buffer ??= Buffer;
(globalThis as any).process ??= process;

import { createJsClient } from './mqttjs';
import { nativeTcp } from './tcp.native';
import { wsTransport } from './connect';

function run(label: string, factory: ReturnType<typeof nativeTcp>) {
  const topic = `mqttiot/spike/${label}/${Date.now()}`;
  const c = createJsClient(factory, { clientId: `spike-${label}-${Date.now()}`, keepalive: 30, clean: true });
  const t = setTimeout(() => console.log(`SPIKE ${label} TIMEOUT`), 20000);
  c.on('error', (e) => console.log(`SPIKE ${label} error ${e.message}`));
  c.on('connect', () => {
    console.log(`SPIKE ${label} connected`);
    c.subscribe(topic, { qos: 2 }, (err) => {
      console.log(`SPIKE ${label} subscribed ${err?.message ?? 'ok'}`);
      c.publish(topic, 'hello-qos2', { qos: 2 }, (e) => console.log(`SPIKE ${label} publish done ${e?.message ?? 'ok'}`));
    });
  });
  c.on('message', (tp, p, pkt) => {
    clearTimeout(t);
    console.log(`SPIKE ${label} message ${p.toString()} qos ${pkt.qos}`);
    c.end();
  });
}

import { MqttClient as OldClient } from './MqttClient';
function runOld() {
  const c = new OldClient({ clientId: `old-${Date.now()}`, keepAlive: 30, connect: nativeTcp({ host: 'broker.hivemq.com', port: 8883, tls: true, trust: false }) });
  c.onStatus((st, e) => console.log(`SPIKE old-tls ${st} ${e ?? ''}`));
  c.connect();
}

export function runSpike() {
  runOld();
  setTimeout(() => {}, 0);
  run('tcp', nativeTcp({ host: 'broker.emqx.io', port: 1883, tls: false, trust: false }));
  run('tls', nativeTcp({ host: 'broker.hivemq.com', port: 8883, tls: true, trust: false }));
  run('ws', wsTransport('wss://broker.emqx.io:8084/mqtt'));
}
