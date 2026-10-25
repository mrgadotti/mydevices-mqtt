import type { TextSize, TileWidth } from '../domain/types';

/** Colors from the original's res/values/colors.xml (the app only has this dark look). */
export const colors = {
  windowBackground: '#080808',
  actionBar: '#000000',
  tile: '#181818',
  tilePressed: '#888888',
  blink: '#707070',
  accent: '#40afff',
  /** Default icon tint (light_gray_color). */
  icon: '#c0c0c0',
  darkGray: '#393939',
  progressBg: '#707070',
  bottomText: '#474747',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textHint: 'rgba(255, 255, 255, 0.5)',
  divider: 'rgba(255, 255, 255, 0.12)',
  dialog: '#424242',
  navBar: '#000000',
} as const;

export interface TileMetrics {
  width: number;
  height: number;
  nameHeight: number;
  nameSp: number;
  bottomSp: number;
  logSp: number;
  icon: number;
  spinner: number;
  /** Height of the big text area of text and multi-choice tiles. */
  textAreaHeight: number;
  /** Range tile: dial size, ring stroke, and the center value text size. */
  arc: { size: number; stroke: number };
  valueSp: number;
}

const SMALL: TileMetrics = {
  width: 105, height: 100, nameHeight: 25, nameSp: 10, bottomSp: 10, logSp: 10, icon: 52, spinner: 65,
  textAreaHeight: 60, arc: { size: 55, stroke: 5 }, valueSp: 10,
};
const MEDIUM: TileMetrics = {
  width: 155, height: 150, nameHeight: 38, nameSp: 14, bottomSp: 12, logSp: 14, icon: 75, spinner: 115,
  textAreaHeight: 80, arc: { size: 75, stroke: 10 }, valueSp: 14,
};
const LARGE: TileMetrics = {
  width: 205, height: 200, nameHeight: 38, nameSp: 16, bottomSp: 14, logSp: 16, icon: 120, spinner: 150,
  textAreaHeight: 125, arc: { size: 120, stroke: 16 }, valueSp: 22,
};

export function tileMetrics(tileWidth: TileWidth): TileMetrics {
  return tileWidth === -1 ? SMALL : tileWidth === 1 ? LARGE : MEDIUM;
}

const TEXT_SP: Record<TileWidth, [number, number, number]> = { [-1]: [12, 22, 32], 0: [15, 25, 35], 1: [40, 50, 60] };

/** Text/multi-choice main text size in sp, as chosen in MetricsAdapter.onBindViewHolder. */
export function mainTextSizeSp(tileWidth: TileWidth, size: TextSize): number {
  const [small, medium, large] = TEXT_SP[tileWidth] ?? TEXT_SP[0];
  return size === 'SMALL' ? small : size === 'MEDIUM' ? medium : large;
}

export const GRID_GAP_DP = 4;

/**
 * Number of tile columns, as MetricsListActivity.handleRotation: the broker's fixed count for the current
 * orientation when > 0, else floor(screen width / (tile width + (item_offset + 1) * 5 dp)), at least 1.
 */
export function gridColumns(
  broker: { colsCount: number; colsCountHorizontal: number; tileWidth: TileWidth },
  screenWidthDp: number,
  landscape: boolean,
): number {
  if (!landscape && broker.colsCount > 0) return broker.colsCount;
  if (landscape && broker.colsCountHorizontal > 0) return broker.colsCountHorizontal;
  const columnWidth = tileMetrics(broker.tileWidth).width + (2 + 1) * 5;
  return Math.max(1, Math.floor(screenWidthDp / columnWidth));
}
