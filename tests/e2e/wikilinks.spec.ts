import { test, expect } from '@playwright/test'

// Author a [[wikilink]] between two notes and confirm: it's clickable in the editor, it persists
// to disk, and the target shows a backlink ("Linked references").
test('wikilinks connect notes and surface as backlinks', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['notebook', 'research', 'story-bible', 'spaces', 'library']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })

  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  const newNote = async (title: string): Promise<void> => {
    await page.getByRole('link', { name: 'Studio', exact: true }).click()
    await page.getByRole('button', { name: '+ New' }).click()
    await page.getByLabel('New document title').fill(title)
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 })
  }

  await newNote('Target Note')
  await newNote('Source Note') // lands on the Source Note editor

  // Type a wikilink to the target and let it autosave.
  const editor = page.locator('.prose-editor .ProseMirror')
  await editor.click()
  await editor.pressSequentially('See [[Target Note]] here.')
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  // It persists to disk as literal Markdown.
  const fileText = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const nb = await root.getDirectoryHandle('notebook')
    const fh = await nb.getFileHandle('source-note.md')
    return (await fh.getFile()).text()
  })
  expect(fileText).toContain('[[Target Note]]')

  // The wikilink is clickable in the editor → navigates to the target.
  await page.locator('.wikilink').first().click()
  await expect(page.getByRole('heading', { name: 'Target Note' })).toBeVisible({ timeout: 15_000 })

  // The target shows the backlink, and it navigates back to the source.
  await expect(page.getByText(/Linked references/)).toBeVisible({ timeout: 15_000 })
  await page.locator('.conn').filter({ hasText: 'Source Note' }).click()
  await expect(page.getByRole('heading', { name: 'Source Note' })).toBeVisible({ timeout: 15_000 })
})
