import { defineConfig } from "@playwright/test";
const external = process.env.MYNORMAL_URL;
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: external ?? "http://127.0.0.1:3101",
    headless: true,
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
  },
  reporter: "list",
  webServer: external
    ? undefined
    : {
        command: "node --experimental-strip-types server.mjs",
        url: "http://127.0.0.1:3101/health",
        env: {
          PORT: "3101",
          DB_PATH: `/tmp/mynormal-browser-${process.pid}.sqlite`,
          MYNORMAL_TEST: "1",
        },
        reuseExistingServer: false,
      },
});
