import { test, expect } from "./fixtures";
import { schedule } from "../../src/model";
test("entry is compact and selects the number while highlighting its value and unit together", async ({
  page,
  request,
}) => {
  const state = await (await request.get("/api/journal")).json();
  state.metrics.push(
    { id: "gut", title: "Gut", kind: "length", schedule: schedule() },
    { id: "steps", title: "Steps", kind: "number", schedule: schedule(true) },
  );
  expect(
    (
      await request.put("/api/journal", {
        data: { state, expected: state.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page
    .getByRole("textbox", { name: "Weight", exact: true })
    .fill("198.2");
  await page.getByRole("textbox", { name: "Gut", exact: true }).fill("38.375");
  for (const name of ["Weight", "Gut", "Steps"]) {
    const input = page.getByRole("textbox", { name, exact: true });
    await input.click();
    expect(
      await input.evaluate((element) => {
        const input = element as HTMLInputElement;
        return {
          start: input.selectionStart,
          end: input.selectionEnd,
          length: input.value.length,
        };
      }),
    ).toEqual({
      start: 0,
      end: name === "Weight" ? 5 : name === "Gut" ? 6 : 0,
      length: name === "Weight" ? 5 : name === "Gut" ? 6 : 0,
    });
    await expect(input.locator("..")).toHaveCSS("outline-style", "solid");
    const label = await input.locator("..").locator("label").boundingBox(),
      box = await input.boundingBox();
    expect(
      Math.abs(label!.y + label!.height / 2 - (box!.y + box!.height / 2)),
    ).toBeLessThan(3);
    expect(box!.height).toBeGreaterThanOrEqual(36);
    expect(
      await input.evaluate((element) =>
        parseFloat(getComputedStyle(element).fontSize),
      ),
    ).toBeGreaterThanOrEqual(18);
    await expect(input.locator("..").locator("label")).toHaveText(name);
  }
  await expect(
    page.getByRole("button", { name: "Note", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Clear form", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Make this journal yours", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved 1 entry");
  const saved = await (await request.get("/api/journal")).json();
  expect(saved.entries[0]).not.toHaveProperty("note");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /Manage data History/ }).click();
  await expect(
    page.getByRole("columnheader", { name: "Note", exact: true }),
  ).toHaveCount(0);
  const withLegacyNote = {
    ...saved,
    entries: saved.entries.map((entry: object) => ({
      ...entry,
      note: "Do not store this",
    })),
  };
  expect(
    (
      await request.put("/api/journal", {
        data: { state: withLegacyNote, expected: saved.revision },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (await (await request.get("/api/journal")).json()).entries[0],
  ).not.toHaveProperty("note");
  await page.screenshot({
    path: "test-results/notes-removed-settings.png",
    fullPage: true,
  });
});
