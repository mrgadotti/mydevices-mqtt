/** Language and theme preferences, and the lookup that turns a string key into text of the active language. */
export type Lang = 'en' | 'pt-BR' | 'es' | 'de';
export type LangPref = 'system' | Lang;
export type ThemePref = 'system' | 'dark' | 'light';

export const LANGS: { code: Lang; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
];

export interface Settings {
  language: LangPref;
  theme: ThemePref;
}

export const DEFAULT_SETTINGS: Settings = { language: 'system', theme: 'system' };

/** Maps a device locale tag such as "pt_BR", "pt-PT", "es-MX" or "de-AT" to a supported language (English otherwise). */
export function matchLocale(tag: string | undefined): Lang {
  const t = (tag ?? '').replace('_', '-').toLowerCase();
  if (t.startsWith('pt')) return 'pt-BR';
  if (t.startsWith('es')) return 'es';
  if (t.startsWith('de')) return 'de';
  return 'en';
}

export const resolveLang = (pref: LangPref, deviceLocale: string | undefined): Lang => (pref === 'system' ? matchLocale(deviceLocale) : pref);

/** Reads a stored settings value defensively: unknown or damaged data falls back to the defaults. */
export function parseSettings(raw: string | null): Settings {
  try {
    const v = JSON.parse(raw ?? '{}') as Partial<Settings>;
    const lang = v.language === 'system' || LANGS.some((l) => l.code === v.language) ? v.language! : DEFAULT_SETTINGS.language;
    const theme = v.theme === 'dark' || v.theme === 'light' || v.theme === 'system' ? v.theme : DEFAULT_SETTINGS.theme;
    return { language: lang, theme };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export type Dict = Record<string, string>;

/** A proxy over the English table: reading a key returns the text in the active language, English when untranslated. */
export function localized<T extends Dict>(base: T, active: () => Dict | undefined): T {
  return new Proxy(base, {
    get: (target, key) => (typeof key === 'string' ? active()?.[key] ?? target[key] : undefined),
  });
}
