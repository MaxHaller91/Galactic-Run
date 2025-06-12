export const EPS = 1e-6;

export function safeDiv(n, d) {
  return Math.abs(d) < EPS ? 0 : n / d;
}
