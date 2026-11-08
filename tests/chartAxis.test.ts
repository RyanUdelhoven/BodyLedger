import { it, expect } from "vitest";
import { wholeNumberTicks } from "../src/chartAxis";
it.each([
  [199.2, 203.7],
  [0.48, 0.57],
  [0, 0],
  [200, 200],
  [-4.7, 9.4],
  [10, 9000],
  [98.9, 101.1],
  [],
])(
  "bounds measurements with at most five integer ticks: %j",
  (...values: number[]) => {
    const ticks = wholeNumberTicks(values);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks.length).toBeLessThanOrEqual(5);
    expect(ticks.every(Number.isInteger)).toBe(true);
    if (values.length) {
      expect(ticks[0]).toBeLessThanOrEqual(Math.min(...values));
      expect(ticks.at(-1)!).toBeGreaterThanOrEqual(Math.max(...values));
    }
  },
);
