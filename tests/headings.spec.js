import { test, expect } from '@playwright/test';

function luminance(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map(Number).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Composites `fg` over `bg` per-channel (result = fg*alpha + bg*(1-alpha))
// when `fg` carries an alpha < 1, e.g. rgba(255,255,255,0.86). Without this,
// a translucent foreground is scored as if it were fully opaque, inflating
// its computed contrast against the background it's actually painted on.
function composite(fg, bg) {
  const fgParts = fg.match(/[\d.]+/g).map(Number);
  const alpha = fgParts.length > 3 ? fgParts[3] : 1;
  if (alpha >= 1) return fg;
  const bgParts = bg.match(/[\d.]+/g).map(Number);
  const [r, g, b] = fgParts.slice(0, 3).map((c, i) => Math.round(c * alpha + bgParts[i] * (1 - alpha)));
  return `rgb(${r}, ${g}, ${b})`;
}

function contrast(fg, bg) {
  const [a, b] = [luminance(composite(fg, bg)), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const darkHeroPages = ['/ueber-uns/', '/leistungen/', '/galerie/', '/kontakt/'];

for (const path of darkHeroPages) {
  test(`h1 on ${path} is readable against the dark hero`, async ({ page }) => {
    await page.goto(path);
    const h1 = page.locator('.page-hero h1');
    const fg = await h1.evaluate((el) => getComputedStyle(el).color);
    const bg = await page.locator('.page-hero').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
}

test('CTA banner h2 is readable against its dark background', async ({ page }) => {
  await page.goto('/');
  const fg = await page.locator('.promo-banner h2').evaluate((el) => getComputedStyle(el).color);
  const bg = await page.locator('.promo-banner').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
});

test('no inline colour workaround remains on the about section title', async ({ page }) => {
  await page.goto('/ueber-uns/');
  const count = await page.locator('.section--dark .section-title[style*="color"]').count();
  expect(count).toBe(0);
});
