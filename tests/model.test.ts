import { describe, it, expect } from "vitest";
import * as M from "../src/model";
import { chartData } from "../src/trends";
describe("measurement storage", () => {
  it("quantizes imperial increments and converts without drift", () => {
    expect(M.canonical(206.14, "lb") / M.factor("lb")).toBeCloseTo(206.1);
    expect(M.canonical(38.4, "in") / 2.54).toBeCloseTo(38.375);
    const v = M.canonical(100, "kg");
    expect(M.canonical(v / M.factor("lb"), "lb")).toBeCloseTo(v);
    expect(() => M.parseValue("NaN", "lb")).toThrow();
    expect(() => M.parseValue("-1", "in")).toThrow();
    expect(() => M.parseValue("101", "%")).toThrow();
  });
  it("merges complementary daily data and flags conflicting measurements", () => {
    const a = {
      id: "a",
      date: "2026-11-01",
      values: { weight: 90 },
      note: "a",
    };
    const b = { id: "b", date: a.date, values: { gut: 98 }, note: "" };
    expect(M.conflicts(a, b)).toBe(false);
    expect(M.mergeEntry(a, b).values).toEqual({ weight: 90, gut: 98 });
    expect(M.conflicts(a, { ...b, values: { weight: 91 } })).toBe(true);
  });
});
describe("CSV", () => {
  it("round trips sparse values, quoted notes, Unicode, and canonical precision", () => {
    const s = M.initial();
    s.metrics.push({
      id: "gut",
      title: "Gut",
      kind: "length",
      schedule: M.schedule(),
    });
    s.entries = [
      {
        id: "1",
        date: "2026-11-01",
        values: {
          weight: M.canonical(206.1, "lb"),
          gut: M.canonical(38.375, "in"),
        },
        note: "Good, “steady”\nsecond line",
      },
      {
        id: "2",
        date: "2026-11-02",
        values: { gut: M.canonical(38.5, "in") },
        note: "",
      },
    ];
    for (const metric of [false, true]) {
      if (metric) {
        s.settings.weight = "kg";
        s.settings.length = "cm";
      }
      const imported = M.importCSV(s, M.exportCSV(s));
      expect(imported.entries[0].values).toEqual(s.entries[0].values);
      expect(imported.entries[0].note).toBe(s.entries[0].note);
      expect(imported.entries[1].values.weight).toBeUndefined();
    }
  });
  it("validates whole files and ignores empty new columns", () => {
    const s = M.initial();
    expect(() =>
      M.importCSV(s, "Date,Gut (in)\n2026-11-01,38\n2026-11-02,no"),
    ).toThrow();
    expect(s.metrics.length).toBe(1);
    expect(
      M.importCSV(s, "Date,Weight (lb),Gut (in)\n2026-11-01,200,").metrics
        .length,
    ).toBe(1);
    expect(() => M.importCSV(s, "Date,Weight (lb)\n2026-02-30,200")).toThrow();
    expect(() => M.importCSV(s, "Date,Unknown\n2026-11-01,2")).toThrow();
  });
  it("supports Weight Gurus units and BOM", () => {
    const s = M.initial();
    const imported = M.importCSV(s, "\uFEFFDate,Weight,Units\n11/1/2026,90,kg");
    expect(imported.entries[0].date).toBe("2026-11-01");
    expect(imported.entries[0].values[imported.metrics[0].id]).toBeCloseTo(
      M.canonical(90, "kg"),
    );
  });
});
describe("calendar schedules", () => {
  it("clamps and deduplicates short-month reporting days", () => {
    const s = {
      ...M.schedule(),
      frequency: "monthly" as const,
      days: [1, 30, 31],
    };
    expect(M.due(s, "2026-02-28")).toBe(true);
    expect(M.due(s, "2026-02-27")).toBe(false);
    expect(M.latestDue(s, "2026-03-15")).toBe("2026-03-01");
  });
  it("anchors interval weeks on both sides of reference date", () => {
    const s = {
      ...M.schedule(),
      frequency: "intervalWeeks" as const,
      interval: 2,
      anchor: "2026-11-08",
    };
    expect(M.due(s, "2026-10-25")).toBe(true);
    expect(M.due(s, "2026-11-01")).toBe(false);
    expect(M.due(s, "2026-11-22")).toBe(true);
  });
});
describe("trends", () => {
  it("retains missing weekly slots and averages observed values", () => {
    const s = M.initial();
    s.entries = [
      { id: "1", date: "2026-11-01", values: { weight: 90 }, note: "" },
      { id: "2", date: "2026-10-18", values: { weight: 96 }, note: "" },
    ];
    const { points } = chartData(
      s,
      s.metrics[0],
      "Previous weekdays",
      3,
      0,
      "2026-11-01",
    );
    expect(points.length).toBe(3);
    expect(points[1].actual).toBeUndefined();
    expect(points[0].average).toBe(93);
  });
  it("excludes current week from historical baseline and today from deviation", () => {
    const s = M.initial();
    s.entries = [
      { id: "1", date: "2026-11-01", values: { weight: 100 }, note: "" },
      { id: "2", date: "2026-10-25", values: { weight: 90 }, note: "" },
      { id: "3", date: "2026-10-18", values: { weight: 94 }, note: "" },
    ];
    const r = chartData(s, s.metrics[0], "Week flow", 3, 0, "2026-11-01");
    expect(r.points.at(-1)?.average).toBe(92);
    expect(r.points.at(-1)?.deviation).toBe(2);
    expect(r.actualSD).toBeUndefined();
    expect(r.historyMean).toBe(92);
  });
  it("uses only completed months with more than half coverage for year deviations", () => {
    const s = M.initial();
    s.entries = Array.from({ length: 16 }, (_, i) => ({
      id: String(i),
      date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      values: { weight: 90 + i },
      note: "",
    }));
    s.entries.push({
      id: "now",
      date: "2026-11-01",
      values: { weight: 200 },
      note: "",
    });
    const r = chartData(s, s.metrics[0], "Year flow", 2, 0, "2026-11-08");
    expect(r.points.at(-2)?.deviation).toBeDefined();
    expect(r.points.at(-1)?.deviation).toBeUndefined();
    expect(r.actualMean).toBeCloseTo(
      s.entries.reduce((a, e) => a + e.values.weight, 0) / 17,
    );
  });
});
it("refreshes synthetic history without overriding real entries", () => {
  const s = M.initial();
  s.entries = [
    { id: "real", date: "2026-11-01", values: { weight: 99 }, note: "Real" },
  ];
  const d = M.demo(s);
  expect(d.entries.find((e) => e.date === "2026-11-01")?.values.weight).toBe(
    99,
  );
  expect(new Set(d.entries.map((e) => e.date)).size).toBe(d.entries.length);
  expect(M.demo(d).entries.length).toBe(d.entries.length);
});
it("rejects invalid backup values", () => {
  const s = M.initial();
  expect(M.validateState(s)).toEqual(s);
  s.entries = [
    { id: "x", date: "2026-11-01", values: { weight: NaN }, note: "" },
  ];
  expect(() => M.validateState(s)).toThrow();
});

it("captures a first goal baseline and retains it after later changes", () => {
  const s = M.initial();
  s.goals = [
    { metricId: "weight", created: "2026-01-01", target: 80, deadline: "" },
  ];
  s.entries = [
    { id: "a", date: "2026-01-02", values: { weight: 90 }, note: "" },
  ];
  const captured = M.captureGoalStarts(s);
  expect(captured.goals[0].start).toBe(90);
  captured.entries = [];
  expect(M.captureGoalStarts(captured).goals[0].start).toBe(90);
});
it("limits typed decimals without changing invalid input into a different measurement", () => {
  expect(M.limitInput("12.345", "lb")).toBe("12.3");
  expect(M.limitInput("-12", "lb", "10")).toBe("10");
  expect(() => M.parseValue("0x10", "lb")).toThrow();
  expect(() => M.parseValue("1e308", "lb")).toThrow();
});

it("generates the requested complete irregular demo history", () => {
  const s = M.demo(M.initial(), true),
    entries = [...s.entries].sort((a, b) => a.date.localeCompare(b.date));
  const weight = s.metrics.find((m) => m.title === "Weight")!,
    gut = s.metrics.find((m) => m.title === "Gut")!;
  expect(entries).toHaveLength(2504);
  expect(entries[0].date).toBe("2020-01-01");
  expect(entries.at(-1)!.date).toBe("2026-11-08");
  expect(new Set(entries.map((e) => e.date)).size).toBe(2504);
  const pounds = (e: M.Entry) => e.values[weight.id] / M.factor("lb");
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (i) expect(e.date).toBe(M.addDays(entries[i - 1].date, 1));
    expect(pounds(e) * 10).toBeCloseTo(Math.round(pounds(e) * 10), 8);
    expect(e.values[gut.id] !== undefined).toBe(M.date(e.date).getDay() === 0);
    if (e.values[gut.id] !== undefined)
      expect((e.values[gut.id] / 2.54) * 8).toBeCloseTo(
        Math.round((e.values[gut.id] / 2.54) * 8),
        8,
      );
  }
  const sundays = entries.filter((e) => e.values[gut.id] !== undefined);
  expect(sundays).toHaveLength(358);
  expect(sundays[0].values[gut.id] / 2.54).toBe(34);
  expect(sundays.at(-1)!.values[gut.id] / 2.54).toBe(39);
  const yearly = Array.from({ length: 7 }, (_, i) =>
    M.mean(
      entries.filter((e) => e.date.startsWith(String(2020 + i))).map(pounds),
    )!,
  );
  for (let i = 1; i < yearly.length; i++)
    expect(yearly[i] > yearly[i - 1]).toBe(i !== 4);
  const loss = entries.filter((e) => e.date.startsWith("2024"));
  expect(pounds(loss[0]) - pounds(loss.at(-1)!)).toBeCloseTo(15, 0);
  const byDay = new Map(entries.map((e) => [e.date, e]));
  const drops = sundays.flatMap((e) => {
    const friday = byDay.get(M.addDays(e.date, 5));
    return friday ? [pounds(e) - pounds(friday)] : [];
  });
  expect(M.mean(drops)!).toBeGreaterThan(3.5);
  expect(M.mean(drops)!).toBeLessThan(4.5);
  const blankCSV = M.exportCSV(s)
    .split("\r\n")
    .filter((line) => line.startsWith("2020-01-01,"))[0];
  expect(blankCSV).toContain(",,Synthetic");
});

it("Days YoY interprets its range as whole weeks with matching prior-year dates", () => {
  const s = M.initial();
  s.entries = [
    { id: "now", date: "2026-11-02", values: { weight: 90 }, note: "" },
    { id: "previous", date: "2025-11-02", values: { weight: 85 }, note: "" },
    { id: "older", date: "2024-11-02", values: { weight: 80 }, note: "" },
  ];
  const one = chartData(s, s.metrics[0], "Days YoY", 1, 0, "2026-11-08").points;
  expect(one).toHaveLength(7);
  expect(one[0]).toMatchObject({
    date: "2026-11-02",
    actual: 90,
    previous: 85,
    older: 80,
  });
  expect(one.at(-1)?.date).toBe("2026-11-08");
  const two = chartData(s, s.metrics[0], "Days YoY", 2, 0, "2026-11-08").points;
  expect(two).toHaveLength(14);
  expect(two[0].date).toBe("2026-10-26");
});
