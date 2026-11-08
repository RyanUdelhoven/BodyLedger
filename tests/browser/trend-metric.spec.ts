import { test, expect } from "./fixtures";
import { schedule } from "../../src/model";
test("metric selection follows every Trends tab in both directions", async ({
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
  expect(
    (
      await request.put("/api/journal", {
        data: { state, expected: state.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  const metric = page.getByRole("combobox", { name: "Chart metric" });
  await metric.selectOption("gut");
  for (const tab of [
    "Previous weekdays",
    "Week flow",
    "Year flow",
    "Days YoY",
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await expect(metric).toHaveValue("gut");
  }
  await page.getByRole("button", { name: "Year flow", exact: true }).click();
  await metric.selectOption("weight");
  for (const tab of [
    "Week flow",
    "Previous weekdays",
    "Days YoY",
    "Year flow",
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await expect(metric).toHaveValue("weight");
  }
});
