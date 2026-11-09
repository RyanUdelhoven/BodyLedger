import { test, expect } from "./fixtures";
import { readFileSync } from "node:fs";

test("Settings removes examples, orders history after deletion, and persists renamed metrics", async ({
  page,
  request,
}) => {
  await page.getByLabel("Weight", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /Manage data History/ }).click();
  await expect(
    page.getByRole("heading", { name: "Explore with demo history" }),
  ).toHaveCount(0);
  const history = await page.locator(".history-card:visible").boundingBox();
  const deletion = await page
    .getByRole("heading", { name: "Delete metric columns" })
    .boundingBox();
  expect(history!.y).toBeGreaterThan(deletion!.y);
  await page.getByLabel("Weight name", { exact: true }).fill(" ");
  await page.getByRole("button", { name: "Save metric names" }).click();
  await expect(page.getByRole("alert")).toContainText("1 to 10");
  await page.getByLabel("Weight name", { exact: true }).fill("Mass");
  await page.getByRole("button", { name: "Save metric names" }).click();
  await expect(
    page.getByRole("columnheader", { name: "Mass", exact: true }),
  ).toBeVisible();
  const saved = await (await request.get("/api/journal")).json();
  expect(saved.metrics[0]).toMatchObject({ id: "weight", title: "Mass" });
  expect(saved.entries).toHaveLength(1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  expect(readFileSync((await (await download).path())!, "utf8")).toContain(
    "Mass (lb)",
  );
  await page.reload();
  await expect(page.getByLabel("Mass", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  await expect(
    page.getByRole("option", { name: "Mass", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mass", exact: true }),
  ).toBeVisible();
});
