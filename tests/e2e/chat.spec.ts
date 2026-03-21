import { test, expect } from '@playwright/test'

test('chat placeholder', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/.*/)
})
