// Brand and contact details, plus the nav structure.
//
// Nav items carry a translation `key` and a `page` key (resolved to a
// language-correct URL by the `url` filter) rather than a hardcoded href and
// an English label — the same seven links render as /leistungen/ for a German
// visitor and /en/services/ for an English one.
//
// `hash` appends an in-page anchor to the home page (Reviews and FAQ are
// sections of the homepage, not pages of their own).

export default {
  // Absolute origin, used for canonical + hreflang + og:url. Change this to
  // the real host before launch; a GitHub Pages project site is served from
  // https://<user>.github.io/<repo>/ and would need that full prefix.
  origin: 'https://blitzblank.de',
  ogImage:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  brand: 'BlitzBlank',
  tagline: 'Premium Reinigung',
  phone: '+49 211 934 567 89',
  phoneHref: 'tel:+4921193456789',
  email: 'hallo@blitzblank.de',
  address: 'Königsallee 42, 40212 Düsseldorf',
  nav: [
    { key: 'nav.home', page: 'home' },
    { key: 'nav.about', page: 'about' },
    { key: 'nav.services', page: 'services' },
    { key: 'nav.gallery', page: 'gallery' },
    { key: 'nav.reviews', page: 'home', hash: '#reviews' },
    { key: 'nav.faq', page: 'home', hash: '#faq' },
    { key: 'nav.contact', page: 'contact' },
  ],
};
