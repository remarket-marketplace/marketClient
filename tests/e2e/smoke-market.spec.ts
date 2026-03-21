import { expect, test } from "@playwright/test";

test("T-015 smoke: home page opens and shows navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);

  await expect(page.getByRole("link", { name: /главная|home/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /чаты|chats/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /профиль|profile/i })).toBeVisible();
});

test("T-022 smoke: home page shows locale and currency controls", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);

  await expect(page.getByRole("button", { name: /rub|₽/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /ru|рус|language|locale/i })).toBeVisible();
});

test("T-023 smoke mobile: header controls stay visible on narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);

  await expect(page.getByRole("button", { name: /ru|рус|language|locale/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /rub|₽/i })).toBeVisible();
});
