import { test, expect } from '@playwright/test';

test('homepage loads and shows the brand', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.navbar .logo__name')).toHaveText('BlitzBlank');
});
