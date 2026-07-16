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

// The navbar is state-driven, not page-driven: solid navy (light text) at the
// top of EVERY page, solid white (dark text) once scrolled. The old per-page
// .navbar--solid variant caused a whole class of dark-on-dark bugs (invisible
// logo/links, and a phone number that was still dark-on-navy when it was
// visible) — deleting the variant deletes the bug class.
const allPages = ['/', '/ueber-uns/', '/leistungen/', '/galerie/', '/kontakt/'];

function lightness01(rgb) {
  const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number);
  // color() syntax reports 0-1, rgb() reports 0-255 — normalise.
  const max = Math.max(r, g, b) <= 1 ? 1 : 255;
  return (r + g + b) / 3 / max;
}

for (const path of allPages) {
  test(`navbar on ${path} is light-on-navy at top, dark-on-white when scrolled`, async ({ page, viewport }) => {
    // Below the drawer breakpoint .nav-link is forced white for the navy
    // drawer panel, so the scrolled dark-text half only holds on desktop.
    test.skip(!viewport || viewport.width < 1280, 'drawer styles own the link colors on mobile');

    await page.goto(path);
    const navbar = page.locator('.navbar');
    await expect(navbar).not.toHaveClass(/is-scrolled/);
    for (const sel of ['.navbar .logo', '.navbar .nav-link']) {
      const rgb = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).color);
      expect(lightness01(rgb), `${sel} on ${path} is ${rgb} — too dark for the navy bar`)
        .toBeGreaterThan(0.6);
    }

    await page.evaluate(() => window.scrollTo(0, 300));
    await expect(navbar).toHaveClass(/is-scrolled/);
    for (const sel of ['.navbar .logo', '.navbar .nav-link']) {
      const rgb = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).color);
      expect(lightness01(rgb), `${sel} on ${path} is ${rgb} — too light for the white bar`)
        .toBeLessThan(0.4);
    }
  });
}
