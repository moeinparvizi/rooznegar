/** Clamp a pointer to the tab bar and return its visual position in RTL order. */
export function rtlTabPosition(x: number, left: number, width: number, count: number): number {
  if (width <= 0 || count <= 1) return 0;
  const slot = width / count;
  return Math.max(0, Math.min(count - 1, (left + width - x) / slot - 0.5));
}
