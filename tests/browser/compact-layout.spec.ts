import { test, expect } from "./fixtures";
import { demo } from "../../src/model";
test("compact pages retain entry workflow and Settings CSV import", async ({
  page,
}) => {
  await expect(page.locator(".page-heading")).toHaveCount(0);
  await expect(page.getByText("Latest weight", { exact: true })).toHaveCount(0);
  await expect(page.locator(".entry-card .card-header")).toHaveCount(0);
  await expect(page.getByText("DAILY CHECK-IN", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("Effective date", { exact: true })).toHaveCount(
    0,
  );
  const date = await page.getByLabel("Effective date").boundingBox(),
    card = await page.locator(".entry-card").boundingBox();
  expect(date!.x - card!.x).toBeLessThanOrEqual(32);

  await expect(
    page.getByText("Measurements today", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Active goals", { exact: true })).toHaveCount(0);
  await expect(page.getByText("BUILT AROUND YOU", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Import CSV", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /Manage data History/ }).click();
  await expect(page.getByLabel("Import CSV", { exact: true })).toBeAttached();
  await page.getByText("See the CSV format", { exact: true }).click();
  await expect(page.locator(".csv-format code")).toContainText(
    "Date,Weight (lb),Gut (in)",
  );
  const imported = page.getByRole("status");
  await page.getByLabel("Import CSV", { exact: true }).setInputFiles({
    name: "compact.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Date,Weight (lb),Gut (in),Notes\n2026-11-08,200,36,Settings import",
    ),
  });
  await expect(imported).toContainText("Saved 1 entry");
  await expect(
    page.getByRole("cell", { name: "36.00 in", exact: true }),
  ).toBeVisible();
  const exportBox = await page
      .getByRole("button", { name: "Export CSV", exact: true })
      .boundingBox(),
    importBox = await page
      .locator(".csv-import-controls .upload-button")
      .boundingBox();
  expect(Math.abs(exportBox!.y - importBox!.y)).toBeLessThan(4);
});
test("Trends statistics and graph fit desktop and mobile viewports", async ({
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
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const mode of [
      "Days YoY",
      "Previous weekdays",
      "Week flow",
      "Year flow",
    ]) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      await expect(page.locator(".trend-card .card-header")).toHaveCount(0);
      const graph = page.locator(".trend-card .chart-area");
      await expect(graph).toBeVisible();
      const graphBox = await graph.boundingBox();
      expect(graphBox!.y + graphBox!.height).toBeLessThanOrEqual(
        viewport.height - (viewport.width <= 600 ? 68 : 0),
      );
      expect(graphBox!.height).toBeGreaterThanOrEqual(160);
      const metricBox = await page
          .getByRole("combobox", { name: "Chart metric" })
          .boundingBox(),
        rangeBox = await page.getByRole("spinbutton").boundingBox();
      expect(Math.abs(metricBox!.y - rangeBox!.y)).toBeLessThan(4);
      const stats = await page.locator(".stats").boundingBox();
      expect(stats!.y).toBeGreaterThanOrEqual(0);
      expect(stats!.y + stats!.height).toBeLessThan(graphBox!.y);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.getByRole("button", { name: "Days YoY", exact: true }).click();
    await expect
      .poll(() =>
        page
          .locator(".recharts-line-curve")
          .first()
          .getAttribute("stroke-dasharray"),
      )
      .toBe(null);
    await page.screenshot({
      path: `test-results/compact-trends-${viewport.width}.png`,
      fullPage: true,
    });
  }
});
