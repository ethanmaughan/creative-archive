import { test, expect } from '@playwright/test'

// Author a connection from one document's page, then see it in the graph browser.
test('link two documents and browse the connection', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['story-bible', 'notebook', 'library', 'projects']) {
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
    await write('story-bible/characters/mara.md', '---\nid: mara\ntitle: Mara Vell\n---\nHero.\n')
    await write('notebook/idea.md', '---\nid: idea\ntitle: Big Idea\n---\nA thought.\n')
  })

  await expect(page.getByRole('heading', { name: 'Open your archive' })).toBeVisible()
  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  // Open Mara's page and connect her to the idea.
  await page.getByRole('link', { name: /Mara Vell/ }).click()
  await expect(page.getByRole('heading', { name: 'Mara Vell' })).toBeVisible({ timeout: 15_000 })
  await page.getByLabel('Relationship').selectOption('appears-in')
  await page.getByLabel('Connect to').selectOption({ label: 'Big Idea' })
  await page.getByRole('button', { name: 'Connect', exact: true }).click()

  // The edge shows in the document's own panel.
  await expect(page.getByRole('link', { name: 'Big Idea' })).toBeVisible({ timeout: 15_000 })

  // And in the global Connections browser.
  await page.getByRole('link', { name: 'Connections', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Mara Vell' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/appears-in/)).toBeVisible()
})
