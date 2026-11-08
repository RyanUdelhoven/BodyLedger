import { test, expect } from "./fixtures";
test("records measurements, keeps drafts, imports atomically, edits history, and restores backups", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make a little progress." }),
  ).toBeVisible();
  await page.getByLabel("Effective date").fill("2026-11-01");
  await page.getByLabel("Weight", { exact: true }).fill("206.1");
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "See the bigger picture." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New entry", exact: true }).click();
  await expect(page.getByLabel("Weight", { exact: true })).toHaveValue("206.1");
  await page.getByRole("button", { name: "Add a metric" }).click();
  await page.getByLabel("Metric name").fill("Gut");
  await page.getByLabel("First measurement").fill("38.375");
  await page.getByRole("button", { name: "Note", exact: true }).click();
  await page.getByLabel("Note", { exact: true }).fill("Browser verification");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved 1 entry");
  await page.reload();
  await expect(page.getByText("206.10 lb").first()).toBeVisible();
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Weight", exact: true }) })
    .click();
  await page.getByLabel("Target", { exact: true }).fill("190");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(page.getByText("190.00 lb")).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Weight units", exact: true })
    .selectOption("kg");
  await page.getByRole("button", { name: "Manage data", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "2026-11-01", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "2026-11-01", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Note", exact: true })
    .fill("Edited verification");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("cell", { name: "Edited verification", exact: true }),
  ).toBeVisible();
  const backupEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Full backup", exact: true }).click();
  const backup = await backupEvent;
  const path = await backup.path();
  expect(path).toBeTruthy();
  await page.getByRole("button", { name: "New entry", exact: true }).click();
  const file = page.locator(".import-card input[type=file]");
  await file.setInputFiles({
    name: "test.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Date,Weight (lb),Gut (in),Steps (number),Notes\n2026-11-02,205.4,38.25,5000,Imported\n2026-11-01,207,38.5,4000,Conflicting",
    ),
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/^Steps/)).toBeVisible();
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", { name: "Saved entry", exact: true }),
    })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("status")).toContainText("Saved 2 entries");
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  for (const mode of [
    "Previous weekdays",
    "Week flow",
    "Year flow",
    "Days YoY",
  ]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: mode, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Manage data", exact: false }).click();
  await page
    .locator('input[accept=".json,application/json"]')
    .setInputFiles(path!);
  await expect(page.getByRole("status")).toContainText("restored");
  await expect(
    page.getByRole("button", { name: "2026-11-02", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "New entry", exact: true }).click();
  await page.screenshot({
    path: "test-results/bodyledger-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Make a little progress." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/bodyledger-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("rejects stale writes from another tab without losing saved data", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make a little progress." }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    other.getByRole("heading", { name: "Make a little progress." }),
  ).toBeVisible();
  await page.getByLabel("Effective date").fill("2026-11-04");
  await page.getByLabel("Weight", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved 1 entry");
  await other.getByLabel("Effective date").fill("2026-11-05");
  await other.getByLabel("Weight", { exact: true }).fill("199");
  await other.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(other.getByRole("status")).toContainText("another tab");
  await expect(other.getByLabel("Weight", { exact: true })).toHaveValue("199");
  await other.reload();
  await expect(other.getByText("200.00 lb").first()).toBeVisible();
});
