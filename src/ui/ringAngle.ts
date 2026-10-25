/** Progress 0..100 for a touch at (x, y) inside a ring of `size` dp: 0 at 12 o'clock, growing clockwise. */
export function ringPercent(x: number, y: number, size: number): number {
  const dx = x - size / 2;
  const dy = y - size / 2;
  if (dx === 0 && dy === 0) return 0;
  const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return Math.round(((degrees + 360) % 360) / 3.6) % 101;
}
