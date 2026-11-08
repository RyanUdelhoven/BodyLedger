import { test, expect } from "./fixtures";
import { demo } from "../../src/model";
import { readFileSync } from "node:fs";
test("loads and exports complete demo history through Settings", async ({
  page,
  request,
}) => {
  const state = await (await request.get("/api/journal")).json();
  expect(
    (
      await request.put("/api/journal", {
        data: { state: demo(state, true), expected: state.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /Manage data History/ }).click();
  await expect(
    page.getByRole("button", {
      name: "Replace all data with demo history",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByText("2,504 daily reports. Select a date to edit."),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const file = await downloadEvent;
  const content = readFileSync((await file.path())!, "utf8");
  expect(content.split("\r\n")).toHaveLength(2505);
  expect(content).toContain("2020-01-01,");
  expect(content).toContain("2026-11-08,");
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  await expect(page.locator(".recharts-line-curve").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/demo-trends.png",
    fullPage: true,
  });
});
