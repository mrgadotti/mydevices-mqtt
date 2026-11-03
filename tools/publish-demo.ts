import { newBroker } from '../src/domain/defaults';
import { serializeMetrics } from '../src/domain/serialize';
import { clientOptionsFor } from '../src/mqtt/connect';
import { MqttConnection } from '../src/mqtt/MqttConnection';
import { nodeTcp } from '../src/mqtt/tcp.node';
import { DEMO_BASE, DEMO_VALUES, WIDGET_VALUES, demoMetrics, demoMetricsWithData, scriptDemoMetrics, widgetDemoMetrics } from './demo';

/** usage: tsx tools/publish-demo.ts [values|metrics|widgets|scripts|metrics-data|history] [host] ('history' feeds the history chart with a noisy sine for 5 minutes) */
async function main() {
  const what = process.argv[2] ?? 'values';
  const host = process.argv[3] ?? 'broker.emqx.io';
  const c = new MqttConnection(clientOptionsFor(newBroker({ address: host }), nodeTcp));
  c.start();
  await new Promise<void>((resolve) => {
    const t = setInterval(() => c.status === 'connected' && (clearInterval(t), resolve()), 50);
  });
  if (what === 'widgets') {
    await c.publish(`${DEMO_BASE}/widgets`, serializeMetrics(widgetDemoMetrics()), 1, true);
    for (const [k, v] of Object.entries(WIDGET_VALUES)) await c.publish(`mqttiot/widgets/${k}`, v, 1, true);
    console.log(`published widget demo to ${DEMO_BASE}/widgets and values under mqttiot/widgets/ (retained)`);
  } else if (what === 'history') {
    const topic = 'mqttiot/widgets/historyChart';
    console.log(`publishing a sine wave to ${topic} every 5 s for 5 minutes`);
    for (let i = 0; i < 60; i++) {
      const v = 50 + 30 * Math.sin(i / 6) + (Math.random() - 0.5) * 6;
      await c.publish(topic, v.toFixed(1), 0, false);
      await new Promise((r) => setTimeout(r, 5000));
    }
  } else if (what === 'scripts') {
    await c.publish(`${DEMO_BASE}/scripts`, serializeMetrics(scriptDemoMetrics()), 1, true);
    console.log(`published script demo to ${DEMO_BASE}/scripts (retained)`);
  } else if (what === 'metrics-data') {
    await c.publish(`${DEMO_BASE}/metrics`, serializeMetrics(demoMetricsWithData()), 1, true);
    console.log(`published metrics with data to ${DEMO_BASE}/metrics (retained)`);
  } else if (what === 'metrics') {
    await c.publish(`${DEMO_BASE}/metrics`, serializeMetrics(demoMetrics()), 1, true);
    console.log(`published metrics to ${DEMO_BASE}/metrics (retained)`);
  } else {
    for (const [k, v] of Object.entries(DEMO_VALUES)) {
      await c.publish(`${DEMO_BASE}/${k}`, v, 1, true);
      console.log(`${DEMO_BASE}/${k} = ${v}`);
    }
  }
  c.stop();
  process.exit(0);
}
void main();
