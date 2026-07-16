import { test, expect } from '@playwright/test'

// With no Ollama running, AI features show a connect prompt and the rest of the app is
// unaffected. (The happy path — real generation — is covered by unit tests with a fake client.)
test('AI degrades gracefully when Ollama is not running', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['notebook', 'story-bible', 'library', 'projects', 'research']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
    const parts = 'notebook/idea.md'.split('/')
    const name = parts.pop() as string
    let dir = root
    for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true })
    const handle = await dir.getFileHandle(name, { create: true })
    const w = await handle.createWritable()
    await w.write('---\ntitle: Big Idea\n---\nA thought.\n')
    await w.close()
  })

  await expect(page.getByRole('heading', { name: 'Open your archive' })).toBeVisible()
  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  await page.getByRole('link', { name: /Big Idea/ }).click()
  await expect(page.getByRole('heading', { name: 'Big Idea' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'AI' })).toBeVisible()
  await expect(page.getByText(/Local AI isn.t reachable/i)).toBeVisible({ timeout: 20_000 })
})
