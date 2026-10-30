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
