// The two languages the site is built in, and the slug each page uses in each.
//
// German is at the root because it is the primary market (a Düsseldorf
// cleaning company) and because rooting it means no redirect is needed at `/`
// — which a static host cannot do without server config.
//
// Slugs are localized: a German visitor gets /leistungen/, not /services/.
// `key` is the stable page identity used to look a page up across languages
// (for hreflang alternates and the language switcher).

export default {
  codes: ['de', 'en'],
  default: 'de',

  // key -> { de: slug, en: slug }.  '' means the language's index.
  slugs: {
    home: { de: '', en: '' },
    services: { de: 'leistungen', en: 'services' },
    gallery: { de: 'galerie', en: 'gallery' },
    contact: { de: 'kontakt', en: 'contact' },
    imprint: { de: 'impressum', en: 'imprint' },
    privacy: { de: 'datenschutz', en: 'privacy' },
  },

  // Language names as written in their own language, for the switcher.
  names: { de: 'Deutsch', en: 'English' },
};
