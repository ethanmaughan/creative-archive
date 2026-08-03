import { test, expect } from '@playwright/test'

// Add an inline #tag to a note and confirm it persists, shows on the document, is clickable in
// the editor, and gathers on the Tags page.
test('inline #tags gather and filter documents', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['notebook', 'research', 'story-bible', 'spaces', 'library']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })

  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  // Create a note and give it an inline tag.
  await page.getByRole('button', { name: '+ New' }).click()
  await page.getByLabel('New document title').fill('Tagged Note')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tagged Note' })).toBeVisible({ timeout: 15_000 })

  const editor = page.locator('.prose-editor .ProseMirror')
  await editor.click()
  await editor.pressSequentially('Loves #fantasy stories.')
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  // Persists to disk as a literal #tag.
  const fileText = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const nb = await root.getDirectoryHandle('notebook')
    const fh = await nb.getFileHandle('tagged-note.md')
    return (await fh.getFile()).text()
  })
  expect(fileText).toContain('#fantasy')

  // The tag shows on the document, and clicking the #tag in the editor filters the Tags page.
  await expect(page.locator('.doc-tags')).toContainText('#fantasy')
  await page.locator('.hashtag').first().click()
  await expect(page.getByRole('heading', { name: 'Tags' })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.tag-chip.is-active')).toContainText('fantasy')
  await expect(page.getByRole('link', { name: /Tagged Note/ })).toBeVisible({ timeout: 15_000 })

  // The tag search filters the cloud live — no match hides everything, a prefix brings it back.
  const search = page.getByRole('searchbox', { name: 'Search tags' })
  await search.fill('zzz')
  await expect(page.getByText(/No tags match/)).toBeVisible()
  await expect(page.locator('.tag-chip')).toHaveCount(0)
  await search.fill('fan')
  await expect(page.locator('.tag-chip').filter({ hasText: 'fantasy' })).toBeVisible()
})
