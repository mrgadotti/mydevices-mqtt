import fixture from './fixtures/original-export.json';
import { parseMetrics, serializeMetrics } from './serialize';

/**
 * `original-export.json` is what the original app published itself ("PUBLISH METRICS") for the six demo tiles,
 * captured from the phone: the ground truth of the exchange format.
 */
describe('tiles exported by the original app', () => {
  const raw = JSON.stringify(fixture);
  const original = fixture as unknown as Record<string, unknown>[];

  it('has one tile of each of the six types', () => {
    expect(original.map((m) => m.type)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('are read without losing or changing any field', () => {
    const parsed = parseMetrics(raw) as unknown as Record<string, unknown>[];
    expect(parsed).toHaveLength(original.length);
    original.forEach((o, i) => {
      for (const [key, value] of Object.entries(o)) expect([key, parsed[i][key]]).toEqual([key, value]);
    });
  });

  it('are written back with exactly the same field names (nothing invented, nothing dropped)', () => {
    const again = JSON.parse(serializeMetrics(parseMetrics(raw))) as Record<string, unknown>[];
    original.forEach((o, i) => {
      expect(Object.keys(again[i]).sort()).toEqual(Object.keys(o).sort());
      for (const [key, value] of Object.entries(o)) expect([key, again[i][key]]).toEqual([key, value]);
    });
  });
});
