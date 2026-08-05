import { test, expect } from '@playwright/test'

// Move an agent through the submission pipeline: log a status change, watch the card move
// columns, see the history, and confirm the append-only submissions.csv on disk.
test('log a submission status change and move the agent through the pipeline', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of [
      'notebook',
      'research',
      'story-bible',
      'spaces',
      'library',
      'query-tracker',
    ]) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })

  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  await page.getByRole('link', { name: 'Query Tracker', exact: true }).click()
  await page.getByLabel('New manuscript name').fill('Book One')
  await page.getByRole('button', { name: '+ Manuscript' }).click()
  await expect(page.getByRole('button', { name: '+ Agent' })).toBeVisible({ timeout: 15_000 })

  // Add an agent.
  await page.getByRole('button', { name: '+ Agent' }).click()
  await page.getByLabel('Name', { exact: true }).fill('Chris Lotts')
  await page.getByLabel('Agency', { exact: true }).fill('The Lotts Agency')
  await page.getByRole('button', { name: 'Save agent' }).click()
  await expect(page.locator('.agent').filter({ hasText: 'Chris Lotts' })).toBeVisible()

  // Switch to the pipeline; the agent starts in "Not queried".
  await page.getByRole('button', { name: 'Pipeline', exact: true }).click()
  const cardColumn = page
    .locator('.pipeline__col')
    .filter({ has: page.locator('.pipeline__name', { hasText: 'Chris Lotts' }) })
  await expect(cardColumn.locator('.pipeline__colhead')).toContainText('Not queried')

  // Log a status change to "Queried" with a note.
  await page.locator('.pipeline__name', { hasText: 'Chris Lotts' }).click()
  await page.getByLabel('New status for Chris Lotts').selectOption('queried')
  await page.getByLabel('Note for Chris Lotts').fill('sent query email')
  await page.getByRole('button', { name: 'Log update' }).click()

  // The card moved out of "Not queried" and the history records the note.
  await expect(cardColumn.locator('.pipeline__colhead')).not.toContainText('Not queried')
  await expect(cardColumn.locator('.pipeline__colhead')).toContainText('Queried')
  await expect(page.locator('.pipeline__history')).toContainText('sent query email')

  // The append-only log persisted to disk.
  const csv = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('query-tracker')
    const fh = await dir.getFileHandle('book-one.submissions.csv')
    return (await fh.getFile()).text()
  })
  expect(csv).toContain('Chris Lotts')
  expect(csv).toContain('queried')
  expect(csv).toContain('sent query email')
})
