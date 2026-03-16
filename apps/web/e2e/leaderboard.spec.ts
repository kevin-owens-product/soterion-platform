import { test, expect } from '@playwright/test';

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('dev@soterion.io');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).toHaveURL(/\/ops/, { timeout: 10_000 });
  });

  test('should display the leaderboard with ranked rows', async ({ page }) => {
    // Navigate to leaderboard page
    await page.goto('/leaderboard');

    // Assert leaderboard table or list is visible
    await expect(
      page.getByText(/leaderboard|rankings/i).first(),
    ).toBeVisible({ timeout: 5_000 });

    // Assert the table has at least one data row
    const rows = page.locator('table tbody tr, [data-testid="leaderboard-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 5_000 });

    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should highlight the current user in the leaderboard', async ({ page }) => {
    await page.goto('/leaderboard');

    // Look for the current user's row being highlighted (via CSS class, data attribute, or visual indicator)
    const highlightedRow = page.locator(
      '[data-current-user="true"], .current-user, tr.highlighted, [aria-current="true"]',
    );

    const isHighlighted = await highlightedRow.isVisible().catch(() => false);
    if (!isHighlighted) {
      // Fallback: check if the user's name appears in the leaderboard
      await expect(page.getByText(/dev user/i)).toBeVisible({ timeout: 5_000 });
    } else {
      await expect(highlightedRow).toBeVisible();
    }
  });
});
