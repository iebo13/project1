import { test, expect } from '@playwright/test';

// #service carries data-rules="required" and its first option is value="" —
// omitting it makes every "valid" submission fail on that field instead.
async function fillValidForm(page) {
  await page.fill('#firstName', 'Anna');
  await page.fill('#lastName', 'Schmidt');
  await page.fill('#email', 'anna.schmidt@example.de');
  await page.selectOption('#service', 'office');
  await page.fill('#message', 'I would like a quote for a weekly office clean, roughly 200sqm.');
  await page.check('#consent');
}

test('submits successfully with valid input', async ({ page }) => {
  await page.goto('/contact.html');
  await fillValidForm(page);
  await page.click('#contact-form [type="submit"]');
  await expect(page.locator('.form-message')).toHaveClass(/form-message--success/, { timeout: 5000 });
});

test('shows an error for too-short input', async ({ page }) => {
  await page.goto('/contact.html');
  await fillValidForm(page);
  await page.fill('#firstName', 'A');
  await page.click('#contact-form [type="submit"]');
  await expect(page.locator('#firstName').locator('xpath=ancestor::div[contains(@class,"field")][1]'))
    .toHaveClass(/field--error/);
});

test('error message states the real minimum, not a hardcoded 3', async ({ page }) => {
  await page.goto('/contact.html');
  await page.fill('#firstName', 'A');
  await page.click('#contact-form [type="submit"]');
  const msg = await page.locator('#firstName ~ .field__error').textContent();
  expect(msg).toContain('2');
  expect(msg).not.toContain('3');
});

test('blocks submission when consent is unchecked', async ({ page }) => {
  await page.goto('/contact.html');
  await page.fill('#firstName', 'Anna');
  await page.fill('#lastName', 'Schmidt');
  await page.fill('#email', 'anna.schmidt@example.de');
  await page.fill('#message', 'I would like a quote for a weekly office clean, roughly 200sqm.');
  // deliberately do NOT check #consent
  await page.click('#contact-form [type="submit"]');

  await expect(page.locator('.form-message')).not.toHaveClass(/form-message--success/);
  await expect(page.locator('#consent').locator('xpath=ancestor::div[contains(@class,"field")][1]'))
    .toHaveClass(/field--error/);
});

test('consent field renders an error message', async ({ page }) => {
  await page.goto('/contact.html');
  await page.click('#contact-form [type="submit"]');
  await expect(page.locator('#consent ~ .field__error')).not.toBeEmpty();
});
