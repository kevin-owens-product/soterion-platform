import { test, expect } from '@playwright/test';

test.describe('Alert Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@soterion.io');
    await page.fill('input[type="password"]', 'soterion123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*ops/, { timeout: 10000 });
  });

  test('should display threat feed with alerts', async ({ page }) => {
    // Navigate to security view
    await page.click('text=Security');
    await expect(page).toHaveURL(/.*security/);

    // Should show threat feed
    await expect(page.locator('text=Threat Feed')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between views', async ({ page }) => {
    // Check all nav items work
    await page.click('text=Sensors');
    await expect(page).toHaveURL(/.*sensors/);
    await expect(page.locator('text=Sensors')).toBeVisible();

    await page.click('text=Leaderboard');
    await expect(page).toHaveURL(/.*leaderboard/);
    await expect(page.locator('text=Leaderboard')).toBeVisible();

    await page.click('text=Ops Center');
    await expect(page).toHaveURL(/.*ops/);
  });
});
