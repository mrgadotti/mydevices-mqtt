import { extractJsonPath } from './jsonPath';
import type { NotificationMetric } from './types';

export interface NotificationContent {
  title: string;
  body: string;
}

/**
 * What to show for a message received by a notification tile, or null when nothing should be shown.
 * `metric` is the tile after the message was applied; `payload` the (possibly script-edited) payload text.
 */
export function buildNotification(metric: NotificationMetric, payload: string, changed: boolean): NotificationContent | null {
  if (payload.trim().length === 0) return null;
  if (metric.onlyOnChange && !changed) return null;
  let body = payload;
  if (metric.jsonPath.length > 0) {
    const r = extractJsonPath(payload, metric.jsonPath);
    if (r.ok) body = r.value;
  }
  return { title: metric.title.trim() || metric.name.trim() || 'myDevice MQTT', body };
}
