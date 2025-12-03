import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Smoke Tests', () => {
  test('Dashboard loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NDR/);
    await expect(page.getByText('Security Overview')).toBeVisible();
    await expect(page.getByTestId('stats-card-events')).toBeVisible();
  });

  test('Alerts page loads and displays table', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('Sensors page loads', async ({ page }) => {
    await page.goto('/sensors');
    await expect(page.getByRole('heading', { name: 'Sensors' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register Sensor' })).toBeVisible();
  });
});
