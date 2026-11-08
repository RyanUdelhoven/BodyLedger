import { test, expect } from "@playwright/test";
test("requested history appears automatically and survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Effective date")).toBeVisible();
  await expect(
    page.getByText("2,504 entries · 2 metrics · Latest 2026-11-08"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  await expect(page.locator(".recharts-line-curve").first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("2,504 entries · 2 metrics · Latest 2026-11-08"),
  ).toBeVisible();
});
