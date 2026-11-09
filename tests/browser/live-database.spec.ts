import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
test("live SQLite dataset survives two Coulson stop and bookmark starts", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.MYNORMAL_LIVE_CHECK !== "1",
    "Explicit read-only live persistence check.",
  );
  test.setTimeout(120000);
  const before = await (await request.get("/api/journal")).json();
  expect(before.entries).toHaveLength(2504);
  for (let i = 0; i < 2; i++) {
    execFileSync("/usr/local/bin/coulson", ["stop", "mynormal"], {
      timeout: 30000,
    });
    expect(
      execFileSync(
        "/usr/local/bin/docker",
        ["compose", "-p", "mynormal", "ps", "--status", "running", "--quiet"],
        { encoding: "utf8" },
      ).trim(),
    ).toBe("");
    await page.goto("/");
    await expect(page.getByLabel("Effective date")).toBeVisible({
      timeout: 60000,
    });
    await expect(
      page.getByText("2,504 entries · 2 metrics · Latest 2026-11-08"),
    ).toBeVisible();
    const after = await (await request.get("/api/journal")).json();
    expect(after).toEqual(before);
  }
  await page.getByRole("button", { name: "Trends", exact: true }).click();
  await expect(page.locator(".recharts-line-curve").first()).toBeVisible();
});
