// The header nav lists only real pages. Reviews and FAQ are homepage
// *sections* (/#reviews, /#faq) — from an interior page a header link to them
// unexpectedly navigates back to the homepage, so they live in the footer
// only. Guards both directions: header stays at 5, footer keeps all 7.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

test('header nav lists only real pages; footer keeps the anchor links', () => {
  rmSync('_site', { recursive: true, force: true });
  execFileSync('npx', ['@11ty/eleventy'], {
    env: { ...process.env, BASE_PATH: '', SITE_ORIGIN: '' },
    stdio: 'pipe',
  });
  const html = readFileSync('_site/index.html', 'utf8');

  const header = html.match(/<nav class="nav-menu"[\s\S]*?<\/nav>/)[0];
  assert.equal((header.match(/class="nav-link"/g) || []).length, 5,
    'header should show exactly the 5 real pages');
  assert.ok(!header.includes('#reviews') && !header.includes('#faq'),
    'homepage anchors must not appear in the header');

  const footer = html.match(/<footer[\s\S]*<\/footer>/)[0];
  assert.ok(footer.includes('href="/#reviews"'), 'Reviews must stay reachable from the footer');
  assert.ok(footer.includes('href="/#faq"'), 'FAQ must stay reachable from the footer');
});
