import { mqttTopicMatches as m } from './topicFilter';

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
