import { test, expect } from "./fixtures";
import { localDate, schedule, canonical } from "../../src/model";
test("the selected metric goal appears on every graph, converts units, and stays inside the axis", async ({
  page,
  request,
}) => {
  const state = await (await request.get("/api/journal")).json();
  state.metrics.push({
    id: "gut",
    title: "Gut",
    kind: "length",
    schedule: schedule(),
  });
  state.entries = [
    {
      id: "current",
      date: localDate(),
      values: { weight: canonical(200, "lb") },
      note: "",
    },
  ];
  expect(
    (
      await request.put("/api/journal", {
        data: { state, expected: state.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Weight", exact: true }) })
    .click();
  await page.getByRole("textbox", { name: "Target", exact: true }).fill("150");
  await page.getByRole("button", { name: "Save goal", exact: true }).click();
  await expect(page.getByText("150.00 lb")).toBeVisible();
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  for (const mode of [
    "Days YoY",
    "Previous weekdays",
    "Week flow",
    "Year flow",
  ]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await expect(
      page.getByText("Goal: 150.00 lb", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".recharts-reference-line-line")).toHaveCount(1);
    expect(
      await page
        .locator(".recharts-reference-line-line")
        .evaluate(
          (line) =>
            Number(line.getAttribute("x2")) > Number(line.getAttribute("x1")),
        ),
    ).toBe(true);
    const ticks = await page
      .locator(
        ".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value",
      )
      .allTextContents();
    expect(ticks.length).toBeLessThanOrEqual(5);
    expect(Math.min(...ticks.map(Number))).toBeLessThanOrEqual(150);
    await page
      .getByRole("combobox", { name: "Chart metric" })
      .selectOption("gut");
    await expect(page.locator(".recharts-reference-line-line")).toHaveCount(0);
    await page
      .getByRole("combobox", { name: "Chart metric" })
      .selectOption("weight");
  }
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Weight units", exact: true })
    .selectOption("kg");
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  await expect(page.getByText("Goal: 68.04 kg", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Weight", exact: true }) })
    .click();
  await page.getByRole("button", { name: "Remove goal", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  await expect(page.locator(".recharts-reference-line-line")).toHaveCount(0);
});

test("a goal remains visible when the selected metric has no observations", async ({
  page,
  request,
}) => {
  const state = await (await request.get("/api/journal")).json();
  state.goals = [
    {
      metricId: "weight",
      target: canonical(150, "lb"),
      created: localDate(),
      deadline: "",
    },
  ];
  expect(
    (
      await request.put("/api/journal", {
        data: { state, expected: state.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  for (const mode of [
    "Days YoY",
    "Previous weekdays",
    "Week flow",
    "Year flow",
  ]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await expect(
      page.getByText("Goal: 150.00 lb", { exact: true }),
    ).toBeVisible();
  }
});
