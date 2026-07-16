import { test, expect } from '@playwright/test'

// Search shows highlighted body snippets and the kind filter narrows results.
test('search shows snippets and filters by kind', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['research', 'story-bible', 'notebook', 'library']) {
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
    await write('research/melange.md', '# Notes\nThe spice melange flows through Arrakis.\n')
    await write(
      'story-bible/characters/paul.md',
      '---\ntitle: Paul\n---\nHe controls the spice trade.\n',
    )
  })

  await expect(page.getByRole('heading', { name: 'Open your archive' })).toBeVisible()
  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  await page.getByRole('link', { name: 'Search', exact: true }).click()
  await page.getByLabel('Search').fill('spice')

  // Both docs match, and the snippet highlights the term.
  await expect(page.getByText('research/melange.md')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('story-bible/characters/paul.md')).toBeVisible()
  await expect(page.locator('.result__snippet mark').first()).toBeVisible()

  // Filter to Research → only the note remains.
  await page.getByLabel('Filter by kind').selectOption('research')
  await expect(page.getByText('research/melange.md')).toBeVisible()
  await expect(page.getByText('story-bible/characters/paul.md')).toHaveCount(0)

  // Filter to Character → only Paul remains.
  await page.getByLabel('Filter by kind').selectOption('character')
  await expect(page.getByText('story-bible/characters/paul.md')).toBeVisible()
  await expect(page.getByText('research/melange.md')).toHaveCount(0)
})
