import { test, expect } from "./fixtures";
import { canonical } from "../../src/model";
test("New entry combines labels with larger inputs, places Add beside date, and edits from history", async ({
  page,
  request,
}) => {
  const state = await (await request.get("/api/journal")).json();
  state.entries = [
    { id: "old", date: "2026-11-01", values: { weight: canonical(180, "lb") } },
    { id: "new", date: "2026-11-02", values: { weight: canonical(182, "lb") } },
  ];
  expect(
    (
      await request.put("/api/journal", {
        data: { state, expected: state.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const date = await page.getByLabel("Effective date").boundingBox(),
      add = await page
        .getByRole("button", { name: "Add a metric" })
        .boundingBox();
    expect(
      Math.abs(date!.y + date!.height / 2 - (add!.y + add!.height / 2)),
    ).toBeLessThan(3);
    expect(add!.x).toBeGreaterThan(date!.x);
    await expect(
      page.locator(".entry-actions").getByLabel("Effective date"),
    ).toBeVisible();
    await expect(
      page.locator(".entry-actions").getByRole("button", { name: /Save/ }),
    ).toBeVisible();
  }
  const input = page.getByRole("textbox", { name: "Weight", exact: true }),
    group = input.locator("..");
  await expect(group.locator("label")).toHaveText("Weight");
  await group.locator("label").click();
  await expect(input).toBeFocused();
  await expect(group).toHaveCSS("outline-style", "solid");
  expect(
    await input.evaluate((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    ),
  ).toBe(28.8);
  const history = page.getByRole("region", { name: "History", exact: true });
  await expect(history).toBeVisible();
  const historyBox = await history.boundingBox(),
    formBox = await page.locator(".entry-card").boundingBox();
  expect(historyBox!.y).toBeGreaterThan(formBox!.y + formBox!.height);
  await history
    .getByRole("button", { name: "2026-11-01", exact: true })
    .click();
  await expect(page.getByLabel("Effective date")).toHaveValue("2026-11-01");
  await expect(input).toHaveValue("180");
  await input.click();
  expect(
    await input.evaluate(
      (element) => (element as HTMLInputElement).selectionEnd,
    ),
  ).toBe(3);
  await input.fill("181");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved 1 entry");
  await expect(
    history.getByRole("cell", { name: "181.00 lb", exact: true }),
  ).toBeVisible();
  const saved = await (await request.get("/api/journal")).json();
  expect(saved.entries).toHaveLength(2);
  expect(
    saved.entries.find((entry: { id: string }) => entry.id === "old").values
      .weight,
  ).toBeCloseTo(canonical(181, "lb"));
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await expect(input).toBeVisible();
  await page.screenshot({
    path: "test-results/entry-history-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({
    path: "test-results/entry-history-desktop.png",
    fullPage: true,
  });
});
