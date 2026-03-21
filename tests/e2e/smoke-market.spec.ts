import { expect, test } from "@playwright/test";

test("T-015 smoke: home page opens and shows navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);

  await expect(page.getByRole("link", { name: /главная|home/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /чаты|chats/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /профиль|profile/i })).toBeVisible();
});
