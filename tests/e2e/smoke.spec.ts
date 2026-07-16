import { test, expect } from '@playwright/test'

test('app shell loads with the open-archive gate', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Open your archive' })).toBeVisible()
  await expect(page.getByRole('button', { name: /open archive folder/i })).toBeVisible()
})
