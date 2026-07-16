import { test, expect } from '@playwright/test'

// Log a library item through the UI and confirm the typed projection + the file on disk.
test('log a library item and see it typed in the Library', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['library', 'notebook', 'story-bible']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })

  await expect(page.getByRole('heading', { name: 'Open your archive' })).toBeVisible()
  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()

  // Log a book.
  await page.getByRole('button', { name: '+ Log' }).click()
  await page.getByLabel('Title').fill('Dune')
  await page.getByLabel('Creator').fill('Frank Herbert')
  await page.getByLabel('Year').fill('1965')
  await page.getByRole('button', { name: 'Log', exact: true }).click()

  // Lands on the document view for the new item.
  await expect(page.getByRole('heading', { name: 'Dune' })).toBeVisible({ timeout: 15_000 })

  // Back in the Library it shows with typed metadata.
  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await expect(page.getByText('Frank Herbert · 1965')).toBeVisible({ timeout: 15_000 })

  // The file exists on disk under library/book/ with media frontmatter.
  const fileText = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const lib = await root.getDirectoryHandle('library')
    const book = await lib.getDirectoryHandle('book')
    const handle = await book.getFileHandle('dune.md')
    return (await handle.getFile()).text()
  })
  expect(fileText).toContain('mediaType: book')
  expect(fileText).toContain('creator: Frank Herbert')
})
