import langs from './src/_data/langs.js';

/**
 * Where the site is served from.
 *
 * A GitHub Pages *project* site lives at https://<user>.github.io/<repo>/, so
 * every absolute path needs that prefix or it resolves to the domain root and
 * 404s. A user site, or a real domain, is served from '/'.
 *
 * Set BASE_PATH at build time (the deploy workflow does this); it defaults to
 * '' so `npm start` and the test suite keep working at the root.
 *
 * Always ends without a trailing slash: '' or '/project1'.
 */
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');

/**
 * The site-relative path for a page key in a given language, WITHOUT the base
 * path. German is at the root ('/', '/leistungen/'); English is prefixed
 * ('/en/', '/en/services/').
 *
 * This is what permalinks use. GitHub Pages serves the CONTENTS of _site/ at
 * /<repo>/, so the output tree must NOT contain the repo name — writing
 * _site/project1/kontakt/ would serve at /project1/project1/kontakt/.
 */
function localePath(key, lang) {
  const slug = langs.slugs[key]?.[lang];
  if (slug === undefined) throw new Error(`localePath: unknown page key "${key}"`);
  const langPrefix = lang === langs.default ? '' : `/${lang}`;
  return slug === '' ? `${langPrefix}/` : `${langPrefix}/${slug}/`;
}

/**
 * The href for a page key — the same path, WITH the base path. This is what
 * links in the markup use, because the browser resolves them against the
 * served origin, where /project1 IS part of the URL.
 */
function localeUrl(key, lang) {
  return `${BASE_PATH}${localePath(key, lang)}`;
}

export default function (eleventyConfig) {
  // Static assets are served as-is; the CSS/JS pipeline is unchanged.
  eleventyConfig.addPassthroughCopy('css');
  eleventyConfig.addPassthroughCopy('js');
  eleventyConfig.addPassthroughCopy('assets');

  // For hrefs: {{ 'services' | url(lang) }} -> '/leistungen/', or
  // '/project1/leistungen/' when BASE_PATH is set.
  eleventyConfig.addFilter('url', localeUrl);

  // For permalinks ONLY: never carries BASE_PATH. See localePath().
  eleventyConfig.addFilter('permalinkFor', localePath);

  // {{ '/css/style.css' | asset }} -> '/css/style.css' or '/project1/css/style.css'
  eleventyConfig.addFilter('asset', (path) => `${BASE_PATH}${path}`);

  // {{ 'hero.title1' | t(dict[lang]) }} — look a key up in a language table.
  // Throws on a missing key at BUILD time rather than rendering the raw key
  // string into the page, which is how the old runtime switcher failed
  // silently. A typo breaks the build instead of shipping "about.f9.title".
  eleventyConfig.addFilter('t', (key, table) => {
    if (!table) throw new Error(`t: no language table passed for key "${key}"`);
    if (!(key in table)) throw new Error(`t: missing key "${key}"`);
    return table[key];
  });

  eleventyConfig.setServerOptions({ port: 8080, showAllHosts: false });

  return {
    // Deliberately NO pathPrefix. Our own `url`/`asset` filters already carry
    // BASE_PATH, and 11ty's pathPrefix ALSO rewrites permalinks — with both,
    // /project1/kontakt/ gets written to _site/project1/project1/kontakt/.
    // BASE_PATH is the single source of truth for the subpath.
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}
