import { test, expect } from '@playwright/test'

// Import agents from pasted JSON: new rows land as unresearched, duplicates are skipped, a
// stale (old status_last_checked) agent surfaces under "Needs refresh", and it all persists.
test('import agents from JSON, dedupe on re-import, and flag stale entries', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['notebook', 'research', 'story-bible', 'spaces', 'library', 'query-tracker']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })

  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  await page.getByRole('link', { name: 'Query Tracker', exact: true }).click()
  await page.getByLabel('New manuscript name').fill('Book One')
  await page.getByRole('button', { name: '+ Manuscript' }).click()
  await expect(page.getByRole('button', { name: '+ Agent' })).toBeVisible({ timeout: 15_000 })

  const seed = JSON.stringify([
    { name: 'Chris Lotts', agency: 'The Lotts Agency', genres: ['horror'] },
    { name: 'Ginger Clark', agency: 'Ginger Clark Literary', status: 'open', status_last_checked: '2020-01-01' },
  ])

  // First import: both are new.
  await page.getByRole('button', { name: 'Import…', exact: true }).click()
  await page.getByLabel('Import data').fill(seed)
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await expect(page.locator('.agent-import__msg')).toContainText('Imported 2 new agents')
  await expect(page.locator('.agent').filter({ hasText: 'Chris Lotts' })).toBeVisible()
  await expect(page.locator('.agent').filter({ hasText: 'Ginger Clark' })).toBeVisible()

  // The old-checked agent surfaces as stale; the never-checked one does not.
  const refresh = page.locator('.agent-refresh')
  await expect(refresh).toContainText('Needs refresh · 1')
  await expect(refresh).toContainText('Ginger Clark')

  // Re-importing the same data adds nothing and reports the skips.
  await page.getByLabel('Import data').fill(seed)
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await expect(page.locator('.agent-import__msg')).toContainText('Imported 0 new agents, skipped 2 duplicates')

  // Both persisted to the CSV.
  const csv = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('query-tracker')
    const fh = await dir.getFileHandle('book-one.agents.csv')
    return (await fh.getFile()).text()
  })
  expect(csv).toContain('Chris Lotts')
  expect(csv).toContain('Ginger Clark')
})
