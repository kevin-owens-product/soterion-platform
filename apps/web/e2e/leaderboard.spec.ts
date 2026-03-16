import { test, expect } from '@playwright/test';

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@soterion.io');
    await page.fill('input[type="password"]', 'soterion123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*ops/, { timeout: 10000 });
  });

  test('should display operator leaderboard', async ({ page }) => {
    await page.click('text=Leaderboard');
    await expect(page).toHaveURL(/.*leaderboard/);

    // Should show leaderboard heading
    await expect(page.locator('text=OPERATOR LEADERBOARD')).toBeVisible({ timeout: 10000 });

    // Should show at least one operator entry
    await expect(page.locator('text=Amara')).toBeVisible({ timeout: 10000 });
  });

  test('should highlight current user', async ({ page }) => {
    await page.click('text=Leaderboard');

    // Admin User should be highlighted with "YOU" label
    await expect(page.locator('text=YOU')).toBeVisible({ timeout: 10000 });
  });
});
