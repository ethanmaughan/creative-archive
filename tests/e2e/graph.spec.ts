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

test('the graph shows documents and their wikilink edges', async ({ page }) => {
  await openArchive(page)
  const editor = page.locator('.prose-editor .ProseMirror')

  await newNote(page, 'Node B')
  await newNote(page, 'Node A')
  await editor.click()
  await editor.pressSequentially('links to [[Node B]]')
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  await page.getByRole('link', { name: 'Graph', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Graph' })).toBeVisible()
  // Two documents, one (deduped) wikilink edge — proves the graph data resolved.
  await expect(page.locator('.page-sub').first()).toContainText('2 documents')
  await expect(page.locator('.page-sub').first()).toContainText('1 link')
  await expect(page.locator('.graph-canvas-wrap canvas')).toBeVisible()
})
