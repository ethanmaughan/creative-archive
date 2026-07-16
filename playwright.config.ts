import { defineConfig, devices } from '@playwright/test'

// Web-first shell (decision C): we validate against Chromium, which is where the
// File System Access API lives. Additional browsers are not targeted for v1.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Opening an archive can cold-start a worker + WASM SQLite; give tests room beyond the
  // 30s default so a slow first compile doesn't kill the test before its own waits elapse.
  timeout: 90_000,
  retries: process.env.CI ? 2 : 1,
  // Each spec spins up a data worker + WASM SQLite + OPFS; cap concurrency so cold-start
  // compilation doesn't overload the shared dev server.
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: './node_modules/.bin/vite --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
