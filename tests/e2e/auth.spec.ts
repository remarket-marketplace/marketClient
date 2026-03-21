import { test, expect } from '@playwright/test'

test('auth placeholder', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/.*/)
})
