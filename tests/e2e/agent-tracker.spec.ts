import { test, expect } from '@playwright/test'

// Create a manuscript, add a literary agent, and confirm it persists to a CSV in the archive
// folder, filters in-memory, and deletes — the CSV-backed query tracker.
test('agents are tracked per-manuscript in a CSV, filterable and editable', async ({ page }) => {
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
  await expect(page.getByRole('heading', { name: 'Literary agents' })).toBeVisible({
    timeout: 15_000,
  })

  // Create a manuscript to track against.
  await page.getByLabel('New manuscript name').fill('Somethings Happening')
  await page.getByRole('button', { name: '+ Manuscript' }).click()
  await expect(page.getByRole('button', { name: '+ Agent' })).toBeVisible({ timeout: 15_000 })

  // Add an agent.
  await page.getByRole('button', { name: '+ Agent' }).click()
  await page.getByLabel('Name', { exact: true }).fill('Catherine Ross')
  await page.getByLabel('Agency', { exact: true }).fill('Corvisiero Literary Agency')
  await page.getByLabel('Genres (; separated)').fill('horror; horror-comedy')
  await page.getByRole('button', { name: 'Save agent' }).click()

  const row = page.locator('.agent').filter({ hasText: 'Catherine Ross' })
  await expect(row).toBeVisible({ timeout: 15_000 })
  await expect(row.locator('.status--unresearched')).toBeVisible()

  // It persisted to the manuscript's CSV, with semicolon-joined genres.
  const csv = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('query-tracker')
    const fh = await dir.getFileHandle('somethings-happening.agents.csv')
    return (await fh.getFile()).text()
  })
  expect(csv).toContain('Catherine Ross')
  expect(csv).toContain('horror;horror-comedy')

  // In-memory filter: a non-match hides the row, a match brings it back.
  const search = page.getByRole('searchbox', { name: 'Search agents' })
  await search.fill('zzzz')
  await expect(row).toHaveCount(0)
  await search.fill('corvisiero')
  await expect(row).toBeVisible()
  await search.fill('')

  // Delete removes it from the list and the CSV.
  await row.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('.agent').filter({ hasText: 'Catherine Ross' })).toHaveCount(0)
  const after = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('query-tracker')
    const fh = await dir.getFileHandle('somethings-happening.agents.csv')
    return (await fh.getFile()).text()
  })
  expect(after).not.toContain('Catherine Ross')
})
