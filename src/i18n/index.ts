import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, I18nManager } from 'react-native';
import { createStore, useStore } from 'zustand';
import { DEFAULT_SETTINGS, localized, parseSettings, resolveLang, type Dict, type Lang, type Settings } from './core';
import { X_EN } from './extra';
import { de } from './locales/de';
import { es } from './locales/es';
import { ptBR } from './locales/pt-BR';
import { S_EN } from './en';
import { U_EN } from './ui';

export * from './core';

const TABLES: Record<Exclude<Lang, 'en'>, Dict> = { 'pt-BR': ptBR, es, de };

const KEY = 'settings';

const deviceLocale = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return I18nManager.getConstants().localeIdentifier;
  }
};

const settingsStore = createStore<Settings>(() => DEFAULT_SETTINGS);

export const activeLang = (): Lang => resolveLang(settingsStore.getState().language, deviceLocale());
const table = (): Dict | undefined => {
  const l = activeLang();
  return l === 'en' ? undefined : TABLES[l];
};

/** Texts of the app, of the notification widget and of the widget UI, in the active language. */
export const S = localized(S_EN as Record<string, string>, table) as unknown as typeof S_EN;
export const X = localized(X_EN as Record<string, string>, table) as unknown as typeof X_EN;
export const U = localized(U_EN as Record<string, string>, table) as unknown as typeof U_EN;

/** Looks up a dynamic key (for example `w_${kind}`), returning the fallback when there is no text for it. */
export const tl = (key: string, fallback: string): string => table()?.[key] ?? (U_EN as Dict)[key] ?? fallback;

const applyTheme = (s: Settings): void => Appearance.setColorScheme(s.theme === 'system' ? 'unspecified' : s.theme);

/** Loads the saved preferences (call once at startup). */
export async function loadSettings(): Promise<void> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(KEY);
  } catch {
    /* keep defaults */
  }
  const s = parseSettings(raw);
  applyTheme(s);
  settingsStore.setState(s);
}

export function updateSettings(patch: Partial<Settings>): void {
  const next = { ...settingsStore.getState(), ...patch };
  applyTheme(next);
  settingsStore.setState(next);
  void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

export const useSettings = (): Settings => useStore(settingsStore, (s) => s);
