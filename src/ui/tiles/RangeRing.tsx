import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

interface Props {
  size: number;
  stroke: number;
  /** 0..100 */
  progress: number;
  color: string;
}

/** The original's SeekArc: a full ring (#393939) with the progress drawn clockwise from the top. */
export function RangeRing({ size, stroke, progress, color }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, progress));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.darkGray} strokeWidth={stroke} fill="none" />
      {p > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${(c * p) / 100} ${c}`}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      ) : null}
    </Svg>
  );
}
