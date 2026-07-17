// Brand and contact details, plus the nav structure.
//
// Nav items carry a translation `key` and a `page` key (resolved to a
// language-correct URL by the `url` filter) rather than a hardcoded href and
// an English label — the same six links render as /leistungen/ for a German
// visitor and /en/services/ for an English one.

export default {
  // Absolute origin for canonical + hreflang + og:url — the scheme and host
  // ONLY; the path prefix is added by the `url` filter, so do not repeat it
  // here. Set SITE_ORIGIN at build time (the deploy workflow points it at the
  // Pages URL). The default is the intended production domain.
  //
  // This must match where the site is actually served: a canonical pointing at
  // a domain you do not control tells Google to index that one instead.
  origin: process.env.SITE_ORIGIN || 'https://blitzblank.de',
  ogImage:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  brand: 'BlitzBlank',
  tagline: 'Premium Reinigung',
  phone: '+49 211 934 567 89',
  phoneHref: 'tel:+4921193456789',
  email: 'hallo@blitzblank.de',
  address: 'Königsallee 42, 40212 Düsseldorf',
  // `inHeader` mirrors the `onHome` idiom on services: the header shows only
  // real pages; the footer renders the full list including the two homepage
  // anchors. `hash` appends an in-page anchor to the home page (Reviews and
  // FAQ are sections of the homepage, not pages of their own).
  nav: [
    { key: 'nav.home', page: 'home', inHeader: true },
    { key: 'nav.services', page: 'services', inHeader: true },
    { key: 'nav.gallery', page: 'gallery', inHeader: true },
    { key: 'nav.reviews', page: 'home', hash: '#reviews', inHeader: false },
    { key: 'nav.faq', page: 'home', hash: '#faq', inHeader: false },
    { key: 'nav.contact', page: 'contact', inHeader: true },
  ],
};
