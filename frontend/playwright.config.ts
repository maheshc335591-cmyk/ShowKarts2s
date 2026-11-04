import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const root = fileURLToPath(new URL("../", import.meta.url));
const pages = process.env.PAGES_TEST === "true";
const python = path.join(
  root,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);

export default defineConfig({
  testDir: "./e2e",
  testMatch: pages ? "pages.spec.ts" : "website.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: pages ? "http://127.0.0.1:8012/ShowKarts2s/" : "http://127.0.0.1:8011",
    timezoneId: "Asia/Kolkata",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: pages
      ? "npm run preview -- --host 127.0.0.1 --port 8012"
      : `"${python}" scripts/serve_e2e.py`,
    cwd: pages ? path.join(root, "frontend") : root,
    url: pages ? "http://127.0.0.1:8012/ShowKarts2s/" : "http://127.0.0.1:8011/api/health",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
