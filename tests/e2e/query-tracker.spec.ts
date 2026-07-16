import { test, expect } from '@playwright/test'

// Add a market, submit a manuscript to it, and move it through the status state machine.
test('track a submission through the query tracker', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const dir of ['notebook', 'library', 'story-bible', 'projects', 'research']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }
  })

  await expect(page.getByRole('heading', { name: 'Open your archive' })).toBeVisible()
  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 60_000 })

  await page.getByRole('link', { name: 'Query Tracker', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Query Tracker' })).toBeVisible()

  // Add a market.
  await page.getByLabel('Market name').fill('Tor Books')
  await page.getByRole('button', { name: 'Add market' }).click()
  await expect(page.locator('.qt-markets')).toContainText('Tor Books')

  // Submit a manuscript to it.
  await page.getByLabel('Submission title').fill('The Glass House')
  await page.getByLabel('Market', { exact: true }).selectOption({ label: 'Tor Books' })
  await page.getByRole('button', { name: 'Add submission' }).click()

  await expect(page.getByText('The Glass House')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Draft', { exact: true })).toBeVisible()

  // Move it to Submitted via the state machine.
  await page.getByLabel('Move The Glass House').selectOption('submitted')
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible({ timeout: 15_000 })
})
