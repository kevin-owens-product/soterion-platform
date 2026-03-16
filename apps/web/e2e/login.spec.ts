import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=SOTERION')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@soterion.io');
    await page.fill('input[type="password"]', 'soterion123');
    await page.click('button[type="submit"]');

    // Should redirect to ops center
    await expect(page).toHaveURL(/.*ops/, { timeout: 10000 });
    // Should show operator name in header
    await expect(page.locator('text=Admin User')).toBeVisible({ timeout: 10000 });
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Should stay on login page
    await expect(page).toHaveURL(/.*login/);
  });
});
