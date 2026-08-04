import { test, expect } from '@playwright/test'

// Link a topic that has no note yet, land on its topic page (references + context), then promote
// it into a real note — Logseq's "every [[bracket]] is a page".
test('an un-filed [[topic]] gets a topic page with contextual references, then becomes a note', async ({
  page,
}) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['notebook', 'research', 'story-bible', 'spaces', 'library']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })

  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  // Create a source note and link a topic that doesn't exist yet.
  await page.getByRole('link', { name: 'Studio', exact: true }).click()
  await page.getByRole('button', { name: '+ New' }).click()
  await page.getByLabel('New document title').fill('Ideas Journal')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ideas Journal' })).toBeVisible({
    timeout: 15_000,
  })

  const editor = page.locator('.prose-editor .ProseMirror')
  await editor.click()
  await editor.pressSequentially('Exploring [[Determinism]] as a theme.')
  await expect(page.locator('.save-status')).toHaveText('Saved', { timeout: 15_000 })

  // Clicking the un-filed link lands on its topic page.
  await page.locator('.wikilink').first().click()
  await expect(page.getByRole('heading', { name: 'Determinism' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/No note defines this topic yet/)).toBeVisible()

  // The source note appears as a reference, with the line where the link lives as context.
  const reference = page.locator('.ref').filter({ hasText: 'Ideas Journal' })
  await expect(reference).toBeVisible({ timeout: 15_000 })
  await expect(reference.locator('.ref__ctx')).toContainText('Exploring')

  // Promote the topic into a real note.
  await page.getByRole('button', { name: /Create this note/ }).click()
  await expect(page.getByRole('heading', { name: 'Determinism' })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.doc-head__path')).toContainText('notebook/determinism.md')

  // The note now exists on disk with the topic title.
  const fileText = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const nb = await root.getDirectoryHandle('notebook')
    const fh = await nb.getFileHandle('determinism.md')
    return (await fh.getFile()).text()
  })
  expect(fileText).toContain('title: Determinism')

  // The now-filed note shows the source under its own Linked references.
  await expect(page.getByText(/Linked references/)).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.ref__src').filter({ hasText: 'Ideas Journal' })).toBeVisible({
    timeout: 15_000,
  })
})
