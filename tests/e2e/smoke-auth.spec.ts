import { expect, test } from "@playwright/test";

test("T-001 smoke: login page opens and shows auth controls", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);

  await expect(page.getByRole("button", { name: /войти|login/i })).toBeVisible();
});

test("T-002 smoke: register page opens", async ({ page }) => {
  await page.goto("/register");
  await expect(page).toHaveURL(/\/register/);

  await expect(page.getByRole("button", { name: /получить код|get code/i })).toBeVisible();
});
