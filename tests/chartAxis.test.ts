import { it, expect } from "vitest";
import { chooseYAxis } from "../src/chartAxis";

it("uses one decimal for a narrow biceps range", () => {
  expect(chooseYAxis([14.2, 14.8])).toEqual({
    ticks: [14.2, 14.4, 14.6, 14.8],
    decimalPlaces: 1,
  });
});
it("uses whole labels for a broad weight range", () => {
  expect(chooseYAxis([180, 188], 2)).toEqual({
    ticks: [180, 182, 184, 186, 188],
    decimalPlaces: 0,
  });
});
it("supports smaller configured steps", () => {
  expect(chooseYAxis([0.1, 0.3], 0.2).decimalPlaces).toBe(2);
});
it.each([
  [199.2, 203.7],
  [0.48, 0.57],
  [0, 0],
  [200, 200],
  [-4.7, 9.4],
  [10, 9000],
  [98.9, 101.1],
])("bounds data with readable, distinct ticks: %j", (...values: number[]) => {
  const { ticks } = chooseYAxis(values);
  expect(ticks.length).toBeGreaterThanOrEqual(2);
  expect(ticks.length).toBeLessThanOrEqual(6);
  expect(new Set(ticks).size).toBe(ticks.length);
  expect(ticks[0]).toBeLessThanOrEqual(Math.min(...values));
  expect(ticks.at(-1)!).toBeGreaterThanOrEqual(Math.max(...values));
  expect(ticks.at(-1)! - ticks[0]).toBeGreaterThanOrEqual(0.4 - 1e-10);
});
it("ignores missing and nonfinite data", () => {
  expect(chooseYAxis([NaN, Infinity])).toEqual(chooseYAxis([]));
  expect(chooseYAxis([14.2, NaN, 14.8])).toEqual(chooseYAxis([14.2, 14.8]));
});
