import type { MetricTypeId } from '../domain/types';

export type RootStackParamList = {
  Brokers: undefined;
  BrokerForm: { brokerId?: string };
  Dashboard: { brokerId: string };
  MetricForm: { brokerId: string; type: MetricTypeId; metricId?: string; /** Widget kind and grid rectangle of a new widget. */ preset?: { widget: string; gx: number; gy: number; gw: number; gh: number; name?: string } };
  IconSelector: undefined;
  Settings: undefined;
  JsEditor: { title: string; kind: 'receive' | 'display' | 'tap'; metricType: MetricTypeId };
};

/** One-shot results passed back from picker screens (icon selector, script editor) to the form that opened them. */
type Handler = (value: string) => void;
let pending: Handler | null = null;
export const setPickHandler = (h: Handler | null): void => {
  pending = h;
};
export const deliverPick = (value: string): void => {
  pending?.(value);
  pending = null;
};

/** The script text being edited, handed to the editor screen. */
let scriptDraft = '';
export const setScriptDraft = (s: string): void => {
  scriptDraft = s;
};
export const getScriptDraft = (): string => scriptDraft;
