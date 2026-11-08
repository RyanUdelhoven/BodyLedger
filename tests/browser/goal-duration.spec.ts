import { test, expect } from "./fixtures";
import { canonical } from "../../src/model";

test("goals persist direction and duration and report measured streaks", async ({
  page,
  request,
}) => {
  const state = await (await request.get("/api/journal")).json();
  state.entries = [
    { id: "1", date: "2020-01-01", values: { weight: canonical(226, "lb") } },
    { id: "2", date: "2020-01-21", values: { weight: canonical(225, "lb") } },
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
  await page.locator(".goal-card").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Target", { exact: true }).fill("227");
  await dialog.getByLabel("Direction").selectOption("below");
  await dialog.getByLabel("Duration", { exact: true }).fill("3");
  await dialog.getByLabel("Time unit").selectOption("weeks");
  await dialog.getByRole("button", { name: "Save goal" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".goal-card").first()).toContainText(
    "Goal satisfied: 21 days",
  );
  await page.reload();
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.locator(".goal-card").first().click();
  await expect(dialog.getByLabel("Duration", { exact: true })).toHaveValue("3");
  await expect(dialog.getByLabel("Direction")).toHaveValue("below");
  await dialog.getByLabel("Direction").selectOption("above");
  await dialog.getByRole("button", { name: "Save goal" }).click();
  await expect(page.locator(".goal-card").first()).toContainText(
    "Current streak: 0 days",
  );
  await page.screenshot({
    path: "test-results/goal-duration.png",
    fullPage: true,
  });
});
