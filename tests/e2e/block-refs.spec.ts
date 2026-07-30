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

test('a block reference jumps to and flashes the target block', async ({ page }) => {
  await openArchive(page)

  await newNote(page, 'Note B')
  const editor = page.locator('.prose-editor .ProseMirror')
  await editor.click()
  await editor.pressSequentially('The guarded pass here. ^k9')
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  await newNote(page, 'Note A')
  await editor.click()
  await editor.pressSequentially('Jump to [[Note B#^k9]] now.')
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  // The block reference persists literally and, when clicked, opens Note B and flashes the block.
  const fileText = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const nb = await root.getDirectoryHandle('notebook')
    return (await (await nb.getFileHandle('note-a.md')).getFile()).text()
  })
  expect(fileText).toContain('[[Note B#^k9]]')

  await page.locator('.wikilink').first().click()
  await expect(page.getByRole('heading', { name: 'Note B' })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.is-anchor-flash')).toContainText('guarded pass', { timeout: 5_000 })
})

test('the block-reference button stamps an ^id on the current block', async ({ page }) => {
  await openArchive(page)
  await newNote(page, 'Anchor Note')

  const editor = page.locator('.prose-editor .ProseMirror')
  await editor.click()
  await editor.pressSequentially('A plain block.')
  await page.getByRole('button', { name: 'Copy block reference' }).click()

  await expect(editor).toContainText(/\^[a-z0-9]{6}/, { timeout: 5_000 })
})
