import { test, expect } from '@playwright/test';

// The form uses native HTML validation (required / minlength / type=email /
// pattern), so the browser blocks an invalid submit before the submit event
// fires. These tests assert the native ValidityState rather than any custom
// error class.

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

test('blocks submission when firstName is too short', async ({ page }) => {
  await page.goto('/contact.html');
  await fillValidForm(page);
  await page.fill('#firstName', 'A'); // minlength=2
  await page.click('#contact-form [type="submit"]');
  // native validation blocks the submit handler
  await expect(page.locator('.form-message')).not.toHaveClass(/form-message--success/);
  const tooShort = await page.locator('#firstName').evaluate((el) => el.validity.tooShort);
  expect(tooShort).toBe(true);
});

test('blocks submission on an invalid email', async ({ page }) => {
  await page.goto('/contact.html');
  await fillValidForm(page);
  await page.fill('#email', 'not-an-email');
  await page.click('#contact-form [type="submit"]');
  await expect(page.locator('.form-message')).not.toHaveClass(/form-message--success/);
  const typeMismatch = await page.locator('#email').evaluate((el) => el.validity.typeMismatch);
  expect(typeMismatch).toBe(true);
});

test('blocks submission when consent is unchecked', async ({ page }) => {
  await page.goto('/contact.html');
  await fillValidForm(page);
  await page.uncheck('#consent');
  await page.click('#contact-form [type="submit"]');
  await expect(page.locator('.form-message')).not.toHaveClass(/form-message--success/);
  const valueMissing = await page.locator('#consent').evaluate((el) => el.validity.valueMissing);
  expect(valueMissing).toBe(true);
});

test('blocks submission when a required field is empty', async ({ page }) => {
  await page.goto('/contact.html');
  // fill everything except the message
  await page.fill('#firstName', 'Anna');
  await page.fill('#lastName', 'Schmidt');
  await page.fill('#email', 'anna.schmidt@example.de');
  await page.selectOption('#service', 'office');
  await page.check('#consent');
  await page.click('#contact-form [type="submit"]');
  await expect(page.locator('.form-message')).not.toHaveClass(/form-message--success/);
  const valueMissing = await page.locator('#message').evaluate((el) => el.validity.valueMissing);
  expect(valueMissing).toBe(true);
});
