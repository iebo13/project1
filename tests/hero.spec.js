import { test, expect } from '@playwright/test';

test('the third hero line is actually visible', async ({ page }) => {
  await page.goto('/');
  const line = page.locator('.hero__title .text-gradient');
  await expect(line).toHaveText('liebevoller Sorgfalt.'); // root is German
  await expect(line).toBeVisible();
  await expect(async () => {
    const opacity = await line.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.99);
  }).toPass({ timeout: 5000 });
});

test('hero lines stagger in reading order', async ({ page }) => {
  await page.goto('/');
  const delays = await page.$$eval('.hero__title .hero-line', (els) =>
    els.map((el) => parseFloat(getComputedStyle(el).animationDelay))
  );
  expect(delays).toHaveLength(3);
  expect(delays[0]).toBeLessThan(delays[1]);
  expect(delays[1]).toBeLessThan(delays[2]);
});

test('hero gradient text uses the on-dark ramp, not blue-on-blue', async ({ page }) => {
  await page.goto('/');
  const bg = await page.locator('.hero__title .text-gradient')
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).toContain('255, 255, 255');
  expect(bg).not.toContain('37, 99, 235');
});

test('hero copy never sits on the photo (desktop split)', async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width < 1280, 'the split is a desktop layout');
  await page.goto('/');
  // The solid navy panel covers the left 46% and stays ≥82% tint to 58%;
  // holding every headline line inside 60% of the viewport guarantees
  // contrast regardless of which photo Unsplash serves. Measure the inline
  // .hero-line spans, not the h1 — a block box spans the full column width
  // whether or not there are glyphs in it.
  const edges = await page.$$eval('.hero__title .hero-line', (els) =>
    els.map((el) => el.getBoundingClientRect().right)
  );
  expect(Math.max(...edges)).toBeLessThanOrEqual(viewport.width * 0.6);
});

test('hero stats are individual glass chips', async ({ page }) => {
  await page.goto('/');
  const stats = page.locator('.hero__stat');
  await expect(stats).toHaveCount(3);
  expect(await stats.first().getAttribute('class')).toContain('glass-strong');
});
