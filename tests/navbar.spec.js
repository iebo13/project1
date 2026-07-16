import { test, expect } from '@playwright/test';

// The desktop navbar packs a logo, five nav links, a language switch, a phone
// number and a CTA into one row. German runs ~10% wider than English ("Angebot
// anfordern" vs "Get a Quote"), so German is the width that actually has to fit
// — every assertion here runs in both languages, and German is the one that
// catches regressions.
const LANGS = ['en', 'de'];

// Only widths at or above the desktop-nav breakpoint. Below it the nav collapses
// into the mobile drawer and none of this geometry applies.
const DESKTOP_WIDTHS = [1280, 1440, 1920, 2560];

// Each language is a real URL now (German at the root, English under /en/) —
// no localStorage, no runtime text swap to wait for. The text assertion stays
// as a guard that we actually landed on the language we asked for.
async function loadAt(page, { width, lang }) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(lang === 'de' ? '/' : '/en/');
  await page.locator('.navbar__inner').waitFor();
  await expect(page.locator('.nav-link').first()).toHaveText(lang === 'de' ? 'Start' : 'Home');
}

// A wrapped element is taller than its own line-height. This catches the "Über
// uns" / phone-number line breaks directly rather than asserting on pixel widths
// that would need updating whenever the copy changes. Measures the content box —
// .nav-link's 8px of vertical padding would otherwise score one line as two.
async function lineCount(locator) {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    return Math.round((el.clientHeight - padY) / parseFloat(cs.lineHeight));
  });
}

test.describe('desktop navbar layout', () => {
  test.skip(({ viewport }) => !viewport || viewport.width < 1280, 'desktop nav only');

  for (const lang of LANGS) {
    for (const width of DESKTOP_WIDTHS) {
      test(`[${lang}] nav links stay on one line at ${width}px`, async ({ page }) => {
        await loadAt(page, { width, lang });
        for (const link of await page.locator('.nav-link').all()) {
          expect(await lineCount(link), `"${await link.innerText()}" wrapped`).toBe(1);
        }
      });

      test(`[${lang}] navbar row does not overflow its container at ${width}px`, async ({ page }) => {
        await loadAt(page, { width, lang });
        const { scrollW, clientW } = await page.locator('.navbar__inner').evaluate((el) => ({
          scrollW: el.scrollWidth,
          clientW: el.clientWidth,
        }));
        expect(scrollW).toBeLessThanOrEqual(clientW);
      });

      test(`[${lang}] CTA text is not clipped at ${width}px`, async ({ page }) => {
        await loadAt(page, { width, lang });
        // scrollWidth > clientWidth means the label is painted wider than the
        // button that contains it — i.e. "Angebot anfordern" cut to "ngebot...".
        const cta = page.locator('.navbar__actions .btn');
        const { scrollW, clientW } = await cta.evaluate((el) => ({
          scrollW: el.scrollWidth,
          clientW: el.clientWidth,
        }));
        expect(scrollW).toBeLessThanOrEqual(clientW);
      });
    }

    test(`[${lang}] phone number stays on one line where it is shown`, async ({ page }) => {
      // The phone is a secondary affordance and is hidden on narrower screens to
      // buy room for the nav; assert only where it is actually visible.
      for (const width of DESKTOP_WIDTHS) {
        await loadAt(page, { width, lang });
        const phone = page.locator('.navbar__phone');
        if (await phone.isVisible()) {
          expect(await lineCount(phone), `phone wrapped at ${width}px`).toBe(1);
        }
      }
    });
  }

  // The bug that started this: on a 2560px screen the header sat in a 1280px
  // band with 640px of dead margin each side while its own content was squeezed
  // 279px below what it needed.
  test('[de] header uses the wide-screen band instead of leaving margins unused', async ({ page }) => {
    await loadAt(page, { width: 2560, lang: 'de' });
    const innerW = await page.locator('.navbar__inner').evaluate((el) => el.getBoundingClientRect().width);
    expect(innerW).toBeGreaterThanOrEqual(1600);
  });
});
