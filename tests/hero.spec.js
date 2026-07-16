import { test, expect } from '@playwright/test';

test('the third hero line is actually visible', async ({ page }) => {
  await page.goto('/index.html');
  const line = page.locator('.hero__title .text-gradient');
  await expect(line).toHaveText('obsessive care.');
  await expect(line).toBeVisible();
  await expect(async () => {
    const opacity = await line.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.99);
  }).toPass({ timeout: 5000 });
});

test('hero lines stagger in reading order', async ({ page }) => {
  await page.goto('/index.html');
  const delays = await page.$$eval('.hero__title .hero-line', (els) =>
    els.map((el) => parseFloat(getComputedStyle(el).animationDelay))
  );
  expect(delays).toHaveLength(3);
  expect(delays[0]).toBeLessThan(delays[1]);
  expect(delays[1]).toBeLessThan(delays[2]);
});

test('hero gradient text uses the on-dark ramp, not blue-on-blue', async ({ page }) => {
  await page.goto('/index.html');
  const bg = await page.locator('.hero__title .text-gradient')
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).toContain('255, 255, 255');
  expect(bg).not.toContain('37, 99, 235');
});
