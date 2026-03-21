import { test, expect } from '@playwright/test'

test('smoke buy flow placeholder', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/.*/)
})
