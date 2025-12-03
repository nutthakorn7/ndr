import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Auth is disabled in the current App.tsx, so we just visit the dashboard
  await page.goto('/');
  
  // Wait for dashboard to load
  await expect(page.getByText(/FALCON CONSOLE/i)).toBeVisible();

  // Save storage state
  await page.context().storageState({ path: authFile });
});
