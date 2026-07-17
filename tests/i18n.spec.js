import { test, expect } from '@playwright/test';

// Guards the failure this migration exists to fix: the old runtime switcher
// only ever translated the navbar and footer, so five of six pages showed
// English body copy with a German nav. It failed silently — nothing told you.
//
// These tests scan the German pages for English strings that appeared in the
// old markup, so a regression fails the build instead of shipping.

const DE_PAGES = ['/', '/ueber-uns/', '/leistungen/', '/galerie/', '/kontakt/', '/impressum/', '/datenschutz/'];
const EN_PAGES = ['/en/', '/en/about/', '/en/services/', '/en/gallery/', '/en/contact/', '/en/imprint/', '/en/privacy/'];

// Strings that were hardcoded English in the pre-migration markup. If any of
// these show up on a German page, something is falling back.
const ENGLISH_LEAKS = [
  'Home',
  'Contact Details',
  'First name',
  'Last name',
  'Send my request',
  'Business Hours',
  'Quick Links',
  'Stay in touch',
  'Please choose',
  'Request your free quote',
];

for (const path of DE_PAGES) {
  test(`${path} is German with no English fallback`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    const text = await page.locator('main').innerText();
    const leaked = ENGLISH_LEAKS.filter((s) => text.includes(s));
    expect(leaked, `English strings leaked onto ${path}`).toEqual([]);
  });
}

for (const path of EN_PAGES) {
  test(`${path} is English`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
}

test('German and English homepages differ in body copy', async ({ page }) => {
  await page.goto('/');
  const de = await page.locator('.hero__title').innerText();
  await page.goto('/en/');
  const en = await page.locator('.hero__title').innerText();
  expect(de).not.toEqual(en);
  expect(de).toContain('Makellose');
  expect(en).toContain('Immaculate');
});

test('every page declares canonical + both hreflang alternates', async ({ page }) => {
  for (const path of ['/', '/kontakt/', '/en/', '/en/contact/']) {
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="de"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
  }
});

test('the language switcher links to this page in the other language', async ({ page }) => {
  await page.goto('/kontakt/');
  await expect(page.locator('.lang-switch a[hreflang="en"]')).toHaveAttribute('href', '/en/contact/');
  await page.goto('/en/contact/');
  await expect(page.locator('.lang-switch a[hreflang="de"]')).toHaveAttribute('href', '/kontakt/');
});

test('no runtime i18n dictionary is shipped', async ({ page }) => {
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/');
  expect(requests.filter((u) => u.includes('i18n'))).toEqual([]);
});
