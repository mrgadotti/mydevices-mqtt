import type { WidgetKind } from '../../domain/widgets';

export interface OptionField {
  key: string;
  label: string;
  kind: 'number' | 'text' | 'bool' | 'choice';
  default: string | number | boolean;
  choices?: string[];
}

const STEP: OptionField = { key: 'step', label: 'Step', kind: 'number', default: 1 };
const LOOP: OptionField = { key: 'loop', label: 'Loop values', kind: 'bool', default: false };

/** Settings of each widget beyond the common MQTT fields (stored in the metric's `opts`). */
export const OPTION_FIELDS: Partial<Record<WidgetKind, OptionField[]>> = {
  styledButton: [
    { key: 'style', label: 'Style', kind: 'choice', default: 'solid', choices: ['solid', 'outlined', 'solidStroke', 'text'] },
    { key: 'edge', label: 'Shape', kind: 'choice', default: 'rounded', choices: ['pill', 'rounded', 'sharp'] },
    { key: 'labelOn', label: 'ON label', kind: 'text', default: 'ON' },
    { key: 'labelOff', label: 'OFF label', kind: 'text', default: 'OFF' },
  ],
  stepSlider: [STEP],
  verticalStepSlider: [STEP],
  stepH: [STEP, LOOP],
  stepV: [STEP, LOOP],
  levelSlider: [{ key: 'segments', label: 'Number of segments', kind: 'number', default: 10 }],
  joystick: [
    { key: 'min', label: 'Min', kind: 'number', default: 0 },
    { key: 'max', label: 'Max', kind: 'number', default: 255 },
    { key: 'autoreturn', label: 'Autoreturn', kind: 'bool', default: true },
  ],
  numericInput: [STEP, { key: 'min', label: 'Min', kind: 'number', default: -1000000 }, { key: 'max', label: 'Max', kind: 'number', default: 1000000 }, LOOP],
  textInput: [{ key: 'hint', label: 'Hint', kind: 'text', default: 'Input value here' }],
  timeInput: [],
  text: [{ key: 'text', label: 'Text', kind: 'text', default: '' }],
  chart: [{ key: 'line', label: 'Line width', kind: 'number', default: 2 }],
  terminal: [
    { key: 'timestamps', label: 'Show timestamps', kind: 'bool', default: false },
    { key: 'newline', label: 'Add newline', kind: 'bool', default: false },
  ],
  radialGauge: [{ key: 'showLabel', label: 'Show label', kind: 'bool', default: true }],
};
