import { useSkin } from './useSkin';

/** Colors of the screens built before the widget UI, taken from the active skin (they follow the theme setting). */
export function useColors() {
  const k = useSkin();
  return {
    windowBackground: k.listBackground,
    tile: k.surface,
    icon: k.text8,
    accent: k.link,
    textPrimary: k.text9,
    textSecondary: k.text8,
    divider: k.divider2,
  } as const;
}
