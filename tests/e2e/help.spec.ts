import { test, expect } from '@playwright/test'

// The help page is static docs and should be readable before any archive is opened.
test('the help page is readable without opening an archive', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Help', exact: true }).click()

  await expect(page.getByRole('heading', { name: /Help/ })).toBeVisible()
  // Shows the linking syntax, not the "open your archive" gate.
  await expect(page.getByText('[[Note Title]]')).toBeVisible()
  await expect(page.getByText('![[Note]]', { exact: true })).toBeVisible()
  await expect(page.getByText('#tag', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Open your archive' })).toHaveCount(0)
})
