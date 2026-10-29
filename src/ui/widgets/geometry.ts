/** Point on a circle, angle in degrees clockwise from 3 o'clock (the usual SVG direction). */
export const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

/** SVG arc path between two angles (degrees, clockwise); sweeps at most 359.9 degrees. */
export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const sweep = Math.min(Math.max(endDeg - startDeg, 0), 359.9);
  const a = polar(cx, cy, r, startDeg);
  const b = polar(cx, cy, r, startDeg + sweep);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

/** Number text size that fits a cell: about half of the height, capped. */
export const fitFont = (height: number, max = 48, min = 12): number => Math.max(min, Math.min(max, Math.round(height * 0.5)));

/** Path of the edit-mode grid dots: a zero-length segment at every cell corner (draw it with round caps). */
export function gridDotsPath(rows: number, cell: number, offset: number, columns = 24): string {
  const parts: string[] = [];
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) parts.push(`M${offset + x * cell} ${y * cell}h0`);
  return parts.join('');
}
