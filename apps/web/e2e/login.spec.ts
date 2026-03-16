import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should navigate to login page, enter credentials, and redirect to ops center', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Verify login form is visible
    await expect(page.getByRole('heading', { name: /login|sign in/i })).toBeVisible();

    // Enter email
    await page.getByLabel(/email/i).fill('dev@soterion.io');

    // Enter password
    await page.getByLabel(/password/i).fill('password123');

    // Submit form
    await page.getByRole('button', { name: /login|sign in/i }).click();

    // Assert redirect to ops center
    await expect(page).toHaveURL(/\/ops/, { timeout: 10_000 });

    // Assert header shows operator name
    await expect(page.getByText(/dev user/i)).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /login|sign in/i }).click();

    // Assert error message is shown
    await expect(page.getByText(/invalid|unauthorized|error/i)).toBeVisible({ timeout: 5_000 });
  });

  test('should not allow access to ops center without authentication', async ({ page }) => {
    await page.goto('/ops');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});
