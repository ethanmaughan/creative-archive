import { test, expect } from '@playwright/test'

// The editor autosaves (no manual Save) and the toolbar applies Markdown formatting.
test('editor autosaves and the toolbar formats text', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['notebook', 'story-bible', 'library', 'projects', 'research']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })

  await expect(page.getByRole('heading', { name: 'Open your archive' })).toBeVisible()
  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  // Create a note and land in the editor.
  await page.getByRole('button', { name: '+ New' }).click()
  await page.getByLabel('New document title').fill('Autosave Test')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Autosave Test' })).toBeVisible({
    timeout: 15_000,
  })

  // Toggle bold via the toolbar, then type — and DON'T click Save.
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Bold' }).click()
  await editor.pressSequentially('bold words')

  // Autosave flips the status to "Saved".
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  // The file on disk has the Markdown bold, written without a manual save.
  const fileText = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('notebook')
    const handle = await dir.getFileHandle('autosave-test.md')
    return (await handle.getFile()).text()
  })
  expect(fileText).toContain('**bold words**')
})
