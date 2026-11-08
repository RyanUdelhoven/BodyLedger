import { test, expect } from "./fixtures";
test("trend steppers edit independently during delayed saves and persist each range", async ({
  page,
  request,
}) => {
  await page.route("**/api/journal", async (route) => {
    if (route.request().method() === "PUT")
      await new Promise((resolve) => setTimeout(resolve, 200));
    await route.continue();
  });
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  const modes = [
    { tab: "Days YoY", label: "Weeks covered", key: "days", value: "41" },
    {
      tab: "Previous weekdays",
      label: "Weeks covered",
      key: "weekday",
      value: "19",
    },
    { tab: "Week flow", label: "Previous weeks", key: "week", value: "8" },
    { tab: "Year flow", label: "Previous years", key: "year", value: "6" },
  ];
  for (const mode of modes) {
    await page.getByRole("button", { name: mode.tab, exact: true }).click();
    const input = page.getByRole("spinbutton", {
      name: mode.label,
      exact: true,
    });
    await input.fill("");
    await expect(input).toHaveValue("");
    await input.fill(mode.value);
    await input.press("ArrowUp");
    await expect(input).toHaveValue(String(+mode.value + 1));
    await input.press("ArrowDown");
    await expect(input).toHaveValue(mode.value);
  }
  for (const mode of modes) {
    await page.getByRole("button", { name: mode.tab, exact: true }).click();
    await expect(
      page.getByRole("spinbutton", { name: mode.label, exact: true }),
    ).toHaveValue(mode.value);
  }
  await expect
    .poll(async () => {
      const response = await request.get("/api/journal");
      return (await response.json()).ranges;
    })
    .toEqual({ days: 41, weekday: 19, week: 8, year: 6 });
  await page.reload();
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  for (const mode of modes) {
    await page.getByRole("button", { name: mode.tab, exact: true }).click();
    await expect(
      page.getByRole("spinbutton", { name: mode.label, exact: true }),
    ).toHaveValue(mode.value);
  }
  const year = page.getByRole("spinbutton", {
    name: "Previous years",
    exact: true,
  });
  await year.fill("101");
  await year.press("Tab");
  await expect(year).toHaveValue("6");
});

test("Days YoY covers seven calendar days per selected week", async ({
  page,
  request,
}) => {
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  const weeks = page.getByRole("spinbutton", {
    name: "Weeks covered",
    exact: true,
  });
  await weeks.fill("1");
  await expect(page.locator(".data-details summary")).toContainText("7 dates");
  await weeks.press("ArrowUp");
  await expect(weeks).toHaveValue("2");
  await expect(page.locator(".data-details summary")).toContainText("14 dates");
  await expect
    .poll(async () => (await (await request.get("/api/journal")).json()).ranges)
    .toEqual({ days: 2, weekday: 52, week: 12, year: 3 });
  await page.reload();
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Weeks covered", exact: true }),
  ).toHaveValue("2");
  await expect(page.locator(".data-details summary")).toContainText("14 dates");
});
