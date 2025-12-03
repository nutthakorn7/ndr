import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('New Features Verification', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Navigation tabs work correctly', async ({ page }) => {
    // Wait for sidebar to be visible
    await expect(page.locator('.falcon-sidebar')).toBeVisible();

    // Verify Incidents Tab
    await page.getByTitle('Incidents').click();
    await expect(page).toHaveURL(/tab=incidents/);
    await expect(page.getByText('Incident Response Board')).toBeVisible();

    // Verify Automation Tab
    await page.getByTitle('Automation (SOAR)').click();
    await expect(page).toHaveURL(/tab=automation/);
    await expect(page.getByText('Playbooks & Automation')).toBeVisible();

    // Verify Edge Management Tab
    await page.getByTitle('Edge Management').click();
    await expect(page).toHaveURL(/tab=edge/);
    await expect(page.getByText('Edge Agent Management')).toBeVisible();
  });

  test('Event Ticker is visible', async ({ page }) => {
    const ticker = page.locator('.event-ticker');
    await expect(ticker).toBeVisible();
    await expect(ticker).toContainText('LIVE THREAT FEED');
    
    // Verify it has content (might take a moment to load mock data)
    await expect(ticker.locator('.ticker-item').first()).toBeVisible({ timeout: 10000 });
  });

  test('Deep Analysis tools are accessible from Alerts', async ({ page }) => {
    // Go to Alerts tab
    await page.getByTitle('Detections').click();
    
    // Wait for table to load
    await expect(page.getByRole('table')).toBeVisible();

    // Click on the first data row (skip header)
    const firstAlertRow = page.locator('tbody tr').first();
    await expect(firstAlertRow).toBeVisible();
    await firstAlertRow.click();

    // Verify Details Pane Open
    await expect(page.getByText('Detection Details')).toBeVisible();

    // Verify Deep Analysis Section
    await expect(page.getByText('Deep Analysis')).toBeVisible();

    // Scroll details pane to bottom to ensure buttons are visible
    const detailsPane = page.locator('.overflow-y-auto');
    await detailsPane.evaluate(e => e.scrollTop = e.scrollHeight);

    // Test File Analysis Modal
    await page.locator('.deep-analysis-section button').filter({ hasText: 'File Analysis' }).click();
    // The new modal is rendered at root level, check for its header
    await expect(page.getByRole('heading', { name: 'File Analysis' })).toBeVisible();
    
    // Close File Analysis
    // The close button is in the modal header
    await page.locator('.fixed .p-2').click();
    await expect(page.getByRole('heading', { name: 'File Analysis' })).not.toBeVisible();

    // Test DNS Intelligence Modal
    await page.getByRole('button', { name: 'DNS Intel' }).click();
    await expect(page.getByRole('heading', { name: 'DNS Intelligence' })).toBeVisible();
  });
});
