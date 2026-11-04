import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const root = fileURLToPath(new URL("../", import.meta.url));
const python = path.join(
  root,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8011",
    timezoneId: "Asia/Kolkata",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `"${python}" scripts/serve_e2e.py`,
    cwd: root,
    url: "http://127.0.0.1:8011/api/health",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
