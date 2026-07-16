import langs from './src/_data/langs.js';

/**
 * Build the URL for a page key in a given language.
 * German is at the root ('/', '/leistungen/'); English is prefixed ('/en/',
 * '/en/services/'). Returns a root-relative URL.
 */
function localeUrl(key, lang) {
  const slug = langs.slugs[key]?.[lang];
  if (slug === undefined) throw new Error(`localeUrl: unknown page key "${key}"`);
  const prefix = lang === langs.default ? '' : `/${lang}`;
  return slug === '' ? `${prefix}/` : `${prefix}/${slug}/`;
}

export default function (eleventyConfig) {
  // Static assets are served as-is; the CSS/JS pipeline is unchanged.
  eleventyConfig.addPassthroughCopy('css');
  eleventyConfig.addPassthroughCopy('js');
  eleventyConfig.addPassthroughCopy('assets');

  // {{ 'services' | url(lang) }} -> '/leistungen/' or '/en/services/'
  eleventyConfig.addFilter('url', localeUrl);

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
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}
