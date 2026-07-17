# Legal pages (Impressum / Datenschutz) + FormSubmit wiring — design

**Date:** 2026-07-17
**Status:** approved for implementation (session ran autonomously; the user asked
directly for implementation, so the design was decided from repo conventions
rather than interactive Q&A)

## Goal

Close two of the launch blockers named in README.md:

1. There is no Impressum or Datenschutz page — the consent checkbox and the
   footer "Privacy" link both point to `href="#"`. For a site operating in
   Germany an Impressum is a legal requirement (§ 5 DDG).
2. The contact form is a mock. The user asked: can we use FormSubmit
   (formsubmit.co)? Answer: yes — it is exactly the right shape for a static
   site (no backend, POST to their endpoint, they relay by email). This spec
   wires it in behind a config switch.

## Approaches considered

- **Legal prose in a new `legal.js` data file** (per-language section arrays,
  template loops). Rejected: nothing else works this way — pages here are
  explicit markup with per-string `t(d)` lookups, and `dict.js` is the one
  place where EN/DE parity is *enforced* (`t` throws at build time on a
  missing key). A data file would reintroduce silent-fallback risk.
- **Markdown content files per language.** Rejected: would be the only
  Markdown in the project and bypasses the dict parity guarantee.
- **Chosen: two ordinary paginated `.njk` pages, all strings in `dict.js`,**
  identical in structure to `contact.njk` (front-matter pagination over
  `langs.codes`, `permalinkFor`, `meta.js` entries, page-hero + sections).

For the form: FormSubmit's **AJAX endpoint** (`https://formsubmit.co/ajax/…`)
rather than a plain `action=` POST, because the current UX (in-page success
message + toast, no redirect) is already JS-driven and worth keeping. A plain
POST would bounce the visitor to FormSubmit's thank-you page or require a
`_next` redirect URL per language.

## Legal pages

New page keys, following the existing localized-slug table:

| key | de | en | h1 (de / en) |
|---|---|---|---|
| `imprint` | `impressum` | `imprint` | Impressum / Legal Notice |
| `privacy` | `datenschutz` | `privacy` | Datenschutzerklärung / Privacy Policy |

- `src/impressum.njk`, `src/datenschutz.njk`: same skeleton as other interior
  pages — `page-hero` (dark, `navbarSolid: true`), breadcrumb, then a single
  narrow prose column (`.legal` styles added to `css/style.css`; new CSS goes
  at the end of the file, no stylesheet reordering).
- `langs.js` slugs + `meta.js` titles/descriptions + `dict.js` strings
  (~70 new keys, both languages — the build throws if one side is missing).
- Not added to the main navbar (`site.nav`); linked from the footer legal row,
  as is conventional.

### Impressum content (§ 5 DDG structure, fictional data)

Angaben gemäß § 5 DDG (BlitzBlank, Inhaberin Amélie Laurent — the founder
from the About page — Königsallee 42, 40212 Düsseldorf); Kontakt (phone/email
from `site.js`); USt-IdNr. placeholder; Verantwortlich nach § 18 Abs. 2 MStV;
Verbraucherstreitbeilegung (§ 36 VSBG: not obliged, not willing); Haftung für
Inhalte; Haftung für Links; Urheberrecht. No EU-ODR link — the ODR platform
was shut down in July 2025.

Both legal pages end with a visible note that BlitzBlank is a fictional
demonstration project and the details are placeholders. The site must not
present fabricated legal identity data as real.

### Datenschutz content (GDPR structure, matches what the site actually does)

Verantwortlicher; Hosting auf GitHub Pages (server logs / IP addresses,
GitHub Inc., US transfer); **Google Fonts loaded remotely** (true today —
`base.njk` links fonts.googleapis.com; self-hosting is a separate task);
**Unsplash hot-linked images** (true today); Kontaktformular via FormSubmit
(what is transmitted, consent, legal bases Art. 6 Abs. 1 lit. a/b DSGVO) and
contact by email/phone; storage duration; data-subject rights incl.
complaint to a supervisory authority; no cookies, no tracking, no analytics
(true today). Demo note as above.

## Footer + consent link

- Footer legal row currently has three dead `#` links: Privacy / Terms /
  Cookies. Replace with two real links: **Impressum** and **Datenschutz**
  (`footer.imprint` new; `footer.privacy` reused). `footer.terms` and
  `footer.cookies` keys are removed with their links — there are no AGB and
  the site sets no cookies, so both links promised pages that can't exist.
- The consent checkbox label in `contact.njk` links to the privacy page
  (`target="_blank" rel="noopener"` so half-filled form state isn't lost).

## FormSubmit wiring

- `site.js` gains `formEndpoint: process.env.FORM_ENDPOINT || ''` — either an
  email address or (better, after activation) the random alias FormSubmit
  issues, so the raw address never appears in the published HTML.
- `contact.njk`: when `site.formEndpoint` is set, the form carries
  `data-endpoint="https://formsubmit.co/ajax/<endpoint>"`; always carries a
  translated `data-subject`. A hidden `_honey` honeypot input is added
  (FormSubmit silently discards submissions where it is filled).
- `js/contact.js` submit handler: if `data-endpoint` is present, POST the
  form fields as JSON (`Accept: application/json`); non-OK response → new
  error message + error toast, **form values preserved**, button restored.
  If no endpoint is configured, the existing 1.4 s mock stays — the demo and
  `tests/contact-form.spec.js` keep working with zero config.
- New dict keys: `form.errorMsg`, `form.toast.error`, `form.subject`.
- **Not done by code:** FormSubmit activation. The first real submission
  triggers a confirmation email to the target address; until it is clicked,
  nothing is delivered. Documented in README. `hallo@blitzblank.de` is
  fictional and can never be activated — a real deployment must set
  `FORM_ENDPOINT` to a reachable address.

## Testing

- `tests/i18n.spec.js`: add the four new paths to `DE_PAGES` / `EN_PAGES`
  (German-leak scan + `lang` attribute come free).
- `tests/headings.spec.js`: add both DE legal pages to `darkHeroPages` —
  same dark page-hero, same 4.5:1 contrast requirement.
- New `tests/legal.spec.js`: h1 per page per language; footer links resolve
  to the legal pages; consent label links to the privacy page; both pages
  reachable from `/kontakt/` footer (no dead `#` left in the legal row).
- `.github/workflows/deploy.yml`: add `tests/legal.spec.js` to the functional
  list so it gates deploys.
- Visual suite: every existing baseline includes the footer, so all 12 will
  diff. Verify the diffs are footer-row-only **before** regenerating, then
  regenerate deliberately and add `impressum` + `datenschutz` to the visual
  page list (4 new baselines).

## Out of scope

Self-hosting Google Fonts / local images (Part 2), an AGB page, cookie
consent tooling (nothing to consent to), server-side redirects.
