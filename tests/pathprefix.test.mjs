// Verifies the GitHub Pages *project site* build, which is served from
// https://<user>.github.io/<repo>/ rather than a domain root.
//
// This is not a Playwright test: it builds the site twice with different env
// and asserts on the output, so it runs under `node --test` instead.
//
// The bug it guards: with BASE_PATH unset, every href is absolute from the
// domain root ("/css/style.css", "/leistungen/"). Deployed to a project
// subpath those all 404 — you get an unstyled page with dead links. It looks
// completely broken, and nothing in the normal test suite catches it, because
// locally the site IS served from the root.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, existsSync } from 'node:fs';

const build = (env) => {
  rmSync('_site', { recursive: true, force: true });
  execFileSync('npx', ['@11ty/eleventy'], { env: { ...process.env, ...env }, stdio: 'pipe' });
};

test('project-subpath build prefixes every absolute path', () => {
  build({ BASE_PATH: '/project1', SITE_ORIGIN: 'https://iebo13.github.io' });
  const html = readFileSync('_site/index.html', 'utf8');

  // Output tree must NOT contain the repo name: Pages serves the CONTENTS of
  // _site/ at /project1/, so _site/project1/ would land at /project1/project1/.
  assert.ok(!existsSync('_site/project1'), 'output must not be double-prefixed');

  for (const asset of ['variables.css', 'style.css', 'app.js', 'gallery.js']) {
    assert.match(html, new RegExp(`"/project1/(css|js)/${asset.replace('.', '\\.')}"`),
      `${asset} must be served from the subpath`);
  }

  for (const page of ['kontakt', 'leistungen', 'galerie']) {
    assert.ok(html.includes(`href="/project1/${page}/"`), `${page} link must be prefixed`);
    assert.ok(!html.includes(`href="/${page}/"`), `${page} must not be linked unprefixed`);
  }

  assert.ok(html.includes('<link rel="canonical" href="https://iebo13.github.io/project1/"'),
    'canonical must point at the real Pages URL, not a domain we do not own');
});

test('root build is unprefixed (dev server + local tests)', () => {
  build({ BASE_PATH: '', SITE_ORIGIN: '' });
  const html = readFileSync('_site/index.html', 'utf8');

  assert.ok(html.includes('href="/css/variables.css"'), 'root build stays unprefixed');
  assert.ok(html.includes('href="/kontakt/"'), 'root build links stay unprefixed');
  assert.ok(!html.includes('/project1/'), 'root build must carry no subpath');
});
