import { test, expect } from "./fixtures";
import { schedule } from "../../src/model";
test("New entry has three measurements per row and tabs directly between values", async ({
  page,
  request,
}) => {
  const state = await (await request.get("/api/journal")).json();
  for (const [id, title, kind] of [
    ["gut", "Gut", "length"],
    ["fat", "Body fat", "percentage"],
    ["steps", "Steps", "number"],
    ["chest", "Chest", "length"],
    ["hips", "Hips", "length"],
  ])
    state.metrics.push({ id, title, kind, schedule: schedule() });
  expect(
    (
      await request.put("/api/journal", {
        data: { state, expected: state.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  const names = ["Weight", "Gut", "Body fat", "Steps", "Chest", "Hips"];
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const boxes = await page
      .locator(".measurement-input input")
      .evaluateAll((inputs) =>
        inputs.map((input) => {
          const b = input.getBoundingClientRect();
          return { x: b.x, y: b.y, width: b.width };
        }),
      );
    expect(boxes).toHaveLength(6);
    for (const row of [boxes.slice(0, 3), boxes.slice(3)]) {
      expect(
        Math.max(...row.map((b) => b.y)) - Math.min(...row.map((b) => b.y)),
      ).toBeLessThan(1);
      expect(row[0].x).toBeLessThan(row[1].x);
      expect(row[1].x).toBeLessThan(row[2].x);
    }
    expect(boxes[3].y).toBeGreaterThan(boxes[0].y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("textbox", { name: names[0], exact: true }).focus();
  for (let index = 0; index < names.length; index++) {
    const input = page.getByRole("textbox", {
      name: names[index],
      exact: true,
    });
    await expect(input).toBeFocused();
    await input.fill(String(index === 0 ? 200 : 30 + index));
    await input.press("Tab");
    if (index < names.length - 1)
      await expect(
        page.getByRole("textbox", { name: names[index + 1], exact: true }),
      ).toBeFocused();
  }
  await expect(
    page.getByRole("button", { name: "Add a metric" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("textbox", { name: "Hips", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("textbox", { name: "Chest", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(
    page.getByRole("combobox", { name: "Chest input unit", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("textbox", { name: "Chest", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved 1 entry");
  const saved = (await (await request.get("/api/journal")).json()).entries[0];
  expect(Object.keys(saved.values)).toHaveLength(6);
});
