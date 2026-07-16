import { test, expect } from '@playwright/test'

// A library item's body sections surface in the cross-library Extraction browser,
// and the facet filter narrows them.
test('creative extraction facets gather across the library', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['library', 'notebook', 'story-bible']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
    const write = async (path: string, content: string): Promise<void> => {
      const parts = path.split('/')
      const name = parts.pop() as string
      let dir = root
      for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true })
      const handle = await dir.getFileHandle(name, { create: true })
      const w = await handle.createWritable()
      await w.write(content)
      await w.close()
    }
    await write(
      'library/book/dune.md',
      '---\nid: b1\ntitle: Dune\nmediaType: book\n---\n## Techniques\nUnreliable narrator device.\n## Themes\nEcology and power.\n',
    )
  })

  await expect(page.getByRole('heading', { name: 'Open your archive' })).toBeVisible()
  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await page.getByRole('button', { name: 'Extraction', exact: true }).click()

  await expect(page.getByText('Unreliable narrator device.')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Ecology and power.')).toBeVisible()

  // Filtering to Techniques hides the theme facet.
  await page.getByRole('button', { name: 'Techniques', exact: true }).click()
  await expect(page.getByText('Unreliable narrator device.')).toBeVisible()
  await expect(page.getByText('Ecology and power.')).toHaveCount(0)
})
