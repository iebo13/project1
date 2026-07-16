/* =========================================================
   I18N.JS
   Bilingual EN/DE translation system.
   Looks up elements with [data-i18n] attribute and
   replaces their text content with the active language.
   Also supports [data-i18n-placeholder] for placeholders.
   Persists language preference in localStorage.
   ========================================================= */

const I18n = (() => {
  const STORAGE_KEY = 'blitzblank-lang';
  const SUPPORTED = ['en', 'de'];
  let current = 'en';

  const dict = {
    en: {
      /* Logo */
      'logo.tag': 'Premium Reinigung',

      /* Nav */
      'nav.home': 'Home',
      'nav.about': 'About',
      'nav.services': 'Services',
      'nav.gallery': 'Gallery',
      'nav.reviews': 'Reviews',
      'nav.faq': 'FAQ',
      'nav.contact': 'Contact',
      'nav.cta': 'Get a Quote',
      'nav.menu': 'Toggle menu',

      /* Hero */
      'hero.eyebrow': 'Trusted by 500+ Düsseldorf clients',
      'hero.title1': 'Immaculate spaces,',
      'hero.title2': 'crafted with',
      'hero.title3': 'obsessive care.',
      'hero.subtitle': 'We are BlitzBlank — a boutique cleaning studio delivering five-star residential and commercial cleaning across Düsseldorf. Spotless results, every visit, guaranteed in writing.',
      'hero.cta1': 'Book a Free Walkthrough',
      'hero.cta2': 'Explore Services',
      'hero.scroll': 'Scroll',
      'hero.stat1.num': '500',
      'hero.stat1.label': 'Happy Clients',
      'hero.stat2.num': '15',
      'hero.stat2.label': 'Years Experience',
      'hero.stat3.num': '100',
      'hero.stat3.label': 'Satisfaction',

      /* Marquee */
      'strip.1': 'Eco-Friendly Products',
      'strip.2': 'Background-Checked Crews',
      'strip.3': '100% Satisfaction Guarantee',
      'strip.4': 'Same-Day Availability',
      'strip.5': 'Insured & Bonded',

      /* Stats section */
      'stats.eyebrow': 'By the Numbers',
      'stats.title': 'A track record you can trust',
      'stats.subtitle': 'Fifteen years. Thousands of spotless rooms. A reputation earned one detail at a time.',
      'stats.1.num': '500',
      'stats.1.label': 'Happy Clients',
      'stats.2.num': '12500',
      'stats.2.label': 'Cleans Completed',
      'stats.3.num': '15',
      'stats.3.label': 'Years Experience',
      'stats.4.num': '100',
      'stats.4.label': 'Satisfaction',

      /* Services section (home) */
      'services.eyebrow': 'What We Do',
      'services.title': 'Cleaning services for every space',
      'services.subtitle': 'From boutique offices to sprawling warehouses, we bring the same obsessive attention to detail to every job we touch.',
      'services.viewAll': 'View all 10 services',

      /* About preview */
      'about.eyebrow': 'Our Story',
      'about.title': 'A boutique studio, not a faceless franchise.',
      'about.desc': 'Founded in 2010 in a single Düsseldorf apartment, BlitzBlank has grown into the Rhine-Ruhr region\'s most quietly trusted cleaning studio. We refuse to franchise. Every crew is hired, trained, and equipped in-house — because quality is something you can\'t outsource.',
      'about.f1.title': 'Vetted Crews',
      'about.f1.desc': 'Background-checked, uniformed, and trained for 80 hours before stepping into your space.',
      'about.f2.title': 'Eco-First',
      'about.f2.desc': 'Plant-based, pH-neutral products that are safe for kids, pets, and the planet.',
      'about.f3.title': 'Real Guarantee',
      'about.f3.desc': 'Not happy with a clean? We return within 24 hours to make it right, free.',
      'about.f4.title': 'Transparent Pricing',
      'about.f4.desc': 'Flat-rate quotes online in 60 seconds. No surprises, no upsells, no nickel-and-diming.',
      'about.cta': 'Meet the team',

      /* Gallery preview */
      'gallery.eyebrow': 'Recent Work',
      'gallery.title': 'Spaces we\'ve transformed',
      'gallery.subtitle': 'A glimpse into the rooms, offices, and venues we\'ve recently brought back to life.',
      'gallery.cta': 'View full gallery',
      'gallery.cat1': 'Residential',
      'gallery.cat2': 'Commercial',
      'gallery.cat3': 'Deep Clean',
      'gallery.cat4': 'Floor Care',
      'gallery.cat5': 'Hospitality',

      /* Testimonials */
      'testimonials.eyebrow': 'Client Stories',
      'testimonials.title': 'Loved by 500+ Düsseldorf clients',
      'testimonials.subtitle': 'A few of the kind words we\'ve collected over the years.',

      /* FAQ */
      'faq.eyebrow': 'Good to Know',
      'faq.title': 'Frequently asked questions',
      'faq.subtitle': 'Everything you need to know before booking. Still curious? Just reach out — we love to chat.',

      /* Contact CTA */
      'cta.eyebrow': 'Ready When You Are',
      'cta.title': 'Let\'s make your space immaculate.',
      'cta.desc': 'Get a personalised quote in under 60 seconds. No obligations, no pressure — just a real conversation about what your space needs.',
      'cta.btn1': 'Get my free quote',
      'cta.btn2': 'Call us',

      /* Footer */
      'footer.about': 'Boutique cleaning studio serving Düsseldorf and the Rhine-Ruhr region since 2010. Obsessive attention to detail, eco-friendly products, real people who care.',
      'footer.quickLinks': 'Quick Links',
      'footer.services': 'Services',
      'footer.newsletter': 'Stay in touch',
      'footer.newsletterDesc': 'Subscribe for seasonal cleaning tips, exclusive offers, and the occasional dose of inspiration. No spam, ever.',
      'footer.placeholder': 'Your email address',
      'footer.subscribe': 'Subscribe',
      'footer.rights': 'BlitzBlank. All rights reserved.',
      'footer.privacy': 'Privacy',
      'footer.terms': 'Terms',
      'footer.cookies': 'Cookies',
      'footer.backToTop': 'Back to top',

      /* Page hero (interior pages) */
      'page.about.eyebrow': 'About Us',
      'page.about.title': 'People who treat cleaning as a craft.',
      'page.about.subtitle': 'We\'re a small studio with big standards. Every clean is a chance to earn your trust — one detail at a time.',
      'page.services.eyebrow': 'What We Do',
      'page.services.title': 'Ten services. One obsession.',
      'page.services.subtitle': 'From boutique offices to sprawling warehouses, every BlitzBlank clean is held to the same uncompromising standard.',
      'page.gallery.eyebrow': 'Portfolio',
      'page.gallery.title': 'Spaces we\'ve brought back to life.',
      'page.gallery.subtitle': 'A curated selection of recent projects. Filter by category, click any image to view full size.',
      'page.contact.eyebrow': 'Say Hello',
      'page.contact.title': 'Let\'s make your space immaculate.',
      'page.contact.subtitle': 'Tell us what you need. We\'ll send a personalised quote within one business day — no pushy salespeople, no obligation.',

      /* Breadcrumb */
      'crumb.home': 'Home',

      /* About page */
      'about.mv.eyebrow': 'What Drives Us',
      'about.mv.title': 'Our mission & vision',
      'about.mv.subtitle': 'Two short sentences that shape every decision we make.',
      'about.mission.title': 'Our Mission',
      'about.mission.text': 'To elevate the standard of cleaning in every home and business we touch — proving that a spotless space is not a luxury, but a foundation for clearer thinking, calmer living, and more productive work. We exist to give people their time back, and a space they\'re proud of.',
      'about.vision.title': 'Our Vision',
      'about.vision.text': 'To become Düsseldorf\'s most quietly trusted cleaning studio — known not for marketing volume, but for the calibre of our crews, the rigour of our training, and the relationships we build with each client. We will never franchise. We will never compromise on the people who do the work.',

      /* Values */
      'about.values.eyebrow': 'What We Stand For',
      'about.values.title': 'Five values, lived daily',
      'about.values.subtitle': 'These aren\'t posters on a wall. They\'re the filters we run every decision through.',
      'value.1.title': 'Integrity',
      'value.1.desc': 'We do what we said we\'d do, exactly when we said we\'d do it. If we mess up, we say so — and we fix it, fast, no excuses.',
      'value.2.title': 'Craft',
      'value.2.desc': 'Cleaning is not a chore to us — it\'s a craft. We study tools, techniques, and chemistry so you don\'t have to think about any of it.',
      'value.3.title': 'Care',
      'value.3.desc': 'We treat every space as if it were our own. Your home, your office, your restaurant — it matters to us because it matters to you.',
      'value.4.title': 'Reliability',
      'value.4.desc': 'You\'ll never have to wonder if we\'re showing up. Same crew, same time, same spotless result — visit after visit, year after year.',
      'value.5.title': 'Sustainability',
      'value.5.desc': 'Plant-based products, refillable bottles, electric vehicles. We obsess over our environmental footprint as much as your dust bunnies.',
      'value.6.title': 'People First',
      'value.6.desc': 'Our crews are employees, not contractors. They earn a living wage, get healthcare, and stay with us for years. You meet the same faces.',

      /* Timeline */
      'about.timeline.eyebrow': 'Our Journey',
      'about.timeline.title': 'Fifteen years, one obsession',
      'about.timeline.subtitle': 'From a single Düsseldorf apartment to the Rhine-Ruhr\'s most quietly trusted cleaning studio.',

      /* Team */
      'about.team.eyebrow': 'The People',
      'about.team.title': 'Meet the leadership team',
      'about.team.subtitle': 'The hands-on crew behind every spotless space. You\'ll see them on site — not behind a desk.',

      /* Certs */
      'about.certs.eyebrow': 'Credentials',
      'about.certs.title': 'Certified, insured, audited',
      'about.certs.subtitle': 'The boring paperwork that lets you sleep at night. We\'ve done all of it.',

      /* Experience stats */
      'about.exp.eyebrow': 'By the Numbers',
      'about.exp.title': 'Fifteen years, told in figures',
      'about.exp.1.label': 'Years in Business',
      'about.exp.2.label': 'Crew Members',
      'about.exp.3.label': 'Cleans Completed',
      'about.exp.4.label': 'Client Retention',

      /* Services page */
      'services.catalog.eyebrow': 'Service Catalogue',
      'services.catalog.title': 'Pick the cleaning your space needs',
      'services.catalog.subtitle': 'Ten specialised services, each delivered by trained crews using the right tools, the right products, and the right amount of obsession.',
      'services.process.eyebrow': 'How It Works',
      'services.process.title': 'From quote to spotless in four steps',
      'services.process.step1.title': 'Request a quote',
      'services.process.step1.desc': 'Fill out our 60-second form. You\'ll get a flat-rate quote in writing — no phone tag, no upsells.',
      'services.process.step2.title': 'Schedule your clean',
      'services.process.step2.desc': 'Pick a date and time that works. Recurring clients get priority windows and locked-in rates.',
      'services.process.step3.title': 'We do the work',
      'services.process.step3.desc': 'Your uniformed crew arrives on time, equipped, and trained. You get a checklist on completion.',
      'services.process.step4.title': 'Enjoy & relax',
      'services.process.step4.desc': 'Walk into a spotless space. Anything off? We return within 24 hours, free. That\'s our guarantee.',
      'services.details.eyebrow': 'Service Details',
      'services.details.title': 'A closer look at each service',
      'services.details.subtitle': 'What\'s included, what you can expect, and why our crews are different.',
      'services.cta.title': 'Not sure which service fits?',
      'services.cta.desc': 'Tell us about your space and we\'ll recommend the right service, the right crew size, and the right cadence. Free, no obligation, no upsell.',
      'services.cta.btn1': 'Talk to a specialist',
      'services.cta.btn2': 'See our work',
      'services.link': 'View details',
      'services.link.all': 'Learn more',
      'services.btn.quote': 'Get a quote',

      /* Gallery page */
      'gallery.filters.all': 'All',
      'gallery.cta.title': 'Your space could be next.',
      'gallery.cta.desc': 'Every photo in this gallery started with a conversation. Let\'s have yours.',
      'gallery.cta.btn1': 'Start your project',
      'gallery.cta.btn2': 'Browse services',

      /* Contact page */
      'contact.details.eyebrow': 'Contact Details',
      'contact.details.title': 'Real people, real fast responses.',
      'contact.details.desc': 'Prefer to talk first? Call us, email us, or stop by the Düsseldorf HQ. We answer every message ourselves — no chatbots, no offshore call centres.',
      'contact.phone.label': 'Phone',
      'contact.email.label': 'Email',
      'contact.address.label': 'Studio HQ',
      'contact.hours.label': 'Business Hours',
      'contact.hours.value': 'Mon–Sat: 7:00 AM – 8:00 PM',
      'contact.hours.value2': 'Sunday: Closed (emergencies only)',
      'contact.form.title': 'Request your free quote',
      'contact.form.desc': 'Fields marked with * are required. We respond within one business day.',
      'contact.form.firstName': 'First name',
      'contact.form.lastName': 'Last name',
      'contact.form.email': 'Email',
      'contact.form.phone': 'Phone',
      'contact.form.service': 'Service needed',
      'contact.form.service.choose': 'Please choose…',
      'contact.form.message': 'Tell us about your space',
      'contact.form.message.ph': 'Square footage, frequency, any specific concerns…',
      'contact.form.consent': 'I agree to be contacted about my request and accept the',
      'contact.form.consent.privacy': 'privacy policy',
      'contact.form.consent.cont': 'We never share your data.',
      'contact.form.submit': 'Send my request',
      'contact.map.eyebrow': 'Find Us',
      'contact.map.title': 'Our Königsallee HQ',
      'contact.map.subtitle': 'Drop by for a coffee, or schedule a tour of the studio where every clean begins.',
      'contact.faq.title': 'Have a quick question first?',
      'contact.faq.desc': 'Browse our most-asked questions — we cover products, scheduling, guarantees, and more.',
      'contact.faq.btn1': 'Visit FAQ',
      'contact.faq.btn2': 'View services',

      /* Form validation messages */
      'form.required': 'This field is required.',
      'form.email': 'Please enter a valid email address.',
      'form.phone': 'Please enter a valid phone number.',
      'form.minLength': 'Please enter at least {n} characters.',
      'form.checked': 'Please check this box to continue.',
      'form.errorMsg': 'Please correct the highlighted fields and try again.',
      'form.successMsg': 'Thank you! Your message has been sent. We\'ll get back to you within one business day.',
      'form.toast.success': 'Message sent successfully!',
      'form.toast.invalid': 'Please enter a valid email address.',
      'form.toast.subscribed': 'You\'re subscribed! Welcome aboard.',

      /* 404 page */
      'error.code': '404',
      'error.title': 'This page slipped away.',
      'error.desc': 'Even our crews can\'t clean up a missing page. The link you followed may be broken, or the page may have been moved. Let\'s get you back to a spotless place.',
      'error.btn1': 'Back to home',
      'error.btn2': 'Browse services',
      'error.btn3': 'Contact us',
      'error.suggest': 'Or try one of these',
      'error.suggest.about': 'About Us',
      'error.suggest.gallery': 'Gallery',
      'error.suggest.reviews': 'Reviews',
      'error.suggest.faq': 'FAQ',

      /* Service titles & descriptions (shared across pages) */
      'srv.office.title': 'Office Cleaning',
      'srv.office.desc': 'Keep your team focused and your clients impressed with daily, weekly, or nightly office cleaning tailored to your workflow.',
      'srv.house.title': 'House Cleaning',
      'srv.house.desc': 'Reclaim your weekends. Our recurring house cleaning service keeps every corner of your home consistently spotless.',
      'srv.window.title': 'Window Cleaning',
      'srv.window.desc': 'Streak-free, sparkling windows inside and out — including hard-to-reach panes and skylights. Pure-water fed brush technology.',
      'srv.industrial.title': 'Industrial Cleaning',
      'srv.industrial.desc': 'Warehouses, factories, and production floors cleaned to commercial-grade standards. Specialised equipment, trained crews.',
      'srv.deep.title': 'Deep Cleaning',
      'srv.deep.desc': 'A top-to-bottom reset for spaces that need serious attention. Baseboards, grout, behind appliances, light fixtures — everything.',
      'srv.moveout.title': 'Move-out Cleaning',
      'srv.moveout.desc': 'Landlord-approved, deposit-saving cleans for vacating tenants. Includes interior appliances and cabinets.',
      'srv.carpet.title': 'Carpet Cleaning',
      'srv.carpet.desc': 'Hot-water extraction lifts years of embedded dirt and allergens. Stains vanish, fibres fluff back to life.',
      'srv.restaurant.title': 'Restaurant Cleaning',
      'srv.restaurant.desc': 'After-hours kitchen, dining, and restroom cleaning that passes every health inspection. Hood & extractors included.',
      'srv.medical.title': 'Medical Cleaning',
      'srv.medical.desc': 'Clinics, dental offices, urgent care. Hospital-grade terminal cleaning, trained crews, audit-ready always.',
      'srv.construction.title': 'Construction Cleaning',
      'srv.construction.desc': 'Post-build and post-reno cleans. Dust extraction, debris removal, surface detailing — make it move-in ready.',

      /* Gallery titles */
      'gallery.title1': 'Modern Kitchen Reset',
      'gallery.title2': 'Open-Plan Office',
      'gallery.title3': 'Sunlit Living Room',
      'gallery.title4': 'Corporate Suite',
      'gallery.title5': 'Spa-Grade Bathroom',
      'gallery.title6': 'Boardroom Refresh',
      'gallery.title7': 'Hardwood Revival',
      'gallery.title8': 'Restaurant Dining',

      /* Reviews */
      'review.1.text': '"BlitzBlank has been cleaning our 8,000 sq ft office for two years now. Not a single complaint — only compliments from staff and clients alike. The crews are punctual, professional, and obsessed with detail. They found dust I didn\'t know existed."',
      'review.1.name': 'Sarah Chen',
      'review.1.role': 'COO, Northwind Studio',
      'review.2.text': '"We tried three cleaning companies before finding BlitzBlank. The difference is night and day. They actually care. Our home has never felt more cared for, and the eco-friendly products give us peace of mind with two toddlers running around."',
      'review.2.name': 'Marcus Reed',
      'review.2.role': 'Homeowner, Oberkassel',
      'review.3.text': '"Running a busy restaurant means cleanliness is non-negotiable. BlitzBlank\'s after-hours team keeps our kitchen and dining room spotless, every single night. Health inspector said it was the cleanest kitchen she\'d seen in a decade."',
      'review.3.name': 'Elena Vasquez',
      'review.3.role': 'Owner, Maison Verde',
      'review.4.text': '"Our medical clinic demands the highest sanitation standards. BlitzBlank\'s medical-grade cleaning protocol passes every audit without fail. Their team is discreet, professional, and impeccably trained. We\'ve never had a single incident in five years."',
      'review.4.name': 'Dr. James Park',
      'review.4.role': 'Director, Rheinland Family Clinic',

      /* FAQ Q&A */
      'faq.1.q': 'Are your cleaning products safe for kids and pets?',
      'faq.1.a': 'Absolutely. Every product in our kit is plant-based, pH-neutral, and certified by the EU Ecolabel. No bleach, no ammonia, no harsh solvents. Our crews are trained to keep all supplies sealed and out of reach during cleaning. We also offer fully hypoallergenic options on request for clients with sensitivities.',
      'faq.2.q': 'Do I need to be home during the cleaning?',
      'faq.2.a': 'Not at all. Most of our clients are at work during their scheduled cleaning. We use secure key-holding protocols, and every crew member is background-checked and bonded. If you prefer to be home, that\'s fine too — our crews are friendly, uniformed, and respectful of your space.',
      'faq.3.q': 'What happens if I\'m not satisfied with the result?',
      'faq.3.a': 'We back every clean with a 100% satisfaction guarantee. If anything is less than perfect, contact us within 24 hours and we\'ll return to re-clean the affected areas at no charge — no questions, no awkwardness. We\'ve issued this guarantee since 2010 and it\'s the foundation of our reputation.',
      'faq.4.q': 'How do you price your services?',
      'faq.4.a': 'We use flat-rate pricing based on square metres, room count, and the scope of work — never hourly. You\'ll receive a written quote within 60 seconds via our online form, and the price you see is the price you pay. No surprise add-ons, no tip pressure, no nickel-and-diming.',
      'faq.5.q': 'Can I schedule recurring cleanings?',
      'faq.5.a': 'Yes — weekly, bi-weekly, and monthly recurring cleanings are our most popular plans. Recurring clients enjoy locked-in rates, priority scheduling, and the same crew every visit whenever possible. You can pause, skip, or cancel any time with 48 hours\' notice, no contracts required.',
      'faq.6.q': 'Are you insured and bonded?',
      'faq.6.a': 'Yes, fully. BlitzBlank carries €2 million in general liability insurance, workers\' compensation for every employee, and a fidelity bond covering theft or damage. Certificates of insurance are available on request — we\'ll happily add your property as an additional insured for commercial engagements.',

      /* About preview badge */
      'about.badge': 'Average rating from 528 verified reviews',
    },

    de: {
      /* Logo */
      'logo.tag': 'Premium Reinigung',

      /* Nav */
      'nav.home': 'Start',
      'nav.about': 'Über uns',
      'nav.services': 'Leistungen',
      'nav.gallery': 'Galerie',
      'nav.reviews': 'Bewertungen',
      'nav.faq': 'FAQ',
      'nav.contact': 'Kontakt',
      'nav.cta': 'Angebot anfordern',
      'nav.menu': 'Menü umschalten',

      /* Hero */
      'hero.eyebrow': 'Vertraut von über 500 Düsseldorfer Kunden',
      'hero.title1': 'Makellose Räume,',
      'hero.title2': 'geschaffen mit',
      'hero.title3': 'liebevoller Sorgfalt.',
      'hero.subtitle': 'Wir sind BlitzBlank — eine boutique Reinigungsmanufaktur, die fünf-Sterne-Reinigung für Privatkunden und Unternehmen in ganz Düsseldorf liefert. Tadellose Ergebnisse, bei jedem Termin, schriftlich garantiert.',
      'hero.cta1': 'Kostenlose Besichtigung',
      'hero.cta2': 'Leistungen entdecken',
      'hero.scroll': 'Scrollen',
      'hero.stat1.num': '500',
      'hero.stat1.label': 'Zufriedene Kunden',
      'hero.stat2.num': '15',
      'hero.stat2.label': 'Jahre Erfahrung',
      'hero.stat3.num': '100',
      'hero.stat3.label': 'Zufriedenheit',

      /* Marquee */
      'strip.1': 'Ökologische Produkte',
      'strip.2': 'Geprüfte Mitarbeiter',
      'strip.3': '100% Zufriedenheitsgarantie',
      'strip.4': 'Same-Day Verfügbarkeit',
      'strip.5': 'Vollversichert',

      /* Stats section */
      'stats.eyebrow': 'In Zahlen',
      'stats.title': 'Eine Bilanz, der man vertrauen kann',
      'stats.subtitle': 'Fünfzehn Jahre. Tausende makellose Räume. Ein Ruf, der sich in jedem Detail verdient wird.',
      'stats.1.num': '500',
      'stats.1.label': 'Zufriedene Kunden',
      'stats.2.num': '12500',
      'stats.2.label': 'Reinigungen durchgeführt',
      'stats.3.num': '15',
      'stats.3.label': 'Jahre Erfahrung',
      'stats.4.num': '100',
      'stats.4.label': 'Zufriedenheit',

      /* Services section */
      'services.eyebrow': 'Was wir tun',
      'services.title': 'Reinigung für jeden Raum',
      'services.subtitle': 'Vom Boutique-Büro bis zur weitläufigen Halle — wir bringen jedem Auftrag dieselbe liebevolle Sorgfalt entgegen.',
      'services.viewAll': 'Alle 10 Leistungen ansehen',

      /* About preview */
      'about.eyebrow': 'Unsere Geschichte',
      'about.title': 'Eine Manufaktur, keine anonyme Kette.',
      'about.desc': '2010 in einer einzelnen Düsseldorfer Wohnung gegründet, ist BlitzBlank heute die leisest vertraute Reinigungsmanufaktur der Rhein-Ruhr-Region. Wir verzichten bewusst auf Franchising. Jedes Team wird intern eingestellt, geschult und ausgestattet — weil man Qualität nicht auslagern kann.',
      'about.f1.title': 'Geprüfte Teams',
      'about.f1.desc': 'Mit Hintergrundcheck, in Uniform und 80 Stunden geschult, bevor sie Ihren Raum betreten.',
      'about.f2.title': 'Ökologie zuerst',
      'about.f2.desc': 'Pflanzenbasierte, pH-neutrale Produkte — sicher für Kinder, Haustiere und den Planeten.',
      'about.f3.title': 'Echte Garantie',
      'about.f3.desc': 'Nicht zufrieden? Wir kommen innerhalb von 24 Stunden kostenlos zurück und machen es richtig.',
      'about.f4.title': 'Transparente Preise',
      'about.f4.desc': 'Festpreis-Angebot in 60 Sekunden online. Keine Überraschungen, keine Aufschläge.',
      'about.cta': 'Team kennenlernen',

      /* Gallery preview */
      'gallery.eyebrow': 'Aktuelle Arbeiten',
      'gallery.title': 'Räume, die wir verwandelt haben',
      'gallery.subtitle': 'Ein Einblick in die Räume, Büros und Locations, die wir kürzlich neu belebt haben.',
      'gallery.cta': 'Galerie ansehen',
      'gallery.cat1': 'Privat',
      'gallery.cat2': 'Gewerbe',
      'gallery.cat3': 'Tiefenreinigung',
      'gallery.cat4': 'Bodenpflege',
      'gallery.cat5': 'Gastronomie',

      /* Testimonials */
      'testimonials.eyebrow': 'Kundenstimmen',
      'testimonials.title': 'Von über 500 Düsseldorfer Kunden geliebt',
      'testimonials.subtitle': 'Einige der netten Worte, die wir im Laufe der Jahre gesammelt haben.',

      /* FAQ */
      'faq.eyebrow': 'Gut zu wissen',
      'faq.title': 'Häufig gestellte Fragen',
      'faq.subtitle': 'Alles, was Sie vor der Buchung wissen müssen. Noch Fragen? Schreiben Sie uns — wir freuen uns.',

      /* Contact CTA */
      'cta.eyebrow': 'Bereit, wenn Sie es sind',
      'cta.title': 'Lassen Sie uns Ihren Raum makellos machen.',
      'cta.desc': 'Persönliches Angebot in unter 60 Sekunden. Unverbindlich, ohne Druck — einfach ein ehrliches Gespräch über Ihren Raum.',
      'cta.btn1': 'Kostenloses Angebot',
      'cta.btn2': 'Anrufen',

      /* Footer */
      'footer.about': 'Boutique-Reinigungsmanufaktur für Düsseldorf und die Rhein-Ruhr-Region seit 2010. Liebevolle Sorgfalt, ökologische Produkte, echte Menschen, die sich kümmern.',
      'footer.quickLinks': 'Schnellzugriff',
      'footer.services': 'Leistungen',
      'footer.newsletter': 'Kontakt halten',
      'footer.newsletterDesc': 'Abonnieren Sie saisonale Reinigungstipps, exklusive Angebote und gelegentliche Inspiration. Kein Spam, versprochen.',
      'footer.placeholder': 'Ihre E-Mail-Adresse',
      'footer.subscribe': 'Abonnieren',
      'footer.rights': 'BlitzBlank. Alle Rechte vorbehalten.',
      'footer.privacy': 'Datenschutz',
      'footer.terms': 'AGB',
      'footer.cookies': 'Cookies',
      'footer.backToTop': 'Nach oben',

      /* Page hero */
      'page.about.eyebrow': 'Über uns',
      'page.about.title': 'Menschen, die Reinigung als Handwerk verstehen.',
      'page.about.subtitle': 'Eine kleine Manufaktur mit großen Ansprüchen. Jede Reinigung ist die Chance, Ihr Vertrauen zu verdienen — Detail für Detail.',
      'page.services.eyebrow': 'Was wir tun',
      'page.services.title': 'Zehn Leistungen. Eine Obsession.',
      'page.services.subtitle': 'Vom Boutique-Büro bis zur weitläufigen Halle — jede BlitzBlank-Reinigung folgt demselben kompromisslosen Standard.',
      'page.gallery.eyebrow': 'Portfolio',
      'page.gallery.title': 'Räume, die wir neu belebt haben.',
      'page.gallery.subtitle': 'Eine kuratierte Auswahl aktueller Projekte. Nach Kategorie filtern, Bild anklicken für Vollbild.',
      'page.contact.eyebrow': 'Sagen Sie Hallo',
      'page.contact.title': 'Lassen Sie uns Ihren Raum makellos machen.',
      'page.contact.subtitle': 'Sagen Sie uns, was Sie brauchen. Wir senden Ihnen innerhalb eines Werktages ein persönliches Angebot — ohne Drücker, ohne Verbindlichkeit.',

      /* Breadcrumb */
      'crumb.home': 'Start',

      /* About page */
      'about.mv.eyebrow': 'Was uns antreibt',
      'about.mv.title': 'Mission & Vision',
      'about.mv.subtitle': 'Zwei kurze Sätze, die jede unserer Entscheidungen prägen.',
      'about.mission.title': 'Unsere Mission',
      'about.mission.text': 'Den Standard von Reinigung in jedem Zuhause und Unternehmen, das wir berühren, zu heben — und zu beweisen, dass ein makelloser Raum kein Luxus ist, sondern die Grundlage für klareres Denken, ruhigeres Leben und produktiveres Arbeiten. Wir geben Menschen ihre Zeit zurück — und einen Raum, auf den sie stolz sind.',
      'about.vision.title': 'Unsere Vision',
      'about.vision.text': 'Die leisest vertraute Reinigungsmanufaktur Düsseldorfs zu werden — bekannt nicht für Marketinglautstärke, sondern für die Qualität unserer Teams, die Strenge unserer Ausbildung und die Beziehungen, die wir mit jedem Kunden aufbauen. Wir werden niemals franchisen. Wir werden niemals Kompromisse bei den Menschen eingehen, die die Arbeit machen.',

      /* Values */
      'about.values.eyebrow': 'Wofür wir stehen',
      'about.values.title': 'Fünf Werte, täglich gelebt',
      'about.values.subtitle': 'Das sind keine Plakate an der Wand. Es sind die Filter, durch die jede Entscheidung läuft.',
      'value.1.title': 'Integrität',
      'value.1.desc': 'Wir tun, was wir versprochen haben — genau dann, wenn wir es versprochen haben. Wenn etwas schiefgeht, sagen wir es. Und wir reparieren es, schnell, ohne Ausreden.',
      'value.2.title': 'Handwerk',
      'value.2.desc': 'Reinigung ist für uns keine Pflicht — sie ist Handwerk. Wir studieren Werkzeuge, Techniken und Chemie, damit Sie sich darum keine Gedanken machen müssen.',
      'value.3.title': 'Sorgfalt',
      'value.3.desc': 'Wir behandeln jeden Raum, als wäre es unser eigener. Ihr Zuhause, Ihr Büro, Ihr Restaurant — es ist uns wichtig, weil es Ihnen wichtig ist.',
      'value.4.title': 'Verlässlichkeit',
      'value.4.desc': 'Sie werden sich nie fragen müssen, ob wir kommen. Gleiches Team, gleiche Zeit, gleiches makelloses Ergebnis — Termin für Termin, Jahr für Jahr.',
      'value.5.title': 'Nachhaltigkeit',
      'value.5.desc': 'Pflanzenbasierte Produkte, nachfüllbare Flaschen, Elektrofahrzeuge. Wir sind so besessen von unserem ökologischen Fußabdruck wie von Ihren Staubflocken.',
      'value.6.title': 'Menschen zuerst',
      'value.6.desc': 'Unsere Teams sind Angestellte, keine Subunternehmer. Sie erhalten faire Löhne, Sozialleistungen und bleiben uns jahrelang erhalten. Sie sehen dieselben Gesichter.',

      /* Timeline */
      'about.timeline.eyebrow': 'Unser Weg',
      'about.timeline.title': 'Fünfzehn Jahre, eine Obsession',
      'about.timeline.subtitle': 'Von einer einzelnen Düsseldorfer Wohnung zur leisest vertrauten Reinigungsmanufaktur der Rhein-Ruhr-Region.',

      /* Team */
      'about.team.eyebrow': 'Die Menschen',
      'about.team.title': 'Lernen Sie das Führungsteam kennen',
      'about.team.subtitle': 'Die Crew hinter jedem makellosen Raum. Vor Ort — nicht am Schreibtisch.',

      /* Certs */
      'about.certs.eyebrow': 'Zertifikate',
      'about.certs.title': 'Zertifiziert, versichert, geprüft',
      'about.certs.subtitle': 'Das langweilige Papierkram, der Ihnen ruhigen Schlaf gibt. Haben wir alles erledigt.',

      /* Experience stats */
      'about.exp.eyebrow': 'In Zahlen',
      'about.exp.title': 'Fünfzehn Jahre, in Zahlen',
      'about.exp.1.label': 'Jahre im Geschäft',
      'about.exp.2.label': 'Teammitglieder',
      'about.exp.3.label': 'Reinigungen durchgeführt',
      'about.exp.4.label': 'Kundentreue',

      /* Services page */
      'services.catalog.eyebrow': 'Leistungskatalog',
      'services.catalog.title': 'Wählen Sie die passende Reinigung',
      'services.catalog.subtitle': 'Zehn spezialisierte Leistungen, erbracht von geschulten Teams mit dem richtigen Werkzeug, den richtigen Produkten und der richtigen Portion Besessenheit.',
      'services.process.eyebrow': 'So funktioniert\'s',
      'services.process.title': 'Vom Angebot zum makellosen Raum in vier Schritten',
      'services.process.step1.title': 'Angebot anfordern',
      'services.process.step1.desc': 'Füllen Sie unser 60-Sekunden-Formular aus. Sie erhalten einen Festpreis-Angebot schriftlich — kein Telefon-Tennis, keine Aufschläge.',
      'services.process.step2.title': 'Termin vereinbaren',
      'services.process.step2.desc': 'Wählen Sie Datum und Uhrzeit. Dauerkunden erhalten Prioritätsfenster und garantierte Preise.',
      'services.process.step3.title': 'Wir arbeiten',
      'services.process.step3.desc': 'Ihr uniformiertes Team kommt pünktlich, ausgerüstet und geschult. Sie erhalten eine Checkliste bei Fertigstellung.',
      'services.process.step4.title': 'Ankommen & entspannen',
      'services.process.step4.desc': 'Betreten Sie einen makellosen Raum. Etwas nicht in Ordnung? Wir kommen innerhalb von 24 Stunden kostenlos zurück. Garantiert.',
      'services.details.eyebrow': 'Leistungsdetails',
      'services.details.title': 'Ein genauerer Blick auf jede Leistung',
      'services.details.subtitle': 'Was enthalten ist, was Sie erwarten können, und warum unsere Teams anders sind.',
      'services.cta.title': 'Unsicher, welche Leistung passt?',
      'services.cta.desc': 'Erzählen Sie uns von Ihrem Raum — wir empfehlen die richtige Leistung, Teamgröße und Frequenz. Kostenlos, unverbindlich.',
      'services.cta.btn1': 'Mit Experten sprechen',
      'services.cta.btn2': 'Unsere Arbeit ansehen',
      'services.link': 'Details ansehen',
      'services.link.all': 'Mehr erfahren',
      'services.btn.quote': 'Angebot anfordern',

      /* Gallery page */
      'gallery.filters.all': 'Alle',
      'gallery.cta.title': 'Ihr Raum könnte der Nächste sein.',
      'gallery.cta.desc': 'Jedes Foto in dieser Galie begann mit einem Gespräch. Führen wir auch Ihres.',
      'gallery.cta.btn1': 'Projekt starten',
      'gallery.cta.btn2': 'Leistungen ansehen',

      /* Contact page */
      'contact.details.eyebrow': 'Kontaktdaten',
      'contact.details.title': 'Echte Menschen, schnelle Antworten.',
      'contact.details.desc': 'Lieber erst sprechen? Rufen Sie uns an, schreiben Sie uns oder besuchen Sie unsere Zentrale in Düsseldorf. Wir beantworten jede Nachricht selbst — keine Chatbots, keine Callcenter.',
      'contact.phone.label': 'Telefon',
      'contact.email.label': 'E-Mail',
      'contact.address.label': 'Studio-Zentrale',
      'contact.hours.label': 'Geschäftszeiten',
      'contact.hours.value': 'Mo–Sa: 07:00 – 20:00 Uhr',
      'contact.hours.value2': 'Sonntag: Geschlossen (nur Notfälle)',
      'contact.form.title': 'Kostenloses Angebot anfordern',
      'contact.form.desc': 'Felder mit * sind Pflichtfelder. Wir antworten innerhalb eines Werktages.',
      'contact.form.firstName': 'Vorname',
      'contact.form.lastName': 'Nachname',
      'contact.form.email': 'E-Mail',
      'contact.form.phone': 'Telefon',
      'contact.form.service': 'Gewünschte Leistung',
      'contact.form.service.choose': 'Bitte wählen…',
      'contact.form.message': 'Erzählen Sie uns von Ihrem Raum',
      'contact.form.message.ph': 'Quadratmeter, Frequenz, besondere Anforderungen…',
      'contact.form.consent': 'Ich stimme zu, bezüglich meiner Anfrage kontaktiert zu werden, und akzeptiere die',
      'contact.form.consent.privacy': 'Datenschutzerklärung',
      'contact.form.consent.cont': 'Ihre Daten geben wir niemals weiter.',
      'contact.form.submit': 'Anfrage senden',
      'contact.map.eyebrow': 'Finden Sie uns',
      'contact.map.title': 'Unsere Zentrale an der Königsallee',
      'contact.map.subtitle': 'Kommen Sie auf einen Kaffee vorbei oder vereinbaren Sie eine Tour durch das Studio, in dem jede Reinigung beginnt.',
      'contact.faq.title': 'Zuerst eine kurze Frage?',
      'contact.faq.desc': 'Stöbern Sie in unseren am häufigsten gestellten Fragen — Produkte, Termine, Garantien und mehr.',
      'contact.faq.btn1': 'Zum FAQ',
      'contact.faq.btn2': 'Leistungen ansehen',

      /* Form validation */
      'form.required': 'Dieses Feld ist erforderlich.',
      'form.email': 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      'form.phone': 'Bitte geben Sie eine gültige Telefonnummer ein.',
      'form.minLength': 'Bitte mindestens {n} Zeichen eingeben.',
      'form.checked': 'Bitte bestätigen Sie dieses Feld, um fortzufahren.',
      'form.errorMsg': 'Bitte korrigieren Sie die markierten Felder und versuchen Sie es erneut.',
      'form.successMsg': 'Vielen Dank! Ihre Nachricht wurde gesendet. Wir melden uns innerhalb eines Werktages.',
      'form.toast.success': 'Nachricht erfolgreich gesendet!',
      'form.toast.invalid': 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      'form.toast.subscribed': 'Sie sind dabei! Herzlich willkommen.',

      /* 404 */
      'error.code': '404',
      'error.title': 'Diese Seite ist uns entwischt.',
      'error.desc': 'Selbst unsere Teams können eine fehlende Seite nicht wegwischen. Der Link ist vielleicht kaputt oder die Seite wurde verschoben. Zurück zu einem makellosen Ort.',
      'error.btn1': 'Zur Startseite',
      'error.btn2': 'Leistungen ansehen',
      'error.btn3': 'Kontakt',
      'error.suggest': 'Oder probieren Sie einen davon',
      'error.suggest.about': 'Über uns',
      'error.suggest.gallery': 'Galerie',
      'error.suggest.reviews': 'Bewertungen',
      'error.suggest.faq': 'FAQ',

      /* Service titles & descriptions */
      'srv.office.title': 'Büroreinigung',
      'srv.office.desc': 'Tages-, wöchentliche oder nächtliche Büroreinigung — gehalten im Rhythmus Ihres Unternehmens. Ihr Team bleibt fokussiert, Ihre Kunden beeindruckt.',
      'srv.house.title': 'Privatreinigung',
      'srv.house.desc': 'Wochenenden zurückgewinnen. Unsere wiederkehrende Privatreinigung hält jede Ecke Ihres Zuhauses konsequent makellos.',
      'srv.window.title': 'Fensterreinigung',
      'srv.window.desc': 'Streifenfreie, funkelnde Fenster innen wie außen — inklusive schwer erreichbarer Scheiben und Oberlichter. Technik mit reinem Wasser.',
      'srv.industrial.title': 'Industriereinigung',
      'srv.industrial.desc': 'Lagerhallen, Fabriken und Produktionsflächen nach kommerziellem Standard. Spezialausrüstung, geschulte Teams.',
      'srv.deep.title': 'Tiefenreinigung',
      'srv.deep.desc': 'Ein Komplett-Reset für Räume, die intensive Pflege brauchen. Sockelleisten, Fugen, hinter Geräten, Leuchten — alles.',
      'srv.moveout.title': 'Auszugsreinigung',
      'srv.moveout.desc': 'Vom Vermieter akzeptierte, kautionsschonende Reinigung für ausziehende Mieter. Inklusive Geräten und Schränken.',
      'srv.carpet.title': 'Teppichreinigung',
      'srv.carpet.desc': 'Heißwasserextraktion löst Jahre eingeschmutzter Partikel und Allergene. Flecken verschwinden, Fasern erstrahlen.',
      'srv.restaurant.title': 'Gastronomiereinigung',
      'srv.restaurant.desc': 'Reinigung nach Öffnungszeiten für Küche, Gastraum und Sanitäranlagen — jede Gesundheitsinspektion bestanden. Dunstabzug inklusive.',
      'srv.medical.title': 'Medizinreinigung',
      'srv.medical.desc': 'Praxen, Zahnärzte, Notfallambulanzen. Krankenhausstandard, geschulte Teams, immer prüfbereit.',
      'srv.construction.title': 'Baureinigung',
      'srv.construction.desc': 'Reinigung nach Bau und Renovierung. Staubabsaugung, Schuttentsorgung, Oberflächendetail — bezugsfertig.',

      /* Gallery titles */
      'gallery.title1': 'Moderne Küche',
      'gallery.title2': 'Großraumbüro',
      'gallery.title3': 'Sonnendurchflutetes Wohnzimmer',
      'gallery.title4': 'Business-Suite',
      'gallery.title5': 'Wellness-Bad',
      'gallery.title6': 'Konferenzraum',
      'gallery.title7': 'Parkett-Auffrischung',
      'gallery.title8': 'Restaurant-Gastraum',

      /* Reviews */
      'review.1.text': '„BlitzBlank reinigt seit zwei Jahren unser 800 m² großes Büro. Keine einzige Beschwerde — nur Komplimente von Team und Kunden. Die Crews sind pünktlich, professionell und bis ins Detail besessen. Sie haben Staub gefunden, von dem ich nichts wusste."',
      'review.1.name': 'Sarah Chen',
      'review.1.role': 'COO, Northwind Studio',
      'review.2.text': '„Wir haben drei Reinigungsfirmen ausprobiert, bevor wir BlitzBlank fanden. Der Unterschied ist wie Tag und Nacht. Sie kümmern sich wirklich. Unser Zuhause war nie besser umsorgt — und die ökologischen Produkte geben uns mit zwei Kleinkindern Ruhe."',
      'review.2.name': 'Marcus Reed',
      'review.2.role': 'Privatkunde, Oberkassel',
      'review.3.text': '„Ein Restaurant zu führen bedeutet: Sauberkeit ist nicht verhandelbar. Das After-Hours-Team von BlitzBlank hält Küche und Gastraum jede Nacht makellos. Der Gesundheitsinspektor sagte, es sei die sauberste Küche seit einem Jahrzehnt."',
      'review.3.name': 'Elena Vasquez',
      'review.3.role': 'Inhaberin, Maison Verde',
      'review.4.text': '„Unsere Arztpraxis hat höchste Hygieneanforderungen. Das medizinische Reinigungsprotokoll von BlitzBlank besteht jede Prüfung beim ersten Versuch. Das Team ist diskret, professionell und tadellos geschult. In fünf Jahren kein einziger Vorfall."',
      'review.4.name': 'Dr. James Park',
      'review.4.role': 'Leitender Arzt, Rheinland Familienpraxis',

      /* FAQ Q&A */
      'faq.1.q': 'Sind Ihre Reinigungsmittel sicher für Kinder und Haustiere?',
      'faq.1.a': 'Absolut. Jedes Produkt in unserem Sortiment ist pflanzenbasiert, pH-neutral und nach EU-Ecolabel zertifiziert. Kein Chlor, kein Ammoniak, keine aggressiven Lösungsmittel. Unsere Teams werden geschult, alle Mittel verschlossen und außer Reichweite zu halten. Auf Wunsch bieten wir auch voll hypoallergene Optionen.',
      'faq.2.q': 'Muss ich während der Reinigung zu Hause sein?',
      'faq.2.a': 'Überhaupt nicht. Die meisten unserer Kunden sind während der Reinigung bei der Arbeit. Wir nutzen sichere Schlüsselhaltungs-Protokolle, und jedes Teammitglied ist geprüft und bonitiert. Wenn Sie lieber anwesend sind — kein Problem. Unsere Teams sind freundlich, uniformiert und respektvoll.',
      'faq.3.q': 'Was passiert, wenn ich mit dem Ergebnis nicht zufrieden bin?',
      'faq.3.a': 'Jede Reinigung wird mit einer 100%-Zufriedenheitsgarantie backing. Wenn etwas nicht perfekt ist, kontaktieren Sie uns innerhalb von 24 Stunden — wir kommen kostenlos zurück und reinigen die betroffenen Bereiche nach. Ohne Fragen, ohne Verlegenheit. Diese Garantie gibt es seit 2010.',
      'faq.4.q': 'Wie werden Ihre Preise berechnet?',
      'faq.4.a': 'Wir arbeiten mit Festpreisen auf Basis von Quadratmetern, Raumzahl und Umfang — nie nach Stunden. Sie erhalten innerhalb von 60 Sekunden ein schriftliches Angebot über unser Online-Formular. Der Preis, den Sie sehen, ist der Preis, den Sie zahlen. Keine Aufschläge, kein Trinkgeldzwang.',
      'faq.5.q': 'Kann ich wiederkehrende Reinigungen vereinbaren?',
      'faq.5.a': 'Ja — wöchentliche, vierzehntägige und monatliche Reinigungen sind unsere beliebtesten Pläne. Dauerkunden erhalten garantierte Preise, Prioritätsfenster und möglichst immer dasselbe Team. Sie können jederzeit mit 48 Stunden Vorankündigung pausieren, aussetzen oder stornieren — ohne Vertrag.',
      'faq.6.q': 'Sind Sie versichert und bonitiert?',
      'faq.6.a': 'Ja, vollständig. BlitzBlank verfügt über 2 Mio. € Betriebshaftpflichtversicherung, Sozialversicherung für alle Mitarbeiter und eine Kautionsversicherung bei Diebstahl oder Schäden. Versicherungsscheine erhalten Sie auf Anfrage — wir nehmen Ihr Objekt gerne als zusätzlichen Versicherungsnehmer auf.',

      /* About preview badge */
      'about.badge': 'Durchschnittliche Bewertung aus 528 verifizierten Rezensionen',
    },
  };

  function getLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
    // Detect from browser
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return SUPPORTED.includes(browser) ? browser : 'en';
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = 'en';
    current = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    applyTranslations();
    updateSwitcher();
  }

  function t(key) {
    return (dict[current] && dict[current][key]) || dict.en[key] || key;
  }

  function applyTranslations() {
    // Text content
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      el.textContent = val;
    });
    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(key));
    });
    // Aria-labels
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', t(key));
    });
  }

  function updateSwitcher() {
    document.querySelectorAll('.lang-switch__btn').forEach((btn) => {
      const lang = btn.dataset.lang;
      btn.classList.toggle('is-active', lang === current);
      btn.setAttribute('aria-pressed', lang === current);
    });
  }

  function initSwitcher() {
    document.querySelectorAll('.lang-switch__btn').forEach((btn) => {
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
  }

  function init() {
    current = getLang();
    document.documentElement.lang = current;
    applyTranslations();
    initSwitcher();
    updateSwitcher();
  }

  return { init, setLang, getLang, t, applyTranslations };
})();

window.I18n = I18n;
