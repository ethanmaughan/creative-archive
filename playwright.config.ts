import { defineConfig, devices } from '@playwright/test'

// Web-first shell (decision C): we validate against Chromium, which is where the
// File System Access API lives. Additional browsers are not targeted for v1.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
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
