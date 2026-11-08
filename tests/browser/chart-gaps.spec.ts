import { test, expect } from "./fixtures";
import { localDate, addDays } from "../../src/model";
test("trend lines bridge missing observations without filling missing table cells", async ({
  page,
  request,
}) => {
  const state = await (await request.get("/api/journal")).json();
  const today = localDate();
  const dates = [
    addDays(today, -180),
    addDays(today, -90),
    addDays(today, -6),
    addDays(today, -1),
  ];
  state.entries = dates.map((date, index) => ({
    id: `gap-${index}`,
    date,
    values: { weight: 90 + index },
    note: "",
  }));
  expect(
    (
      await request.put("/api/journal", {
        data: { state, expected: state.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  for (const mode of ["Days YoY", "Week flow", "Year flow"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    const curve = page.locator(".recharts-line-curve").first();
    await expect(curve).toBeVisible();
    await expect
      .poll(async () => {
        const path = await curve.getAttribute("d");
        return {
          moves: (path?.match(/M/g) ?? []).length,
          hasLine: !!path?.includes("L"),
        };
      })
      .toEqual({ moves: 1, hasLine: true });
    const details = page.locator(".data-details");
    if ((await details.getAttribute("open")) === null)
      await details.locator("summary").click();
    await expect(
      details.getByRole("cell", { name: "—", exact: true }).first(),
    ).toBeVisible();
  }
});
