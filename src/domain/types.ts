/**
 * Data model (field names and value types) of the stored data and the
 * import/export JSON. Colors are Android ARGB ints (white is -1).
 */
export const METRIC_TEXT = 1;
export const METRIC_SWITCH = 2;
export const METRIC_RANGE = 3;
export const METRIC_MULTI_SWITCH = 4;
export const METRIC_IMAGE = 5;
export const METRIC_COLOR = 6;
/** Raises a local notification: raises a local notification for every message. */
export const METRIC_NOTIFICATION = 7;
export type MetricTypeId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const TILE_SMALL = -1;
export const TILE_MEDIUM = 0;
export const TILE_LARGE = 1;
export type TileWidth = -1 | 0 | 1;

export const IMAGE_URL = 1;
export const IMAGE_URL_IN_PAYLOAD = 2;
export const IMAGE_DATA_IN_PAYLOAD = 3;
export type ImageKind = 1 | 2 | 3;

export const COLOR_FORMAT_HEX = 0;
export const COLOR_FORMAT_INT = 1;
export type ColorFormat = 0 | 1;

export type TextSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface Broker {
  longId: number;
  clientId: string;
  id: string;
  name: string;
  address: string;
  port: string;
  user: string;
  password: string;
  ssl: boolean;
  trust: boolean;
  /** Runs the app's own embedded broker and connects to it on localhost. */
  localBroker: boolean;
  autoConnect: boolean;
  keepScreenOn: boolean;
  metricsEditable: boolean;
  neverHideBrokerName: boolean;
  colsCount: number;
  colsCountHorizontal: number;
  tileWidth: TileWidth;
}

export interface MetricBase {
  name: string;
  longId: number;
  type: MetricTypeId;
  id: string;
  jsOnDisplay: string;
  jsOnTap: string;
  jsBlinkExpression: string;
  /** Unix seconds, 0 = never. */
  lastActivity: number;
  topic: string;
  topicPub: string;
  enablePub: boolean;
  updateLastPayloadOnPub: boolean;
  enableIntermediateState: boolean;
  intermediateStateTimeout: number;
  /** Unix seconds when the pending state started, 0 = not pending. */
  enteredIntermediateStateAt: number;
  qos: number;
  retained: boolean;
  lastPayload: string | null;
  jsonPath: string;
  lastJsonPathValue: string | null;
  jsOnReceive: string;
  /** Free placement: grid cell column/row. Absent = flows in list order. */
  gridX?: number;
  gridY?: number;
  /** Presentation kind of the widget UI; absent = derived from `type`. */
  widget?: string;
  /** Widget rectangle on the 24-column grid (cells). Absent = auto-placed. */
  gx?: number;
  gy?: number;
  gw?: number;
  gh?: number;
  /** Per-widget options (step, button style, labels...); absent keys use the widget defaults. */
  opts?: Record<string, string | number | boolean>;
}

export interface TextMetric extends MetricBase {
  type: 1;
  mainTextSize: TextSize;
  prefix: string;
  postfix: string;
  textColor: number;
}

export interface SwitchMetric extends MetricBase {
  type: 2;
  payloadOn: string;
  payloadOff: string;
  iconOn: string;
  iconOff: string;
  onColor: number;
  offColor: number;
}

export interface RangeMetric extends MetricBase {
  type: 3;
  minValue: number;
  maxValue: number;
  decimalPrecision: number;
  displayPayloadValue: boolean;
  prefix: string;
  postfix: string;
  progressColor: number;
}

export interface MultiSwitchItem {
  label: string;
  payload: string;
}

export interface MultiSwitchMetric extends MetricBase {
  type: 4;
  mainTextSize: TextSize;
  textColor: number;
  items: MultiSwitchItem[];
}

export interface ImageMetric extends MetricBase {
  type: 5;
  kind: ImageKind;
  imageUrl: string;
  openUrl: string;
  reloadInterval: number;
}

export interface ColorMetric extends MetricBase {
  type: 6;
  icon: string;
  format: ColorFormat;
}

export interface NotificationMetric extends MetricBase {
  type: 7;
  /** Notification title; empty means the tile name. */
  title: string;
  /** Notify only when the payload differs from the previous one. */
  onlyOnChange: boolean;
}

export type Metric = TextMetric | SwitchMetric | RangeMetric | MultiSwitchMetric | ImageMetric | ColorMetric | NotificationMetric;
