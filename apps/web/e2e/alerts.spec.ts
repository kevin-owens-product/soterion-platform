import { test, expect } from '@playwright/test';

test.describe('Alerts / Threat Feed', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('dev@soterion.io');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).toHaveURL(/\/ops/, { timeout: 10_000 });
  });

  test('should display the threat feed on the ops center', async ({ page }) => {
    // Assert threat feed section is visible
    await expect(
      page.getByText(/threat feed|live alerts|alerts/i).first(),
    ).toBeVisible();
  });

  test('should acknowledge an alert', async ({ page }) => {
    // Look for an ACK button on an alert card
    const ackButton = page.getByRole('button', { name: /ack|acknowledge/i }).first();

    // Only run if there are alerts to acknowledge
    const ackVisible = await ackButton.isVisible().catch(() => false);
    if (!ackVisible) {
      test.skip();
      return;
    }

    await ackButton.click();

    // Assert alert shows acknowledged state
    await expect(
      page.getByText(/acknowledged|acked/i).first(),
    ).toBeVisible({ timeout: 5_000 });
  });
});
