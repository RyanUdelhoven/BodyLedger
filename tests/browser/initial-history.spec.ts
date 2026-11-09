import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("requested history appears in a new database and survives reload", async ({
  page,
}) => {
  const directory = await mkdtemp(join(tmpdir(), "mynormal-initial-"));
  const reservation = createServer().listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const address = reservation.address();
  if (!address || typeof address === "string")
    throw Error("Could not allocate a temporary test port.");
  const port = address.port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const server = spawn(
    process.execPath,
    ["--experimental-strip-types", "server.mjs"],
    {
      env: {
        ...process.env,
        PORT: String(port),
        DB_PATH: join(directory, "journal.sqlite"),
        MYNORMAL_TEST: "1",
      },
      stdio: "ignore",
    },
  );
  const url = `http://127.0.0.1:${port}`;
  try {
    await expect
      .poll(async () => {
        try {
          return (await fetch(`${url}/health`)).ok;
        } catch {
          return false;
        }
      })
      .toBe(true);
    await page.goto(url);
    await expect(page.getByLabel("Effective date")).toBeVisible();
    await expect(
      page.getByText("2,504 entries · 2 metrics · Latest 2026-11-08"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Trends", exact: true }).click();
    await expect(page.locator(".recharts-line-curve").first()).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("2,504 entries · 2 metrics · Latest 2026-11-08"),
    ).toBeVisible();
  } finally {
    const exit = once(server, "exit");
    server.kill("SIGTERM");
    await exit;
    await rm(directory, { recursive: true, force: true });
  }
});
