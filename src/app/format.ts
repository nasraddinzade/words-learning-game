/** 10000 → "10 000". One format for every counter on every screen. */
export function formatCount(n: number): string {
  return n.toLocaleString('en-US').replace(/,/g, ' ');
}
