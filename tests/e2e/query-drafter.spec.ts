import { test, expect } from '@playwright/test'

// Create a reusable template, merge it with an agent into a draft query letter, and confirm the
// template persists to templates.csv.
test('draft a query letter from a template + agent', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['notebook', 'research', 'story-bible', 'spaces', 'library', 'query-tracker']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })

  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  await page.getByRole('link', { name: 'Query Tracker', exact: true }).click()
  await page.getByLabel('New manuscript name').fill('Book One')
  await page.getByRole('button', { name: '+ Manuscript' }).click()
  await expect(page.getByRole('button', { name: '+ Agent' })).toBeVisible({ timeout: 15_000 })

  // An agent to address.
  await page.getByRole('button', { name: '+ Agent' }).click()
  await page.getByLabel('Name', { exact: true }).fill('Chris Lotts')
  await page.getByLabel('Agency', { exact: true }).fill('The Lotts Agency')
  await page.getByRole('button', { name: 'Save agent' }).click()
  await expect(page.locator('.agent').filter({ hasText: 'Chris Lotts' })).toBeVisible()

  // Draft view → create a template.
  await page.getByRole('button', { name: 'Draft', exact: true }).click()
  await page.getByRole('button', { name: 'Manage templates' }).click()
  await page.getByRole('button', { name: '+ Template' }).click()
  await page.getByLabel('Template name', { exact: true }).fill('Standard horror')
  await page.getByLabel('Logline', { exact: true }).fill('A taxidermist discovers her dead husband is talking back.')
  await page.getByLabel('Comp titles (; separated)').fill('Mexican Gothic; The Only Good Indians')
  await page.getByRole('button', { name: 'Save template' }).click()

  // Select the template + agent and generate the draft.
  await page.getByLabel('Template', { exact: true }).selectOption('Standard horror')
  await page.getByLabel('Agent', { exact: true }).selectOption('Chris Lotts')
  await page.getByRole('button', { name: 'Generate draft', exact: true }).click()

  const draft = page.getByLabel('Query draft')
  await expect(draft).toHaveValue(/Dear Chris Lotts,/)
  await expect(draft).toHaveValue(/taxidermist discovers her dead husband/)
  await expect(draft).toHaveValue(/Comparable titles: Mexican Gothic, The Only Good Indians/)

  // The template persisted to the shared templates.csv.
  const csv = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle('query-tracker')
    const fh = await dir.getFileHandle('templates.csv')
    return (await fh.getFile()).text()
  })
  expect(csv).toContain('Standard horror')
  expect(csv).toContain('Mexican Gothic;The Only Good Indians')
})
