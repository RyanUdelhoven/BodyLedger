import { test, expect } from "./fixtures";
import { schedule, localDate, canonical } from "../../src/model";
test("entry decimal points align across precision, integers, mobile, and history edits", async ({
  page,
  request,
}) => {
  const state = await (await request.get("/api/journal")).json();
  state.metrics.push(
    { id: "gut", title: "Gut", kind: "length", schedule: schedule() },
    { id: "steps", title: "Steps", kind: "number", schedule: schedule(true) },
    { id: "fat", title: "Body fat", kind: "percentage", schedule: schedule() },
  );
  expect(
    (
      await request.put("/api/journal", {
        data: { state, expected: state.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  for (const [label, value] of [
    ["Weight", "198.2"],
    ["Gut", "38.375"],
    ["Steps", "12345"],
    ["Body fat", "23.55"],
  ])
    await page.getByRole("textbox", { name: label, exact: true }).fill(value);
  async function check(selector: string) {
    const positions = await page.locator(selector).evaluateAll((inputs) =>
      inputs.map((element) => {
        const input = element as HTMLInputElement,
          style = getComputedStyle(input),
          canvas = document.createElement("canvas"),
          context = canvas.getContext("2d")!;
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const text = input.value,
          integer = text.split(/[.,]/)[0],
          bounds = input.getBoundingClientRect();
        return (
          bounds.right -
          parseFloat(style.borderRightWidth) -
          parseFloat(style.paddingRight) -
          context.measureText(text).width +
          context.measureText(integer).width
        );
      }),
    );
    expect(positions).toHaveLength(4);
    if (selector.includes("measurement-input")) {
      for (let column = 0; column < 3; column++) {
        const values = positions.filter((_, index) => index % 3 === column);
        expect(Math.max(...values) - Math.min(...values)).toBeLessThan(1);
      }
    } else
      expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
  }
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await check(".measurement-input input");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/decimal-inputs-${viewport.width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("combobox", { name: "Gut input unit", exact: true })
    .selectOption("cm");
  await expect(
    page.getByRole("textbox", { name: "Gut", exact: true }),
  ).toHaveValue("97.4725");
  await check(".measurement-input input");
  await page
    .getByRole("combobox", { name: "Weight input unit", exact: true })
    .selectOption("kg");
  await check(".measurement-input input");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved 1 entry");
  const saved = (await (await request.get("/api/journal")).json()).entries[0];
  expect(saved.values.weight).toBeCloseTo(canonical(198.2, "lb"));
  expect(saved.values.gut).toBeCloseTo(canonical(38.375, "in"));
  expect(saved.values.steps).toBe(12345);
  expect(saved.values.fat).toBe(23.55);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /Manage data History/ }).click();
  await page.getByRole("button", { name: localDate(), exact: true }).click();
  await check(".modal .decimal-input");
});
