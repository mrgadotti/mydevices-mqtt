import { ensureUniqueLongIds, newBroker, newMetric } from '../src/domain/defaults';
import { serializeMetrics } from '../src/domain/serialize';
import type { Metric } from '../src/domain/types';
import { WIDGET_ORDER, WIDGET_SPECS } from '../src/domain/widgets';
import { clientOptionsFor } from '../src/mqtt/connect';
import { MqttConnection } from '../src/mqtt/MqttConnection';
import { nodeTcp } from '../src/mqtt/tcp.node';

const BASE = 'mqttiot/stress';
const KINDS = WIDGET_ORDER.filter((k) => k !== 'spacer' && k !== 'image');

/** N widgets cycling through the widget kinds, each on its own topic mqttiot/stress/<i>. */
export function stressMetrics(n: number): Metric[] {
  const out: Metric[] = [];
  for (let i = 0; i < n; i++) {
    const kind = KINDS[i % KINDS.length];
    const spec = WIDGET_SPECS[kind];
    const common = { name: `${kind} ${i}`, widget: kind, topic: `${BASE}/${i}` } as Partial<Metric>;
    const items = [{ label: 'A', payload: 'a' }, { label: 'B', payload: 'b' }];
    out.push(
      spec.metricType === 3
        ? newMetric(3, { ...common, minValue: 0, maxValue: 100, displayPayloadValue: true } as Partial<Metric>)
        : spec.metricType === 4
          ? newMetric(4, { ...common, items } as Partial<Metric>)
          : newMetric(spec.metricType, common),
    );
  }
  return ensureUniqueLongIds(out);
}

async function connect(host: string) {
  const c = new MqttConnection(clientOptionsFor(newBroker({ address: host }), nodeTcp));
  c.start();
  await new Promise<void>((resolve) => {
    const t = setInterval(() => c.status === 'connected' && (clearInterval(t), resolve()), 50);
  });
  return c;
}

/** usage: tsx tools/stress.ts publish <n> <host> | burst <n> <msgsPerSec> <seconds> <host> */
async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === 'publish') {
    const [n, host] = [Number(rest[0]), rest[1] ?? 'broker.emqx.io'];
    const c = await connect(host);
    await c.publish(`${BASE}/metrics`, serializeMetrics(stressMetrics(n)), 1, true);
    for (let i = 0; i < n; i++) await c.publish(`${BASE}/${i}`, String(i % 100), 1, true);
    console.log(`published ${n} widgets to ${BASE}/metrics (retained)`);
    c.stop();
  } else if (mode === 'burst') {
    const [n, rate, secs, host] = [Number(rest[0]), Number(rest[1]), Number(rest[2]), rest[3] ?? 'broker.emqx.io'];
    const c = await connect(host);
    let sent = 0;
    const t = setInterval(() => {
      void c.publish(`${BASE}/${Math.floor(Math.random() * n)}`, String(Math.floor(Math.random() * 100)), 0, false);
      sent++;
    }, 1000 / rate);
    await new Promise((r) => setTimeout(r, secs * 1000));
    clearInterval(t);
    console.log(`sent ${sent} messages`);
    c.stop();
  }
  process.exit(0);
}
if (require.main === module) void main();
