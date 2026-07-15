import { test, expect } from '@playwright/test'

// Proves the persistent path (ADR-0002 decision A): OPFS SAHPool VFS on the main
// thread, no COOP/COEP required. The in-memory correctness of the schema/migrations
// is covered separately by tests/unit/sqlite-index.test.ts.
test('migrations apply against real OPFS in the browser', async ({ page }) => {
  await page.goto('/db-check.html')
  const status = page.locator('#status')
  await expect(status).toHaveAttribute('data-state', 'ok', { timeout: 30_000 })
  await expect(status).toContainText('OPFS OK')
  await expect(status).toContainText('workspaces=1')
})
