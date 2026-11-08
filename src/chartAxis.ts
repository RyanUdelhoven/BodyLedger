// Choose inclusive whole-number bounds in display units. Explicit ticks keep
// grid density predictable for narrow ranges, outliers, and deviation bands.
export function wholeNumberTicks(values: number[]): number[] {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [0, 1];
  let low = Math.min(...finite),
    high = Math.max(...finite);
  if (low === high) {
    low -= 1;
    high += 1;
  }
  let step = 1;
  while (Math.ceil(high / step) - Math.floor(low / step) > 4) {
    const magnitude = 10 ** Math.floor(Math.log10(step));
    const normalized = step / magnitude;
    step =
      normalized < 2
        ? 2 * magnitude
        : normalized < 5
          ? 5 * magnitude
          : 10 * magnitude;
  }
  const start = Math.floor(low / step),
    end = Math.ceil(high / step);
  return Array.from({ length: end - start + 1 }, (_, i) => (start + i) * step);
}
