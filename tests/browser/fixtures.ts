import { test as base, expect } from "@playwright/test";
import { initial } from "../../src/model";
export const test = base.extend<{ emptyJournal: void }>({
  emptyJournal: [
    async ({ page, request }, use) => {
      const health = await request.get("/health");
      const environment = await health.json();
      if (!environment.testEnvironment)
        throw Error("Mutation tests require an isolated test database.");
      const current = await (await request.get("/api/journal")).json();
      const reset = await request.put("/api/journal", {
        data: {
          state: { ...initial(), demoRevision: 2 },
          expected: current.revision,
        },
      });
      expect(reset.ok()).toBe(true);
      await page.goto("/");
      await expect(page.getByLabel("Effective date")).toBeVisible();
      await use();
    },
    { auto: true },
  ],
});
export { expect };
