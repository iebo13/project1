# BlitzBlank — Premium Reinigung Düsseldorf

A production-quality, multi-page marketing website for a fictional boutique cleaning company based in Düsseldorf. Built with **pure HTML5, CSS3, and vanilla JavaScript (ES6+)** — no frameworks, no build tools, no dependencies. Just open `index.html` in any modern browser.

---

## ✨ Highlights

- **Bilingual EN/DE** — full translation system with language switcher, persisted in `localStorage`, auto-detected from browser language
- **Enhanced glassmorphism** — frosted glass navbar, cards, buttons, hero stats panel, with strong `backdrop-filter` blur throughout
- **Awwwards-grade design** — soft shadows, large whitespace, fluid typography via `clamp()`
- **6 pages** — Home, About, Services, Gallery, Contact, 404
- **10 services** — each with its own dedicated detail section
- **Premium interactions** — scroll reveal, parallax hero, magnetic buttons, ripple effect, tilt cards, animated counters, smooth slider, lightbox, accordion FAQ
- **Fully responsive** — fluid layout from 320px to 4K via CSS Grid + Flexbox
- **Accessible** — ARIA labels, keyboard navigation, focus-visible states, skip-link, reduced-motion support, high-contrast support
- **SEO-ready** — semantic HTML, meta tags, Open Graph, Twitter Cards, JSON-LD structured data
- **Performance-first** — lazy-loaded images, IntersectionObserver-driven animations, `requestAnimationFrame` parallax, no layout thrashing
- **Zero dependencies** — only Google Fonts loaded externally

---

## 📁 File Structure

```
cleaning-company/
├── index.html              # Home page (hero, stats, services, gallery, testimonials, FAQ, CTA)
├── about.html              # Mission, vision, values, timeline, team, certificates
├── services.html           # All 10 services + detail sections + process
├── gallery.html            # Filterable masonry grid + lightbox
├── contact.html            # Contact form with validation + map placeholder
├── 404.html                # Custom error page
├── README.md               # This file
│
├── css/
│   ├── variables.css       # Design tokens (colors, typography, spacing, shadows)
│   ├── animations.css      # Keyframes, scroll-reveal, decorative animations
│   ├── components.css      # Reusable UI components (buttons, cards, slider, lightbox, FAQ)
│   ├── style.css           # Base reset + main layout + section styles
│   └── responsive.css      # Breakpoints: 1200 / 1024 / 768 / 540 / 380 + print
│
├── js/
│   ├── app.js              # Entry point — orchestrates all modules
│   ├── i18n.js             # Bilingual EN/DE translation system
│   ├── animations.js       # Scroll reveal, parallax, ripple, magnetic, tilt
│   ├── navigation.js       # Sticky navbar, mobile menu, preloader, back-to-top
│   ├── counter.js          # Animated stat counters (IntersectionObserver + rAF)
│   ├── slider.js           # Testimonials slider with autoplay + swipe
│   ├── gallery.js          # Filtering + lightbox + lazy loading
│   ├── faq.js              # Accessible accordion
│   └── contact.js          # Form validation + submission (mock) + toast
│
└── assets/                 # Reserved for local images, icons, fonts
    ├── images/
    ├── icons/
    └── fonts/
```

---

## 🎨 Design System

### Color Palette
| Token        | Hex       | Usage                              |
|--------------|-----------|------------------------------------|
| Primary      | `#0F172A` | Dark text, dark sections, navbar   |
| Secondary    | `#2563EB` | Primary accent, CTAs, gradients    |
| Accent       | `#06B6D4` | Highlights, gradient partner       |
| Success      | `#10B981` | Checkmarks, success states         |
| Background   | `#F8FAFC` | Page background                    |
| Cards        | `#FFFFFF` | Card surfaces                      |
| Text         | `#0F172A` | Body text                          |
| Muted        | `#64748B` | Secondary text                     |
| Borders      | `#E2E8F0` | Card borders, dividers             |

### Typography
- **Family:** Inter (Google Fonts), weights 300–800
- **Fluid scale:** `clamp()`-based, scales from 12px → 88px smoothly across viewports

### Spacing & Radius
- Spacing scale: `--space-1` (0.25rem) → `--space-40` (10rem)
- Radius scale: `--radius-sm` (8px) → `--radius-2xl` (44px) + `--radius-pill`

---

## 🚀 Usage

### Option 1: Just open it
```bash
# Double-click index.html, or:
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Option 2: Serve locally (optional, for hot-reload workflow)
```bash
# Python 3
python -m http.server 8000

# Node.js (with npx)
npx serve .
```
Then visit `http://localhost:8000`.

> **Note:** The project deliberately uses the **global namespace pattern** (`window.Animations`, `window.Navigation`, etc.) rather than ES6 module imports, so it works via `file://` protocol without a local server. Each JS file is loaded via a regular `<script defer>` tag.

---

## ⚙️ Customisation

### Change brand name
Search-and-replace `Lumière` and `Lumière Clean` across all `.html` files. Update the logo SVG path in the navbar and footer of each page.

### Change color palette
Edit `css/variables.css` → `:root` block. All components reference CSS variables, so changes propagate everywhere.

### Add a service
1. Add a new `.service-card` to the grid in `services.html` (and `index.html` if desired)
2. Add a corresponding `.service-detail` section lower on `services.html`
3. Add the service to the footer "Services" column links

### Add a gallery image
Add a new `.gallery-card` to the grid in `gallery.html`. Set `data-category` to one of the filter values (`residential`, `commercial`, `industrial`, `deep`, `hospitality`, `medical`). Set `data-full` to a higher-resolution URL for the lightbox.

### Update contact details
Search-and-replace across all `.html` files:
- Phone: `+49 211 934 567 89` and `tel:+4921193456789`
- Email: `hallo@blitzblank.de`
- Address: `Königsallee 42, 40212 Düsseldorf`

### Add or edit translations
Open `js/i18n.js`. Two top-level objects (`en` and `de`) hold all translated strings, keyed by `data-i18n` attribute values. Add a new key to both objects, then add `data-i18n="your.new.key"` to any HTML element to make it translatable. Use `data-i18n-placeholder` for input placeholders and `data-i18n-aria` for ARIA labels.

### Wire the contact form to a backend
Open `js/contact.js` and replace the mock `await new Promise(...)` block in the submit handler with a real `fetch()` call to your endpoint.

---

## ♿ Accessibility

- **Skip link** to main content on every page
- **Keyboard navigation** — all interactive elements reachable via Tab, with visible focus states
- **ARIA labels** on icon-only buttons, sliders, lightbox, accordion, breadcrumbs
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` disables animations
- **High contrast** — `@media (prefers-contrast: high)` strengthens borders and muted text
- **Form validation** — `aria-live="polite"` on error messages, focus moves to first error on submit
- **Color contrast** — text/background pairs meet WCAG AA

---

## 🖥️ Browser Support

Tested in the latest two versions of:
- Chrome / Edge (Chromium)
- Firefox
- Safari (desktop + iOS)

Uses progressive enhancement: IntersectionObserver, `backdrop-filter`, CSS `clamp()`, and `aspect-ratio` all have fallbacks where applicable.

---

## 📦 What's Inside the Box

### Animations
- Scroll-reveal with `IntersectionObserver` (stagger support via `data-stagger`)
- Hero parallax via `requestAnimationFrame`
- Button ripple effect (delegated click listener)
- Magnetic hover on `[data-magnetic]` elements
- 3D tilt on `[data-tilt]` cards (mouse / pointer only — disabled on touch)
- Animated counters with `easeOutExpo` easing
- Marquee strip with pause-on-hover
- Floating decorative blobs

### Components
- Glassmorphic sticky navbar with scroll state + mobile drawer
- Hero with background image, gradient overlay, staggered text reveal
- Stat cards with animated counters
- Service cards with hover lift, gradient top-bar, icon rotation
- Testimonial slider with autoplay, swipe, keyboard nav, dots, prev/next
- Masonry gallery + filterable grid + lightbox with keyboard nav
- FAQ accordion (single-open, smooth height animation, ARIA-compliant)
- Contact form with live validation, loading state, toast feedback
- Footer with 4 columns + newsletter signup
- Back-to-top button + preloader

---

## 📝 License

This is a demonstration project. All Unsplash images are royalty-free under the Unsplash License. Replace branding, copy, and imagery with your own before deploying.

---

## 🛠️ Built With

- HTML5 (semantic landmarks, picture/source ready)
- CSS3 (custom properties, Grid, Flexbox, `clamp()`, `backdrop-filter`, scroll-snap-ready)
- Vanilla JavaScript ES6+ (classes, IIFE modules, IntersectionObserver, requestAnimationFrame)
- Google Fonts — Inter

No frameworks. No build tools. No npm. Just files.

---

**Crafted with obsessive attention to detail — exactly how we'd clean your space.**
