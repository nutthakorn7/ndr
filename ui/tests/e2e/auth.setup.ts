import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Perform login steps
  await page.goto('/login');
  await page.getByPlaceholder('admin@ndr.local').fill('admin@example.com');
  await page.getByPlaceholder('Password').fill('admin');
  await page.getByRole('button', { name: 'Sign In' }).click();
  
  // Wait for dashboard to load
  await expect(page.getByText('Security Overview')).toBeVisible();

  // Save storage state
  await page.context().storageState({ path: authFile });
});
