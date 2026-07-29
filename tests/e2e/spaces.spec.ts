import { test, expect } from '@playwright/test'

// Create multiple spaces, author documents inside them, and confirm search scopes to one space.
test('create spaces, author inside them, and scope search', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['spaces', 'library', 'notebook', 'story-bible', 'research']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })

  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  const createSpace = async (name: string, type: string): Promise<void> => {
    await page.getByRole('link', { name: 'Spaces', exact: true }).click()
    await page.getByRole('button', { name: '+ New space' }).click()
    await page.getByLabel('Space name').fill(name)
    await page.getByLabel('Space type').selectOption(type)
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 15_000 })
  }

  const addDocInCurrentSpace = async (title: string): Promise<void> => {
    await page.getByRole('button', { name: '+ New' }).click()
    await page.getByLabel('New document title').fill(title)
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 })
  }

  // A writing space with a manuscript chapter.
  await createSpace('My Novel', 'writing')
  await addDocInCurrentSpace('Gryphon Chapter')

  // The chapter lands in the manuscript subfolder with a numeric ordering prefix.
  const chapterExists = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const spaces = await root.getDirectoryHandle('spaces')
    const novel = await spaces.getDirectoryHandle('my-novel')
    const manuscript = await novel.getDirectoryHandle('manuscript')
    try {
      await manuscript.getFileHandle('010-gryphon-chapter.md')
      return true
    } catch {
      return false
    }
  })
  expect(chapterExists).toBe(true)

  // Back in the space, the chapter is listed under Documents.
  await page.getByRole('link', { name: 'Spaces', exact: true }).click()
  await page.getByRole('link', { name: /My Novel/ }).click()
  await expect(page.getByText('Gryphon Chapter')).toBeVisible({ timeout: 15_000 })

  // A second, general space with its own note (shares the search term "gryphon").
  await createSpace('Field Notes', 'general')
  await addDocInCurrentSpace('Gryphon Essay')

  // Unscoped search finds both; scoping to My Novel narrows to just its chapter.
  await page.getByRole('link', { name: 'Search', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search' }).fill('gryphon')
  await expect(page.locator('.result')).toHaveCount(2, { timeout: 15_000 })

  await page.getByLabel('Search scope').selectOption('my-novel')
  await expect(page.locator('.result')).toHaveCount(1)
  await expect(page.locator('.result')).toContainText('Gryphon Chapter')
})
