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

const t = (fontFamily: string, fontSize: number, lineHeight: number): TextStyle => ({ fontFamily, fontSize, lineHeight });

/** Text appearances (font, size, line height). */
export const type = {
  headline1: t('ui_bold', 20, 26),
  headline2: t('ui_semibold', 20, 26),
  headline3: t('ui_semibold', 18, 24),
  headline4: t('ui_semibold', 16, 22),
  body1: t('ui_regular', 16, 22),
  body2: t('ui_regular', 14, 18),
  body3: t('ui_regular', 12, 16),
  subtitle1: t('ui_medium', 16, 22),
  subtitle2: t('ui_medium', 14, 18),
  subtitle3: t('ui_medium', 12, 16),
  number: t('ui_number', 16, 20),
  numberMedium: t('ui_number', 32, 40),
  numberLarge: t('ui_number', 40, 48),
  numberXLarge: t('ui_number', 48, 56),
} as const;
