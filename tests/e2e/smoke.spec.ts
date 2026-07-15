import { test, expect } from '@playwright/test'

test('app shell loads and renders the heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Creative Archive', level: 1 })).toBeVisible()
})
