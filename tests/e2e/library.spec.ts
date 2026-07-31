import { test, expect } from '@playwright/test'

// Log library items (with a consumed date) through the UI and confirm the typed projection,
// the file on disk, the logged timestamp, and chronological sorting.
test('log library items with dates and sort them chronologically', async ({ page }) => {
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

  const logBook = async (title: string, consumed: string): Promise<void> => {
    await page.getByRole('button', { name: '+ Log' }).click()
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Date consumed').fill(consumed)
    await page.getByRole('button', { name: 'Log', exact: true }).click()
    // Stays on the Library — the new entry appears in the list right away (no navigation).
    await expect(page.locator('.doc__title').filter({ hasText: title })).toBeVisible({
      timeout: 15_000,
    })
  }

  await logBook('Dune', '2026-05-01')
  await logBook('Nemesis', '2026-06-01')

  // The consumed date surfaces in the list.
  await expect(page.getByText(/Consumed .*2026/).first()).toBeVisible({ timeout: 15_000 })

  // Default sort is by consumed date, newest first → Nemesis (June) before Dune (May).
  await expect(page.locator('.doc__title').first()).toHaveText('Nemesis')

  // Flip to oldest first → Dune (May) leads.
  await page.getByLabel('Order').selectOption('asc')
  await expect(page.locator('.doc__title').first()).toHaveText('Dune')

  // The file on disk carries both the user's consumed date and the app-stamped logged time.
  const fileText = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const lib = await root.getDirectoryHandle('library')
    const book = await lib.getDirectoryHandle('book')
    const handle = await book.getFileHandle('dune.md')
    return (await handle.getFile()).text()
  })
  expect(fileText).toContain('mediaType: book')
  expect(fileText).toContain('consumedOn:')
  expect(fileText).toContain('2026-05-01')
  expect(fileText).toContain('logged:')
})

test('a library entry can be written inline and is saved with the item', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    await root.removeEntry('library', { recursive: true }).catch(() => undefined)
  })
  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })
  await page.getByRole('link', { name: 'Library', exact: true }).click()

  await page.getByRole('button', { name: '+ Log' }).click()
  await page.getByLabel('Title').fill('Deep Work')
  await page.getByLabel('Entry notes').fill('Cal Newport on focus — worth revisiting.')
  await page.getByRole('button', { name: 'Log', exact: true }).click()

  // The entry appears in the Library without leaving the page.
  await expect(page.locator('.doc__title').filter({ hasText: 'Deep Work' })).toBeVisible({
    timeout: 15_000,
  })

  // The written notes are saved as the document body.
  const fileText = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const book = await (await root.getDirectoryHandle('library')).getDirectoryHandle('book')
    return (await (await book.getFileHandle('deep-work.md')).getFile()).text()
  })
  expect(fileText).toContain('Cal Newport on focus — worth revisiting.')

  // Opening the entry shows those notes in the editor.
  await page.locator('.doc').filter({ hasText: 'Deep Work' }).click()
  await expect(page.locator('.prose-editor')).toContainText('Cal Newport on focus')
})
