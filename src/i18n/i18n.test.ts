import { DEFAULT_SETTINGS, localized, matchLocale, parseSettings, resolveLang } from './core';
import { X_EN } from './extra';
import { de } from './locales/de';
import { es } from './locales/es';
import { ptBR } from './locales/pt-BR';
import { S_EN } from './en';
import { U_EN } from './ui';

const english: Record<string, string> = { ...S_EN, ...X_EN, ...U_EN };
const locales = { 'pt-BR': ptBR, es, de };

describe('locale tables', () => {
  it('translate exactly the same keys in every language', () => {
    const keys = Object.keys(ptBR).sort();
    expect(Object.keys(es).sort()).toEqual(keys);
    expect(Object.keys(de).sort()).toEqual(keys);
  });

  it('only contain keys that exist in English and never leave a value empty', () => {
    for (const [name, table] of Object.entries(locales)) {
      for (const [k, v] of Object.entries(table)) {
        expect([name, k, k in english]).toEqual([name, k, true]);
        expect(v.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('cover the extra and widget UI texts completely', () => {
    for (const table of Object.values(locales)) {
      for (const k of [...Object.keys(X_EN), ...Object.keys(U_EN)]) expect(table[k]).toBeDefined();
    }
  });

  it('keep line breaks of the long help texts', () => {
    for (const table of Object.values(locales)) {
      for (const k of ['blink_expression', 'default_auto_connect', 'delete_retained_message_question', 'enable_ssl_tls', 'color_metric_description']) {
        expect(table[k].split('\n').length).toBe(S_EN[k as keyof typeof S_EN].split('\n').length);
      }
    }
  });
});

describe('language selection', () => {
  it('maps device locales to a supported language', () => {
    expect([matchLocale('pt-BR'), matchLocale('pt_PT'), matchLocale('es-MX'), matchLocale('de-AT'), matchLocale('fr-FR'), matchLocale(undefined)]).toEqual([
      'pt-BR', 'pt-BR', 'es', 'de', 'en', 'en',
    ]);
  });

  it('uses the device language only when the preference is "system"', () => {
    expect(resolveLang('system', 'de-DE')).toBe('de');
    expect(resolveLang('es', 'de-DE')).toBe('es');
  });

  it('reads stored settings defensively', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{bad')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"language":"xx","theme":"blue"}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"language":"de","theme":"light"}')).toEqual({ language: 'de', theme: 'light' });
  });
});

describe('localized', () => {
  it('returns the active table text, English when missing, and follows language changes', () => {
    let active: Record<string, string> | undefined = { ok: 'Okay' };
    const t = localized({ ok: 'OK', cancel: 'Cancel' }, () => active);
    expect([t.ok, t.cancel]).toEqual(['Okay', 'Cancel']);
    active = undefined;
    expect(t.ok).toBe('OK');
  });
});
