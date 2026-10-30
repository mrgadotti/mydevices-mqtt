import { mqttTopicMatches as m, filterCovers as covers, reduceSubscriptions } from './topicFilter';

describe('mqttTopicMatches', () => {
  it('matches exact topics', () => {
    expect(m('a/b', 'a/b')).toBe(true);
    expect(m('a/b', 'a/c')).toBe(false);
    expect(m('a/b', 'a')).toBe(false);
    expect(m('a', 'a/b')).toBe(false);
    expect(m('a/b/c', 'a/b')).toBe(false);
  });
  it('is case sensitive and keeps empty levels', () => {
    expect(m('A/b', 'a/b')).toBe(false);
    expect(m('a//b', 'a//b')).toBe(true);
    expect(m('a/+/b', 'a//b')).toBe(true);
    expect(m('/a', '/a')).toBe(true);
    expect(m('/a', 'a')).toBe(false);
    expect(m('+/a', '/a')).toBe(true);
  });
  it('+ matches exactly one level', () => {
    expect(m('a/+/c', 'a/b/c')).toBe(true);
    expect(m('a/+/c', 'a/b/d')).toBe(false);
    expect(m('a/+/c', 'a/b/x/c')).toBe(false);
    expect(m('a/+', 'a')).toBe(false);
    expect(m('a/+', 'a/b')).toBe(true);
    expect(m('a/+', 'a/b/c')).toBe(false);
    expect(m('+/+', 'a/b')).toBe(true);
    expect(m('+', 'a')).toBe(true);
    expect(m('+', 'a/b')).toBe(false);
  });
  it('# matches the parent and all descendants', () => {
    expect(m('#', 'a')).toBe(true);
    expect(m('#', 'a/b/c')).toBe(true);
    expect(m('a/#', 'a')).toBe(true);
    expect(m('a/#', 'a/b')).toBe(true);
    expect(m('a/#', 'a/b/c')).toBe(true);
    expect(m('a/#', 'ab')).toBe(false);
    expect(m('a/#', 'b/a')).toBe(false);
    expect(m('a/+/#', 'a/b')).toBe(true);
    expect(m('a/+/#', 'a')).toBe(false);
    expect(m('a/+/#', 'a/b/c/d')).toBe(true);
  });
  it('does not let leading wildcards match $ topics', () => {
    expect(m('#', '$SYS/broker/uptime')).toBe(false);
    expect(m('+/broker/uptime', '$SYS/broker/uptime')).toBe(false);
    expect(m('+/#', '$SYS/x')).toBe(false);
    expect(m('$SYS/#', '$SYS/broker/uptime')).toBe(true);
    expect(m('$SYS/+/uptime', '$SYS/broker/uptime')).toBe(true);
    expect(m('$SYS/broker/uptime', '$SYS/broker/uptime')).toBe(true);
    expect(m('a/#', 'a/$b')).toBe(true);
    expect(m('a/+', 'a/$b')).toBe(true);
  });
  it('rejects invalid filters and empty input', () => {
    expect(m('a/#/b', 'a/x/b')).toBe(false);
    expect(m('a#', 'a')).toBe(false);
    expect(m('a/b#', 'a/b')).toBe(false);
    expect(m('a+/b', 'ab/b')).toBe(false);
    expect(m('a/+b', 'a/xb')).toBe(false);
    expect(m('##', 'a')).toBe(false);
    expect(m('', 'a')).toBe(false);
    expect(m('#', '')).toBe(false);
  });
  it('does not treat wildcards in the topic name specially', () => {
    expect(m('a/b', 'a/+')).toBe(false);
    expect(m('a/+', 'a/+')).toBe(true);
  });
});

describe('filterCovers', () => {
  it('a wildcard covers the filters it would deliver anyway', () => {
    expect(covers('#', 'a/b')).toBe(true);
    expect(covers('a/#', 'a/b/c')).toBe(true);
    expect(covers('a/#', 'a')).toBe(true);
    expect(covers('a/+', 'a/b')).toBe(true);
    expect(covers('+/b', 'a/b')).toBe(true);
    expect(covers('a/+/#', 'a/b/c')).toBe(true);
    expect(covers('a/#', 'a/+/c')).toBe(true);
    expect(covers('#', '+/#')).toBe(true);
  });
  it('does not cover what it would not deliver', () => {
    expect(covers('a/b', 'a/b/c')).toBe(false);
    expect(covers('a/+', 'a/b/c')).toBe(false);
    expect(covers('a/+', 'a/#')).toBe(false);
    expect(covers('a/b', 'a/+')).toBe(false);
    expect(covers('a/#', 'b/c')).toBe(false);
    expect(covers('+', 'a/b')).toBe(false);
  });
  it('keeps $ topics apart from filters that start with a wildcard', () => {
    expect(covers('#', '$SYS/x')).toBe(false);
    expect(covers('+/x', '$SYS/x')).toBe(false);
    expect(covers('$SYS/#', '$SYS/x')).toBe(true);
    expect(covers('#', '$SYS/#')).toBe(false);
  });
});

describe('reduceSubscriptions', () => {
  it('drops subscriptions a wildcard already covers, so the broker sends one copy', () => {
    expect(reduceSubscriptions([{ topic: 'esp32/btn', qos: 0 }, { topic: '#', qos: 0 }, { topic: 'esp32/led', qos: 0 }])).toEqual([{ topic: '#', qos: 0 }]);
  });
  it('raises the wildcard qos to the highest covered one', () => {
    expect(reduceSubscriptions([{ topic: 'a/b', qos: 2 }, { topic: 'a/#', qos: 0 }, { topic: 'a/c', qos: 1 }])).toEqual([{ topic: 'a/#', qos: 2 }]);
  });
  it('keeps unrelated and $ subscriptions, and merges equal topics by highest qos', () => {
    const r = reduceSubscriptions([{ topic: 'x/y', qos: 0 }, { topic: '#', qos: 0 }, { topic: '$SYS/broker/uptime', qos: 0 }, { topic: 'x/y', qos: 1 }]);
    expect(r.sort((a, b) => a.topic.localeCompare(b.topic))).toEqual([{ topic: '#', qos: 1 }, { topic: '$SYS/broker/uptime', qos: 0 }]);
  });
  it('leaves independent topics alone and ignores empty ones', () => {
    expect(reduceSubscriptions([{ topic: 'a', qos: 0 }, { topic: 'b/c', qos: 1 }, { topic: '', qos: 0 }])).toEqual([{ topic: 'a', qos: 0 }, { topic: 'b/c', qos: 1 }]);
  });
});
