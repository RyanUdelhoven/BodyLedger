import { test, expect } from "./fixtures";
import { execFileSync } from "node:child_process";
test("Coulson bookmark starts stopped containers twice and retains the database", async ({
  page,
}) => {
  test.skip(
    process.env.BODYLEDGER_LIFECYCLE !== "1",
    "Explicit Coulson lifecycle verification only.",
  );
  test.setTimeout(120000);
  await page.goto("/");
  await expect(page.getByLabel("Effective date")).toBeVisible({
    timeout: 60000,
  });
  await page.getByLabel("Effective date").fill("2026-11-03");
  await page.getByLabel("Weight", { exact: true }).fill("201.2");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved 1 entry");
  for (let cycle = 0; cycle < 2; cycle++) {
    execFileSync("/usr/local/bin/coulson", ["stop", "bodyledger"], {
      timeout: 30000,
    });
    const running = execFileSync(
      "/usr/local/bin/docker",
      ["compose", "-p", "bodyledger", "ps", "--status", "running", "--quiet"],
      { encoding: "utf8" },
    );
    expect(running.trim()).toBe("");
    await page.goto("/");
    await expect(page.getByLabel("Effective date")).toBeVisible({
      timeout: 60000,
    });
    await page.getByLabel("Effective date").fill("2026-11-03");
    await expect(page.getByLabel("Weight", { exact: true })).toHaveValue(
      "201.2",
    );
  }
});
