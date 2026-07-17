import { test, expect } from '@playwright/test';

// The mobile counterpart to navbar.spec.js. Below 1280px the nav lives in the
// .nav-drawer <dialog>, the header row is logo (+ CTA above 768px) + burger,
// and the language switch moves into the drawer. The layout this replaces
// packed logo + language switch + CTA + burger into the row: in German it
// needed 497px, which put the burger at x 453–497 on a 390px phone — entirely
// off-screen, so the menu could not be opened at all.

const LANGS = ['en', 'de'];

// Only widths below the desktop-nav breakpoint; navbar.spec.js owns 1280+.
const DRAWER_WIDTHS = [320, 360, 390, 412, 540, 768, 1024, 1279];

// Runs once, in the mobile project — the desktop project would duplicate it
// (every test sets its own viewport anyway).
test.skip(({ viewport }) => !viewport || viewport.width >= 1280, 'mobile drawer only');

async function loadAt(page, { width, lang }) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(lang === 'de' ? '/' : '/en/');
  await page.locator('.navbar__inner').waitFor();
}

async function openDrawer(page) {
  await page.locator('.nav-toggle').click();
  await expect(page.locator('.nav-drawer[open]')).toHaveCount(1);
}

// The exit animation holds the dialog open for ~480ms after a close request;
// the retrying assertion absorbs it.
async function expectClosed(page) {
  await expect(page.locator('.nav-drawer[open]')).toHaveCount(0);
  await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false');
}

for (const lang of LANGS) {
  test(`[${lang}] burger stays on-screen and the header row never overflows`, async ({ page }) => {
    for (const width of DRAWER_WIDTHS) {
      await loadAt(page, { width, lang });

      const toggle = page.locator('.nav-toggle');
      await expect(toggle).toBeVisible();
      const box = await toggle.boundingBox();
      expect(box.x, `burger clipped left at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `burger past the right edge at ${width}px`).toBeLessThanOrEqual(width);

      const { scrollW, clientW } = await page
        .locator('.navbar__inner')
        .evaluate((el) => ({ scrollW: el.scrollWidth, clientW: el.clientWidth }));
      expect(scrollW, `header row overflows at ${width}px`).toBeLessThanOrEqual(clientW);

      // The language switch belongs to the drawer down here.
      await expect(page.locator('.navbar__actions .lang-switch')).toBeHidden();
    }
  });

  test(`[${lang}] drawer carries the full nav, language switch, phone and CTA`, async ({ page }) => {
    await loadAt(page, { width: 390, lang });
    await openDrawer(page);

    const drawer = page.locator('.nav-drawer');
    await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'true');
    // The full six-entry nav — anchors included — not the four-page header cut.
    await expect(drawer.locator('.nav-drawer__link')).toHaveCount(6);

    // Real counterpart links, same contract as the desktop switch.
    const other = lang === 'de' ? 'en' : 'de';
    await expect(drawer.locator(`.lang-switch a[hreflang="${other}"]`)).toHaveAttribute(
      'href',
      other === 'en' ? '/en/' : '/'
    );
    await expect(drawer.locator('.nav-drawer__phone')).toBeVisible();
    await expect(drawer.locator('.nav-drawer__cta')).toBeVisible();

    await drawer.locator('.nav-drawer__close').click();
    await expectClosed(page);
  });
}

test('ESC and a backdrop tap both close the drawer', async ({ page }) => {
  await loadAt(page, { width: 390, lang: 'de' });

  await openDrawer(page);
  await page.keyboard.press('Escape');
  await expectClosed(page);

  await openDrawer(page);
  // The drawer is a right-anchored 88vw sheet; x=5 is on the backdrop.
  await page.mouse.click(5, 400);
  await expectClosed(page);
});

test('a drawer anchor link closes the drawer and reaches its section', async ({ page }) => {
  // Reduced motion pins this: the jump is instant, so lazy-loading images
  // cannot grow the page mid-scroll. (Smooth scrolling to a far anchor lands
  // short on first visit because images ship without width/height — a known,
  // separately-tracked gap that predates the drawer and affects every
  // same-page link equally.)
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadAt(page, { width: 390, lang: 'de' });

  await openDrawer(page);
  await page.locator('.nav-drawer__link[href="/#faq"]').click();
  await expectClosed(page);

  await expect
    .poll(async () => Math.abs(await page.locator('#faq').evaluate((el) => el.getBoundingClientRect().top)))
    .toBeLessThan(844);
});

test('no page scrolls horizontally at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const paths = [
    '/', '/leistungen/', '/galerie/', '/kontakt/',
    '/en/', '/en/services/', '/en/gallery/', '/en/contact/',
    '/404.html',
  ];
  for (const path of paths) {
    await page.goto(path);
    await page.locator('.navbar__inner').waitFor();
    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    // html{overflow-x:clip} discards horizontal overflow entirely, so any
    // excess here is a real, user-visible layout break.
    expect(scrollW, `${path} overflows horizontally`).toBeLessThanOrEqual(clientW);
  }
});
