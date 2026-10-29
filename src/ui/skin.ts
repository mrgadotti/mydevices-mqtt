import type { TextStyle } from 'react-native';

/** Color tokens of the widget UI, per system theme (neutral steps are alpha ramps over a base color). */
export interface Skin {
  scheme: 'light' | 'dark';
  background: string;
  listBackground: string;
  surface: string;
  text9: string;
  text8: string;
  text7: string;
  text6: string;
  text5: string;
  stroke4: string;
  stroke3: string;
  divider2: string;
  focus1: string;
  brand: string;
  onBrand: string;
  primary: string;
  onPrimary: string;
  critical: string;
  positive: string;
  warning: string;
  link: string;
  white: string;
}

const ramp = (base: string, alphas: Record<number, string>) => (step: number) => `rgba(${base},${alphas[step]})`;

const LIGHT_RAMP = ramp('3,3,10', { 1: '0.01', 2: '0.02', 3: '0.06', 4: '0.10', 5: '0.15', 6: '0.25', 7: '0.45', 8: '0.65', 9: '0.85' });
const DARK_RAMP = ramp('255,255,255', { 1: '0.04', 2: '0.06', 3: '0.10', 4: '0.15', 5: '0.25', 6: '0.35', 7: '0.45', 8: '0.65', 9: '0.85' });

const COMMON = { brand: '#24C48E', onBrand: '#07271C', critical: '#D3435C', positive: '#8AD95D', warning: '#ED9D00', white: '#FFFFFF' };

const LIGHT: Skin = {
  scheme: 'light',
  background: '#FBFBFB',
  listBackground: '#EFF3F2',
  surface: '#FFFFFF',
  text9: LIGHT_RAMP(9),
  text8: LIGHT_RAMP(8),
  text7: LIGHT_RAMP(7),
  text6: LIGHT_RAMP(6),
  text5: LIGHT_RAMP(5),
  stroke4: LIGHT_RAMP(4),
  stroke3: LIGHT_RAMP(3),
  divider2: LIGHT_RAMP(2),
  focus1: LIGHT_RAMP(1),
  primary: '#262957',
  onPrimary: '#FFFFFF',
  link: '#5572D3',
  ...COMMON,
};

const DARK: Skin = {
  scheme: 'dark',
  background: '#1D1E22',
  listBackground: '#232529',
  surface: '#303136',
  text9: DARK_RAMP(9),
  text8: DARK_RAMP(8),
  text7: DARK_RAMP(7),
  text6: DARK_RAMP(6),
  text5: DARK_RAMP(5),
  stroke4: DARK_RAMP(4),
  stroke3: DARK_RAMP(3),
  divider2: DARK_RAMP(2),
  focus1: DARK_RAMP(1),
  primary: '#24C48E',
  onPrimary: '#07271C',
  link: '#24C48E',
  ...COMMON,
};

export const skinFor = (scheme: 'light' | 'dark'): Skin => (scheme === 'dark' ? DARK : LIGHT);

const FAMILY = { regular: 'sans-serif', medium: 'sans-serif-medium', bold: 'sans-serif' } as const;
const t = (weight: keyof typeof FAMILY, fontSize: number, lineHeight: number): TextStyle => ({
  fontFamily: FAMILY[weight],
  ...(weight === 'bold' ? { fontWeight: '700' as const } : {}),
  fontSize,
  lineHeight,
});

/** Text appearances (font, size, line height). */
export const type = {
  headline1: t('bold', 20, 26),
  headline2: t('bold', 20, 26),
  headline3: t('bold', 18, 24),
  headline4: t('bold', 16, 22),
  body1: t('regular', 16, 22),
  body2: t('regular', 14, 18),
  body3: t('regular', 12, 16),
  subtitle1: t('medium', 16, 22),
  subtitle2: t('medium', 14, 18),
  subtitle3: t('medium', 12, 16),
  number: t('regular', 16, 20),
  numberMedium: t('regular', 32, 40),
  numberLarge: t('regular', 40, 48),
  numberXLarge: t('regular', 48, 56),
} as const;
