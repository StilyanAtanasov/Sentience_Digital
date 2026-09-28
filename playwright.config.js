import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "npx --no-install serve . -p 3000",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
