import type { TileDisplay } from '../../domain/display';
import type { Metric } from '../../domain/types';
import type { WidgetKind } from '../../domain/widgets';
import type { Skin } from '../skin';

export interface WidgetViewProps {
  metric: Metric;
  display: TileDisplay;
  kind: WidgetKind;
  /** Outer size in dp. */
  width: number;
  height: number;
  skin: Skin;
  pending: boolean;
  imageUri: string | null;
  /** False while arranging or when publishing is disabled for the metric. */
  interactive: boolean;
  /** Dashboard edit mode (spacers show an outline). */
  edit: boolean;
  /** The metric's tap flow (scripts, toggle, dialogs). */
  onTap: () => void;
  /** Publishes a payload directly (slider release, segmented option, menu item). */
  onSet: (payload: string) => void;
  onImageLoaded: () => void;
  onImageError: () => void;
}

export type BodyProps = WidgetViewProps & { inner: { w: number; h: number } };
