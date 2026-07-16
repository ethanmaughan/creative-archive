import { test, expect } from '@playwright/test'

// Drives the real open-archive flow end to end. In e2e mode (?e2e) the app uses OPFS as a
// stand-in for the picked folder, so we can seed files and exercise the worker + reconciler
// + UI without the un-automatable native directory picker.
test('opening an archive indexes documents and search finds them', async ({ page }) => {
  await page.goto('/?e2e=1')

  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['research', 'story-bible']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
    const write = async (path: string, content: string): Promise<void> => {
      const parts = path.split('/')
      const name = parts.pop() as string
      let dir = root
      for (const segment of parts) dir = await dir.getDirectoryHandle(segment, { create: true })
      const fileHandle = await dir.getFileHandle(name, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
    }
    await write('research/spice.md', '# Spice notes\nWorms and sand across the dunes.\n')
    await write(
      'story-bible/characters/mara.md',
      '---\ntitle: Mara Vell\n---\nThe reluctant heir.\n',
    )
  })

  await expect(page.getByRole('heading', { name: 'Open your archive' })).toBeVisible()
  await page.getByRole('button', { name: /open archive folder/i }).click()

  // Wait for the worker to open the index + reconcile (cold-start compiles the worker chunk).
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  // Studio lists the indexed documents.
  await expect(page.getByText('Mara Vell')).toBeVisible({ timeout: 30_000 })

  // Full-text search finds the research note by a word in its body.
  await page.getByRole('link', { name: 'Search', exact: true }).click()
  await page.getByLabel('Search').fill('spice')
  await expect(page.getByText('research/spice.md')).toBeVisible({ timeout: 30_000 })
})
