import { appendLog, DEFAULT_LOG_LINES, formatLogLine, formatLogTime, logCapacity, MAX_LOG_LINES, MAX_LOG_PAYLOAD, MIN_LOG_LINES, trimLog, truncatePayload, type LogLine } from './logBuffer';

const line = (id: number, extra: Partial<LogLine> = {}): LogLine => ({ id, time: 0, topic: 't', payload: String(id), qos: 0, retained: false, ...extra });

describe('log ring buffer', () => {
  it('keeps the newest lines in order and drops the oldest beyond the capacity', () => {
    let buf: LogLine[] = [];
    for (let i = 1; i <= 25; i++) buf = appendLog(buf, line(i), 10);
    expect(buf).toHaveLength(10);
    expect(buf.map((l) => l.id)).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
  });
  it('does not mutate the previous buffer', () => {
    const a = appendLog([], line(1), 10);
    const b = appendLog(a, line(2), 10);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(2);
  });
  it('clamps the capacity', () => {
    expect(logCapacity(NaN)).toBe(DEFAULT_LOG_LINES);
    expect(logCapacity(1)).toBe(MIN_LOG_LINES);
    expect(logCapacity(1e9)).toBe(MAX_LOG_LINES);
    expect(logCapacity(250.4)).toBe(250);
  });
  it('trims an existing buffer when the capacity shrinks', () => {
    const buf = Array.from({ length: 30 }, (_, i) => line(i));
    expect(trimLog(buf, 10).map((l) => l.id)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
    expect(trimLog(buf, 100)).toBe(buf);
  });
  it('truncates huge payloads', () => {
    expect(truncatePayload('abc')).toBe('abc');
    expect(truncatePayload('x'.repeat(MAX_LOG_PAYLOAD + 5))).toHaveLength(MAX_LOG_PAYLOAD + 3);
  });
});

describe('formatting', () => {
  it('formats the time as HH:MM:SS.mmm', () => {
    expect(formatLogTime(new Date(2026, 0, 2, 3, 4, 5, 6).getTime())).toBe('03:04:05.006');
    expect(formatLogTime(new Date(2026, 0, 2, 13, 14, 15, 678).getTime())).toBe('13:14:15.678');
  });
  it('formats a line with QoS and the retained flag', () => {
    const t = new Date(2026, 0, 2, 3, 4, 5, 6).getTime();
    expect(formatLogLine(line(1, { time: t, topic: 'a/b', payload: 'hi', qos: 1, retained: true }))).toBe('03:04:05.006 a/b hi [QoS 1] [R]');
    expect(formatLogLine(line(1, { time: t, topic: 'a/b', payload: 'hi' }))).toBe('03:04:05.006 a/b hi [QoS 0]');
  });
});
