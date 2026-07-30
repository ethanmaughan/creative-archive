import { test, expect, type Page } from '@playwright/test'

async function openArchive(page: Page): Promise<void> {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['notebook', 'research', 'story-bible', 'spaces', 'library']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })
  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })
}

async function newNote(page: Page, title: string): Promise<void> {
  await page.getByRole('link', { name: 'Studio', exact: true }).click()
  await page.getByRole('button', { name: '+ New' }).click()
  await page.getByLabel('New document title').fill(title)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 })
}

test('an ![[embed]] renders the target block inline, read-only', async ({ page }) => {
  await openArchive(page)
  const editor = page.locator('.prose-editor .ProseMirror')

  // A note with a referenceable block.
  await newNote(page, 'Lore')
  await editor.click()
  await editor.pressSequentially('Ancient secrets.\nThe key is hidden. ^key')
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  // A note that embeds that block.
  await newNote(page, 'Main')
  await editor.click()
  await editor.pressSequentially('![[Lore#^key]]')
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  // The embed renders the block's content inline (without the ^id marker)...
  const card = page.locator('.embed-card')
  await expect(card).toBeVisible({ timeout: 15_000 })
  await expect(card.locator('.embed-card__body')).toHaveText('The key is hidden.', {
    timeout: 15_000,
  })

  // ...and the source stays literal Markdown on disk.
  const fileText = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const nb = await root.getDirectoryHandle('notebook')
    return (await (await nb.getFileHandle('main.md')).getFile()).text()
  })
  expect(fileText).toContain('![[Lore#^key]]')
})
