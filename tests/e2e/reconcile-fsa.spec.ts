import { test, expect } from '@playwright/test'

// Proves the File System Access adapter reads/writes/lists a real directory handle, and
// that the reconciler indexes it end-to-end (including UUID injection back into files and
// FTS population). The handle comes from OPFS, which exposes the same interface as
// showDirectoryPicker — so the adapter is exercised for real without the native picker.
test('FSA adapter + reconciler run against a real OPFS directory', async ({ page }) => {
  await page.goto('/reconcile-check.html')
  const status = page.locator('#status')
  await expect(status).toHaveAttribute('data-state', 'ok', { timeout: 30_000 })
  await expect(status).toContainText('docs=2')
  await expect(status).toContainText('idInjected=true')
  await expect(status).toContainText('ftsHits=1')
})
