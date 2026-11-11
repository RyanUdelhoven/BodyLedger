import { test, expect } from "./fixtures";
import { demo } from "../../src/model";
test("all charts use readable numeric grid lines in display units", async ({
  page,
  request,
}) => {
  const current = await (await request.get("/api/journal")).json();
  expect(
    (
      await request.put("/api/journal", {
        data: { state: demo(current, true), expected: current.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  for (const unit of ["lb", "kg"]) {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Weight units", exact: true })
      .selectOption(unit);
    await expect(page.locator("main")).toHaveAttribute("aria-busy", "false");
    await page.getByRole("button", { name: "Trends", exact: true }).click();
    for (const mode of [
      "Days YoY",
      "Previous weekdays",
      "Week flow",
      "Year flow",
    ]) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      const ticks = page.locator(
        ".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value",
      );
      await expect(ticks.first()).toBeVisible();
      const labels = await ticks.allTextContents();
      expect(labels.length).toBeGreaterThanOrEqual(2);
      expect(labels.length).toBeLessThanOrEqual(6);
      expect(
        labels.every((label) => /^-?\d[\d,]*(?:\.\d+)?$/.test(label)),
      ).toBe(true);
      await expect(
        page.locator(".recharts-cartesian-grid-horizontal line"),
      ).toHaveCount(labels.length);
      if (mode === "Previous weekdays")
        await expect(
          page.getByRole("spinbutton", { name: "Weeks covered", exact: true }),
        ).toBeVisible();
    }
  }
});

test("small biceps changes display distinct decimal axis labels", async ({
  page,
  request,
}) => {
  const { initial, localDate, addDays, factor, schedule } =
    await import("../../src/model");
  const current = await (await request.get("/api/journal")).json();
  const state = initial();
  state.metrics = [
    { id: "biceps", title: "Biceps", kind: "length", schedule: schedule() },
  ];
  state.entries = [14.2, 14.8].map((value, index) => ({
    id: `biceps-${index}`,
    date: addDays(localDate(), index - 1),
    values: { biceps: value * factor("in") },
  }));
  expect(
    (
      await request.put("/api/journal", {
        data: { state, expected: current.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Chart metric" })
    .selectOption("biceps");
  const ticks = page.locator(
    ".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value",
  );
  await expect(ticks).toHaveText(["14.2", "14.4", "14.6", "14.8"]);
});
