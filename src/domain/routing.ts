import { fromUtf8 } from '../mqtt/packets';
import { applyMessage } from './metrics';
import { isPending } from './metrics';
import type { Metric } from './types';

export interface Routed {
  metric: Metric;
  changed: boolean;
  jsonError: string;
  /** Whether the tile was in the intermediate state when the message arrived. */
  wasPending: boolean;
  /** The text the tile received ("" for binary image payloads). */
  payloadText: string;
  payload: Uint8Array;
}

/** Port of messageArrived: only tiles whose topic equals the message topic (no wildcard matching) get it. */
export function routeMessage(metrics: Metric[], topic: string, payload: Uint8Array, nowSec: number): Routed[] {
  const out: Routed[] = [];
  for (const m of metrics) {
    if (m.type === 5 && m.kind === 1) continue;
    if (m.topic.length === 0 || m.topic !== topic) continue;
    const wasPending = isPending(m, nowSec);
    const payloadText = m.type === 5 && m.kind !== 2 ? '' : fromUtf8(payload);
    const r = applyMessage(m, payloadText, nowSec);
    out.push({ metric: r.metric, changed: r.changed, jsonError: r.jsonError, wasPending, payloadText, payload });
  }
  return out;
}
