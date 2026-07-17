import { test, expect } from '@playwright/test';

// The Impressum and Datenschutz pages exist to close the launch blocker
// documented in README.md: the consent checkbox and the footer's legal links
// used to point at href="#". These tests pin the pages themselves and every
// path that leads to them, so a dead legal link cannot come back silently.

const pages = [
  ['/impressum/', 'Impressum'],
  ['/datenschutz/', 'Datenschutzerklärung'],
  ['/en/imprint/', 'Legal Notice'],
  ['/en/privacy/', 'Privacy Policy'],
];

for (const [path, h1] of pages) {
  test(`${path} renders with its h1`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('main h1')).toHaveText(h1);
  });
}

test('footer legal links resolve to the legal pages, no dead "#" left', async ({ page }) => {
  await page.goto('/');
  const legal = page.locator('.footer__legal a');
  await expect(legal).toHaveCount(2);
  await expect(legal.nth(0)).toHaveAttribute('href', '/impressum/');
  await expect(legal.nth(1)).toHaveAttribute('href', '/datenschutz/');

  await page.goto('/en/');
  await expect(page.locator('.footer__legal a').nth(0)).toHaveAttribute('href', '/en/imprint/');
  await expect(page.locator('.footer__legal a').nth(1)).toHaveAttribute('href', '/en/privacy/');
});

test('the consent checkbox links to the privacy page in the page language', async ({ page }) => {
  await page.goto('/kontakt/');
  const link = page.locator('.field--consent a');
  await expect(link).toHaveAttribute('href', '/datenschutz/');
  await expect(link).toHaveAttribute('target', '_blank');

  await page.goto('/en/contact/');
  await expect(page.locator('.field--consent a')).toHaveAttribute('href', '/en/privacy/');
});

test('the language switcher pairs the legal pages across languages', async ({ page }) => {
  await page.goto('/impressum/');
  await expect(page.locator('.lang-switch a[hreflang="en"]')).toHaveAttribute('href', '/en/imprint/');
  await page.goto('/en/privacy/');
  await expect(page.locator('.lang-switch a[hreflang="de"]')).toHaveAttribute('href', '/datenschutz/');
});
