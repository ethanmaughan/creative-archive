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

test('[[ suggests documents and # suggests existing tags', async ({ page }) => {
  await openArchive(page)
  const editor = page.locator('.prose-editor .ProseMirror')

  // Seed a note with a tag so #-autocomplete has something to offer.
  await newNote(page, 'Tagged')
  await editor.click()
  await editor.pressSequentially('#fantasy lore')
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  await newNote(page, 'Writer')
  await editor.click()

  // `[[` → pick the document from the dropdown.
  await editor.pressSequentially('[[Tag')
  await expect(page.locator('.suggestion-item').filter({ hasText: 'Tagged' })).toBeVisible({
    timeout: 10_000,
  })
  await page.keyboard.press('Enter')
  await expect(editor).toContainText('[[Tagged]]')
  await expect(page.locator('.wikilink')).toHaveCount(1)

  // `#` → pick the existing tag from the dropdown.
  await editor.pressSequentially(' and #fan')
  await expect(page.locator('.suggestion-item').filter({ hasText: '#fantasy' })).toBeVisible({
    timeout: 10_000,
  })
  await page.keyboard.press('Enter')
  await expect(editor).toContainText('#fantasy')
})
