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

test('an inline query renders matching documents and links to them', async ({ page }) => {
  await openArchive(page)
  const editor = page.locator('.prose-editor .ProseMirror')

  await newNote(page, 'Fantasy Note')
  await editor.click()
  await editor.pressSequentially('#fantasy world building')
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  // A note containing a query for everything tagged #fantasy.
  await newNote(page, 'Index')
  await editor.click()
  await editor.pressSequentially('```query ') // the space triggers the code-block input rule
  await editor.pressSequentially('tag: fantasy')
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  // The query renders its results inline and they link to the matching doc.
  const card = page.locator('.query-card')
  await expect(card).toBeVisible({ timeout: 15_000 })
  await expect(card.getByText('Fantasy Note')).toBeVisible({ timeout: 15_000 })

  // The query stays a literal Markdown code block on disk.
  const fileText = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const nb = await root.getDirectoryHandle('notebook')
    return (await (await nb.getFileHandle('index.md')).getFile()).text()
  })
  expect(fileText).toContain('tag: fantasy')

  await card.getByText('Fantasy Note').click()
  await expect(page.getByRole('heading', { name: 'Fantasy Note' })).toBeVisible({ timeout: 15_000 })
})
