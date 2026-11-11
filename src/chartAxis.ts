// Select readable ticks in display units, with enough range for nearly flat data.
export function chooseYAxis(values: number[], minimumSpan = 0.4) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return { ticks: [0, 1], decimalPlaces: 0 };
  const minimum = Math.min(...finite),
    maximum = Math.max(...finite);
  const span = Math.max(maximum - minimum, minimumSpan > 0 ? minimumSpan : 0.4);
  const center = minimum + (maximum - minimum) / 2;
  const low = center - span / 2,
    high = center + span / 2;
  const idealStep = span / 4;
  const magnitude = 10 ** Math.floor(Math.log10(idealStep));
  const normalized = idealStep / magnitude;
  // Tolerance keeps floating-point subtraction from promoting exact nice steps.
  const step =
    (normalized <= 1 + 1e-10
      ? 1
      : normalized <= 2 + 1e-10
        ? 2
        : normalized <= 5 + 1e-10
          ? 5
          : 10) * magnitude;
  const decimalPlaces = Math.max(0, -Math.floor(Math.log10(step)));
  const start = Math.floor(low / step + 1e-10);
  const end = Math.ceil(high / step - 1e-10);
  const ticks = Array.from({ length: end - start + 1 }, (_, i) =>
    Number(((start + i) * step).toFixed(decimalPlaces)),
  );
  return { ticks, decimalPlaces };
}
