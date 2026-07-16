import { test, expect } from '@playwright/test'

// Full Studio round-trip in e2e mode (OPFS stands in for the picked folder):
// create → edit in the rich editor → save → assert the Markdown file on disk.
test('create a note, edit it, save, and it persists to disk', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['notebook', 'research', 'story-bible', 'projects']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })

  // Wait for the gate (app hydrated) before clicking, so the handler is wired.
  await expect(page.getByRole('heading', { name: 'Open your archive' })).toBeVisible()
  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  // Create a note.
  await page.getByRole('button', { name: '+ New' }).click()
  await page.getByLabel('New document title').fill('My First Note')
  await page.getByRole('button', { name: 'Create', exact: true }).click()

  // Lands on the document view.
  await expect(page.getByRole('heading', { name: 'My First Note' })).toBeVisible({
    timeout: 15_000,
  })

  // Type in the rich editor and save.
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await editor.pressSequentially('Spice and sand across the dunes.')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible({
    timeout: 15_000,
  })

  // The Markdown file exists on disk with frontmatter id + the edited body.
  const fileText = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('notebook')
    const handle = await dir.getFileHandle('my-first-note.md')
    return (await handle.getFile()).text()
  })
  expect(fileText).toContain('id:')
  expect(fileText).toContain('Spice and sand across the dunes.')

  // And it is searchable by a word in its body.
  await page.getByRole('link', { name: 'Search', exact: true }).click()
  await page.getByLabel('Search').fill('spice')
  await expect(page.getByText('notebook/my-first-note.md')).toBeVisible({ timeout: 15_000 })
})
