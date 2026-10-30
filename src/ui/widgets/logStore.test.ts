import { newMetric } from '../../domain/defaults';
import type { Metric } from '../../domain/types';
import { clearLog, feedLogs, getLog, resetLogs } from './logStore';

const log = (topic: string, opts: Metric['opts'] = {}) => ({ ...newMetric(1), topic, widget: 'log', opts }) as Metric;

afterEach(() => resetLogs());

describe('feedLogs', () => {
  it('feeds every matching log widget with the concrete topic and message flags', () => {
    const all = log('#');
    const sensors = log('home/+/temp');
    const other = log('other/#');
    const list = [all, sensors, other];
    expect(feedLogs(list, 'home/kitchen/temp', '21.5', 1, true, 1000)).toBe(2);
    expect(feedLogs(list, 'home/kitchen/hum', '40', 0, false, 2000)).toBe(1);
    expect(getLog(all).map((l) => [l.topic, l.payload, l.qos, l.retained, l.time])).toEqual([
      ['home/kitchen/temp', '21.5', 1, true, 1000],
      ['home/kitchen/hum', '40', 0, false, 2000],
    ]);
    expect(getLog(sensors)).toHaveLength(1);
    expect(getLog(other)).toHaveLength(0);
  });
  it('ignores non-log widgets, empty filters and $ topics for a bare #', () => {
    const value = { ...newMetric(1), topic: 'a/b' } as Metric;
    const empty = log('');
    const all = log('#');
    expect(feedLogs([value, empty, all], 'a/b', 'x', 0, false, 1)).toBe(1);
    expect(feedLogs([all], '$SYS/x', 'x', 0, false, 1)).toBe(0);
  });
  it('keeps only the configured number of newest lines', () => {
    const m = log('t', { maxLines: 10 });
    for (let i = 0; i < 25; i++) feedLogs([m], 't', String(i), 0, false, i);
    expect(getLog(m).map((l) => l.payload)).toEqual(['15', '16', '17', '18', '19', '20', '21', '22', '23', '24']);
  });
  it('defaults to 500 lines', () => {
    const m = log('t');
    for (let i = 0; i < 510; i++) feedLogs([m], 't', String(i), 0, false, i);
    expect(getLog(m)).toHaveLength(500);
    expect(getLog(m)[0].payload).toBe('10');
  });
  it('shrinks the buffer when the option is lowered and clears on demand', () => {
    const m = log('t');
    for (let i = 0; i < 40; i++) feedLogs([m], 't', String(i), 0, false, i);
    expect(getLog({ ...m, opts: { maxLines: 10 } })).toHaveLength(10);
    clearLog(m.id);
    expect(getLog(m)).toHaveLength(0);
  });
});
