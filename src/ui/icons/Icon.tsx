import React from 'react';
import { Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import glyphs from './glyphIcons.json';
import data from './icons.json';

type IconData = { w: number; h: number; p: { d: string; o?: number }[] };
const icons = data.icons as Record<string, IconData>;

/** Material "add circle outline" and "save": the original's ic_menu_add / ic_menu_save are not shipped as files in the APK. */
const EXTRA: Record<string, IconData> = {
  menu_add: {
    w: 24,
    h: 24,
    p: [{ d: 'M13,7h-2v4L7,11v2h4v4h2v-4h4v-2h-4L13,7zM12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM12,20c-4.41,0 -8,-3.59 -8,-8s3.59,-8 8,-8 8,3.59 8,8 -3.59,8 -8,8z' }],
  },
  menu_save: {
    w: 24,
    h: 24,
    p: [{ d: 'M17,3L5,3c-1.11,0 -2,0.9 -2,2v14c0,1.1 0.89,2 2,2h14c1.1,0 2,-0.9 2,-2L21,7l-4,-4zM12,19c-1.66,0 -3,-1.34 -3,-3s1.34,-3 3,-3 3,1.34 3,3 -1.34,3 -3,3zM15,9L5,9L5,5h10v4z' }],
  },
};

export const ICON_ORDER: string[] = data.order;
/** IoT icon-font glyphs are addressed as "glyph:<name>" (name = the app's icon_<name> string, value = code point). */
export const GLYPH_PREFIX = 'glyph:';
const glyphCodes = glyphs as Record<string, string>;
export const GLYPH_ICON_ORDER: string[] = Object.keys(glyphCodes).map((n) => GLYPH_PREFIX + n);
export const iconGlyph = (name: string): string | null => {
  const code = name.startsWith(GLYPH_PREFIX) ? glyphCodes[name.slice(GLYPH_PREFIX.length)] : undefined;
  return code ? String.fromCodePoint(parseInt(code, 16)) : null;
};
export const hasIcon = (name: string): boolean => name in icons || iconGlyph(name) !== null;

interface Props {
  name: string;
  size: number;
  /** CSS color; every path of the original vectors is tinted, like the original's color filter. */
  color: string;
}

export function Icon({ name, size, color }: Props) {
  const glyph = iconGlyph(name);
  if (glyph) {
    return (
      <Text allowFontScaling={false} style={{ fontFamily: 'glyph_icons', fontSize: size * 0.9, lineHeight: size, width: size, height: size, textAlign: 'center', color }}>
        {glyph}
      </Text>
    );
  }
  const icon = icons[name] ?? EXTRA[name];
  if (!icon) return null;
  const scale = Math.min(size / icon.w, size / icon.h);
  return (
    <Svg width={size} height={size} viewBox={`${-(size / scale - icon.w) / 2} ${-(size / scale - icon.h) / 2} ${size / scale} ${size / scale}`}>
      {icon.p.map((p, i) => (
        <Path key={i} d={p.d} fill={color} fillOpacity={p.o ?? 1} />
      ))}
    </Svg>
  );
}
