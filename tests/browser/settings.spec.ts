import { test, expect } from "./fixtures";
test("schedules, profile ratio, invalid import rollback, and immediate deletions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Effective date").fill("2026-11-01");
  await page.getByLabel("Weight", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Add a metric" }).click();
  await page.getByLabel("Metric name").fill("Gut");
  await page.getByLabel("First measurement").fill("36");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved 1 entry");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({
    path: "test-results/mynormal-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /User profile Height/ }).click();
  await page.getByRole("textbox", { name: "Height", exact: true }).fill("72");
  await page.getByRole("button", { name: "Save height" }).click();
  await expect(page.getByRole("status")).toContainText("Height saved");
  await page
    .getByRole("combobox", { name: "Waist metric" })
    .selectOption({ label: "Gut" });
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("checkbox", { name: "Waist-to-height ratio" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Waist-to-height ratio" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Waist/Ht", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: /Measurement schedules Choose/ })
    .click();
  const gut = page
    .locator(".schedule-section")
    .filter({ has: page.getByRole("heading", { name: "Gut", exact: true }) });
  await gut
    .getByRole("combobox", { name: "Reporting schedule" })
    .selectOption("monthly");
  await gut.getByRole("button", { name: "15", exact: true }).click();
  await expect(
    gut.getByRole("button", { name: "15", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page.getByRole("button", { name: /Manage data History/ }).click();
  await page.getByLabel("Import CSV", { exact: true }).setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Date,Weight (lb)\n2026-11-02,199\n2026-11-03,invalid"),
  });
  await expect(page.getByRole("status")).toContainText(
    "valid positive measurement",
  );
  await expect(
    page.getByRole("button", { name: "2026-11-02", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: "0.500", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Select 2026-11-01" }).check();
  await page
    .getByRole("button", { name: "Delete selected entries (1)" })
    .click();
  await expect(page.getByRole("status")).toContainText("Deleted 1 entries");
  await page
    .locator("section.card")
    .filter({ has: page.getByRole("heading", { name: "Delete metric columns", exact: true }) })
    .getByRole("button", { name: "Select all", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete selected columns" }).click();
  await page.getByRole("button", { name: "New entry", exact: true }).click();
  await expect(page.getByLabel("Weight", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Effective date")).toBeVisible();
});
