/**
 * Whether `topic` (a concrete topic name) matches the subscription `filter`, following MQTT 3.1.1 section 4.7:
 * `+` matches exactly one level, `#` (last level only) matches the parent and any number of child levels, and topics
 * starting with `$` never match a filter whose first level is a wildcard. Invalid filters match nothing.
 */
export function mqttTopicMatches(filter: string, topic: string): boolean {
  if (filter.length === 0 || topic.length === 0) return false;
  const f = filter.split('/');
  const t = topic.split('/');
  for (let i = 0; i < f.length; i++) {
    const level = f[i];
    if (level.includes('#') && (level !== '#' || i !== f.length - 1)) return false;
    if (level.includes('+') && level !== '+') return false;
  }
  if (topic.startsWith('$') && (f[0] === '#' || f[0] === '+')) return false;
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (i >= t.length) return false;
    if (f[i] !== '+' && f[i] !== t[i]) return false;
  }
  return f.length === t.length;
}

/**
 * Whether every topic matched by `other` is also matched by `filter` (so subscribing to both is redundant). `$` topics
 * never match a filter that starts with a wildcard, so such a filter does not cover them.
 */
export function filterCovers(filter: string, other: string): boolean {
  if (filter.length === 0 || other.length === 0) return false;
  const f = filter.split('/');
  const o = other.split('/');
  const startsWithDollar = o[0].startsWith('$');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return !(i === 0 && startsWithDollar);
    if (i >= o.length || o[i] === '#') return false;
    if (f[i] === '+') {
      if (i === 0 && startsWithDollar) return false;
      continue;
    }
    if (f[i] !== o[i]) return false;
  }
  return f.length === o.length;
}

/**
 * Drops the subscriptions another one already covers: a broker that gets overlapping subscriptions from one client
 * delivers a copy of every matching message per subscription (Mosquitto does), which would run each message twice.
 * The covering filter takes the highest QoS of the filters it absorbs; equal topics merge likewise.
 */
export function reduceSubscriptions(list: { topic: string; qos: number }[]): { topic: string; qos: number }[] {
  const qos = new Map<string, number>();
  for (const s of list) if (s.topic.length > 0) qos.set(s.topic, Math.max(qos.get(s.topic) ?? 0, s.qos));
  const topics = [...qos.keys()];
  const roots = topics.filter((t) => !topics.some((o) => o !== t && filterCovers(o, t)));
  const out = new Map(roots.map((t) => [t, qos.get(t) ?? 0]));
  for (const t of topics) {
    if (out.has(t)) continue;
    const root = roots.find((r) => filterCovers(r, t));
    if (root) out.set(root, Math.max(out.get(root) ?? 0, qos.get(t) ?? 0));
  }
  return roots.map((topic) => ({ topic, qos: out.get(topic) ?? 0 }));
}
