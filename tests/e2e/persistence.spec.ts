import { test, expect } from '@playwright/test'

// The chosen folder is remembered (IndexedDB): after a reload the app reconnects on its own,
// no gate, no re-picking. (In e2e mode the OPFS handle stands in and is always permitted.)
test('remembers the archive and auto-reconnects after reload', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['research', 'notebook', 'story-bible', 'library', 'projects']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
    const dir = await root.getDirectoryHandle('research', { create: true })
    const handle = await dir.getFileHandle('kept.md', { create: true })
    const w = await handle.createWritable()
    await w.write('---\ntitle: Kept Note\n---\nStill here after reload.\n')
    await w.close()
  })

  await expect(page.getByRole('heading', { name: 'Open your archive' })).toBeVisible()
  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })
  await expect(page.getByText('Kept Note')).toBeVisible({ timeout: 15_000 })

  // Reload — the app should reconnect to the remembered folder without showing the gate.
  await page.reload()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })
  await expect(page.getByText('Kept Note')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Open your archive' })).toHaveCount(0)
})
