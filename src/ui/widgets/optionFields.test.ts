import { WIDGET_SPECS, type WidgetKind } from '../../domain/widgets';
import { OPTION_FIELDS } from './optionFields';

describe('OPTION_FIELDS', () => {
  it('only describes known widgets, with defaults matching the declared kind', () => {
    for (const [kind, fields] of Object.entries(OPTION_FIELDS)) {
      expect(WIDGET_SPECS[kind as WidgetKind]).toBeDefined();
      for (const f of fields ?? []) {
        if (f.kind === 'bool') expect(typeof f.default).toBe('boolean');
        if (f.kind === 'number') expect(typeof f.default).toBe('number');
        if (f.kind === 'choice') expect(f.choices).toContain(f.default);
      }
    }
  });
});
