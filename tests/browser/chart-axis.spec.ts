import { test, expect } from "./fixtures";
import { demo } from "../../src/model";
test("all charts use no more than five whole-number grid lines in display units", async ({
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
      expect(labels.length).toBeLessThanOrEqual(5);
      expect(labels.every((label) => /^-?\d[\d,]*$/.test(label))).toBe(true);
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
