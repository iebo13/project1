/* =========================================================
   NAVIGATION.JS
   Sticky navbar, mobile menu, back-to-top, preloader
   ========================================================= */

const Navigation = (() => {
  // Widest viewport that still shows the drawer instead of the desktop nav row.
  // Mirrors the `max-width: 1279px` nav block in css/responsive.css.
  const NAV_DRAWER_MAX = 1279;

  let navbar = null;
  let navMenu = null;
  let navToggle = null;
  let backdrop = null;
  let backToTop = null;

  /* ---------- Sticky navbar scroll state ---------- */
  function initSticky() {
    navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.scrollY > 40;
          navbar.classList.toggle('is-scrolled', scrolled);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile menu ---------- */
  function initMobile() {
    navToggle = document.querySelector('.nav-toggle');
    navMenu = document.querySelector('.nav-menu');
    if (!navToggle || !navMenu) return;

    // Create backdrop dynamically
    backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    document.body.appendChild(backdrop);

    const open = () => {
      navMenu.classList.add('is-open');
      navToggle.classList.add('is-active');
      backdrop.classList.add('is-visible');
      navToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      navMenu.classList.remove('is-open');
      navToggle.classList.remove('is-active');
      backdrop.classList.remove('is-visible');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    navToggle.addEventListener('click', () => {
      navMenu.classList.contains('is-open') ? close() : open();
    });

    backdrop.addEventListener('click', close);

    // Close on nav link click
    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', close);
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
        close();
        navToggle.focus();
      }
    });

    // Reset on resize to desktop. Must match the drawer breakpoint in
    // responsive.css — if this is the larger of the two, the drawer stays open
    // over a nav that CSS has already put back into its desktop row.
    window.addEventListener('resize', () => {
      if (window.innerWidth > NAV_DRAWER_MAX && navMenu.classList.contains('is-open')) {
        close();
      }
    });
  }

  /* ---------- Back to top button ---------- */
  function initBackToTop() {
    backToTop = document.querySelector('.back-to-top');
    if (!backToTop) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          backToTop.classList.toggle('is-visible', window.scrollY > 600);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Preloader ---------- */
  function initPreloader() {
    const preloader = document.querySelector('.preloader');
    if (!preloader) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        preloader.classList.add('is-hidden');
        setTimeout(() => preloader.remove(), 700);
      }, 400);
    });

    // Safety: hide after 3s no matter what
    setTimeout(() => {
      if (preloader && !preloader.classList.contains('is-hidden')) {
        preloader.classList.add('is-hidden');
      }
    }, 3000);
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    const el = document.querySelector('[data-year]');
    if (el) el.textContent = new Date().getFullYear();
  }

  function init() {
    initSticky();
    initMobile();
    initBackToTop();
    initPreloader();
    initYear();
  }

  return { init };
})();

window.Navigation = Navigation;
