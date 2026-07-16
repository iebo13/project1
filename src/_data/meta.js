// Per-page <title> and <meta description>, per language.
//
// The retired runtime switcher never translated these — every page shipped
// German meta under lang="en", because a JS textContent swap can't rewrite
// the <head> before a crawler reads it. Resolving them at build time is the
// point of the migration.
//
// Keyed by the same page keys as langs.js slugs.

export default {
  de: {
    home: {
      title: 'BlitzBlank — Premium Reinigung Düsseldorf | Gebäude- und Büroreinigung',
      description:
        'BlitzBlank ist Ihre Premium-Reinigungsfirma in Düsseldorf. Büroreinigung, Haushaltsreinigung, Fensterreinigung und mehr. Kostenloses Angebot in 24h.',
    },
    about: {
      title: 'Über uns — BlitzBlank Düsseldorf',
      description:
        'Seit 2010 ein Boutique-Reinigungsstudio in Düsseldorf. Lernen Sie das Team, unsere Werte und unsere Geschichte kennen.',
    },
    services: {
      title: 'Leistungen — BlitzBlank Düsseldorf',
      description:
        'Zehn Reinigungsleistungen für jeden Raum: Büro, Haushalt, Fenster, Industrie, Grundreinigung und mehr. Festpreise, kostenloses Angebot.',
    },
    gallery: {
      title: 'Galerie — BlitzBlank Düsseldorf',
      description:
        'Vorher-Nachher-Eindrücke aus Wohnungen, Büros und Industrieflächen in Düsseldorf und dem Rhein-Ruhr-Gebiet.',
    },
    contact: {
      title: 'Kontakt — BlitzBlank Düsseldorf',
      description:
        'Kontaktieren Sie BlitzBlank für ein kostenloses, unverbindliches Reinigungsangebot. Telefon, E-Mail oder Formular — Antwort innerhalb eines Werktages.',
    },
  },
  en: {
    home: {
      title: 'BlitzBlank — Premium Cleaning Düsseldorf | Office and Home Cleaning',
      description:
        'BlitzBlank is a premium cleaning studio in Düsseldorf. Office, home, and window cleaning and more. Free quote within 24 hours.',
    },
    about: {
      title: 'About — BlitzBlank Düsseldorf',
      description:
        'A boutique cleaning studio in Düsseldorf since 2010. Meet the team, our values, and the story behind the standard.',
    },
    services: {
      title: 'Services — BlitzBlank Düsseldorf',
      description:
        'Ten cleaning services for every space: office, home, window, industrial, deep cleaning and more. Flat-rate pricing, free quote.',
    },
    gallery: {
      title: 'Gallery — BlitzBlank Düsseldorf',
      description:
        'Before-and-after work from homes, offices, and industrial spaces across Düsseldorf and the Rhine-Ruhr region.',
    },
    contact: {
      title: 'Contact — BlitzBlank Düsseldorf',
      description:
        'Get in touch with BlitzBlank for a free, no-obligation cleaning quote. Phone, email, or the form — we reply within one business day.',
    },
  },
};
