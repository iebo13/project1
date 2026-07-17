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

const darkHeroPages = ['/leistungen/', '/galerie/', '/kontakt/', '/impressum/', '/datenschutz/'];

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

// The navbar is state-driven, not page-driven: solid navy (light text) at the
// top of EVERY page, solid white (dark text) once scrolled. The old per-page
// .navbar--solid variant caused a whole class of dark-on-dark bugs (invisible
// logo/links, and a phone number that was still dark-on-navy when it was
// visible) — deleting the variant deletes the bug class.
const allPages = ['/', '/leistungen/', '/galerie/', '/kontakt/', '/impressum/', '/datenschutz/'];

function lightness01(rgb) {
  const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number);
  // color() syntax reports 0-1, rgb() reports 0-255 — normalise.
  const max = Math.max(r, g, b) <= 1 ? 1 : 255;
  return (r + g + b) / 3 / max;
}

test('active language button is visibly highlighted in both navbar states', async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width < 1280, 'lang switch lives in the drawer on mobile');
  await page.goto('/');
  const active = page.locator('.lang-switch__btn.is-active');
  expect(await active.evaluate((el) => getComputedStyle(el).backgroundImage),
    'active chip needs its gradient pill on the navy bar too').toContain('gradient');
  expect(lightness01(await active.evaluate((el) => getComputedStyle(el).color)),
    'active label must be light on the pill').toBeGreaterThan(0.9);
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect(page.locator('.navbar')).toHaveClass(/is-scrolled/);
  expect(await active.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('gradient');
  await expect(async () => {
    expect(lightness01(await active.evaluate((el) => getComputedStyle(el).color)),
      'active label must stay light on the pill when scrolled').toBeGreaterThan(0.9);
  }).toPass({ timeout: 5000 });
});

for (const path of allPages) {
  test(`navbar on ${path} is light-on-navy at top, dark-on-white when scrolled`, async ({ page, viewport }) => {
    // Below the drawer breakpoint .nav-link is forced white for the navy
    // drawer panel, so the scrolled dark-text half only holds on desktop.
    test.skip(!viewport || viewport.width < 1280, 'drawer styles own the link colors on mobile');

    await page.goto(path);
    const navbar = page.locator('.navbar');
    await expect(navbar).not.toHaveClass(/is-scrolled/);
    // Page-load animations/transitions can still be interpolating .nav-link /
    // .logo color when this first read happens — poll past it rather than
    // reading mid-transition.
    await expect(async () => {
      for (const sel of ['.navbar .logo', '.navbar .nav-link']) {
        const rgb = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).color);
        expect(lightness01(rgb), `${sel} on ${path} is ${rgb} — too dark for the navy bar`)
          .toBeGreaterThan(0.6);
      }
    }).toPass({ timeout: 5000 });

    await page.evaluate(() => window.scrollTo(0, 300));
    await expect(navbar).toHaveClass(/is-scrolled/);
    // .nav-link/.logo colors transition over var(--t-base) on the is-scrolled
    // toggle, so the class landing doesn't guarantee the color has finished
    // interpolating yet — poll until it settles instead of reading once.
    await expect(async () => {
      for (const sel of ['.navbar .logo', '.navbar .nav-link']) {
        const rgb = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).color);
        expect(lightness01(rgb), `${sel} on ${path} is ${rgb} — too light for the white bar`)
          .toBeLessThan(0.4);
      }
    }).toPass({ timeout: 5000 });
  });
}

// The brands strip sits inside the dark #reviews band — its wordmarks must be
// readable against the navy, not navy-on-navy. Threshold is WCAG large-text
// (3:1): the items are --fs-2xl extrabold.
test('brand wordmarks are readable against the dark reviews band', async ({ page }) => {
  await page.goto('/');
  const item = page.locator('.brands__item').first();
  await item.scrollIntoViewIfNeeded();
  // data-reveal holds the strip at opacity 0 until the reveal lands.
  await expect(page.locator('.brands')).toHaveClass(/is-visible/);
  const bg = await page.locator('#reviews').evaluate((el) => getComputedStyle(el).backgroundColor);
  // The strip's own opacity dims whatever color the items have — composite it
  // in, polling past the 800ms reveal transition.
  await expect(async () => {
    const { color, alpha } = await item.evaluate((el) => ({
      color: getComputedStyle(el).color,
      alpha: parseFloat(getComputedStyle(el.closest('.brands')).opacity),
    }));
    const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map(Number);
    expect(contrast(`rgba(${r}, ${g}, ${b}, ${alpha})`, bg)).toBeGreaterThanOrEqual(3);
  }).toPass({ timeout: 5000 });
});

// The active testimonial dot grows into a pill inside a fixed-width slot.
// It used to widen the button itself, which pushed its neighbours sideways:
// the four centers were unevenly spaced and the whole row shifted on every
// slide change, so the highlight never sat on the dots' grid.
test('dot highlight sits on the dot grid and never shifts its neighbours', async ({ page }) => {
  await page.goto('/');
  // Settle like a real user: reveal finished before interacting. Clicking
  // mid-reveal makes Playwright's scroll-into-view race the transition and
  // spuriously scroll the overflow-hidden .slider sideways.
  await page.locator('#reviews').scrollIntoViewIfNeeded();
  await expect(page.locator('.slider')).toHaveClass(/is-visible/);
  await page.waitForTimeout(900);

  const dots = page.locator('.slider__dot');
  // Centers relative to the row, so ancestor scrolling can't skew the reading.
  const centers = () => dots.evaluateAll((els) => {
    const left = els[0].parentElement.getBoundingClientRect().x;
    return els.map((el) => { const r = el.getBoundingClientRect(); return r.x + r.width / 2 - left; });
  });

  const before = await centers();
  const gaps = before.slice(1).map((c, i) => c - before[i]);
  for (const g of gaps) expect(g, 'dot centers must be evenly spaced').toBeCloseTo(gaps[0], 0);

  await page.locator('.slider__btn--next').click();
  await expect(dots.nth(1)).toHaveClass(/is-active/);
  const after = await centers();
  after.forEach((c, i) => expect(c, 'moving the highlight must not move the dots').toBeCloseTo(before[i], 0));

  // The visible pill is the ::before; a percentage radius would draw a
  // tapered ellipse on its non-square active box instead of a capsule.
  const { radius, height } = await dots.nth(1).evaluate((el) => {
    const s = getComputedStyle(el, '::before');
    return { radius: s.borderTopLeftRadius, height: parseFloat(s.height) };
  });
  expect(radius, 'percentage radii draw an ellipse on a non-square element').toMatch(/px$/);
  expect(parseFloat(radius)).toBeGreaterThanOrEqual(height / 2);
});

// The footer contact block shipped unstyled: it inherited the 17px base font
// next to the column's 15px --fs-sm text, and sat flush against the
// newsletter pill with zero vertical gap.
test('footer contact block matches the column type scale and clears the form', async ({ page }) => {
  await page.goto('/');
  const col = page.locator('.footer__newsletter');
  await col.scrollIntoViewIfNeeded();
  const { pSize, contactSize, gap } = await col.evaluate((el) => {
    const contact = el.querySelector('.footer__contact');
    const form = el.querySelector('.newsletter-form');
    return {
      pSize: getComputedStyle(el.querySelector('p')).fontSize,
      contactSize: getComputedStyle(contact).fontSize,
      gap: contact.getBoundingClientRect().top - form.getBoundingClientRect().bottom,
    };
  });
  expect(contactSize, 'contact lines must use the same size as the column copy').toBe(pSize);
  expect(gap, 'the contact block must not touch the newsletter pill').toBeGreaterThanOrEqual(16);
});

test('interior heroes lead with the breadcrumb, left-aligned', async ({ page }) => {
  await page.goto('/kontakt/');
  const first = page.locator('.page-hero__content > *').first();
  expect(await first.getAttribute('class')).toContain('breadcrumb');
  const align = await page.locator('.page-hero__content').evaluate((el) => getComputedStyle(el).textAlign);
  expect(align).toBe('left');
});
