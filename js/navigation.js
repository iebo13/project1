/* =========================================================
   NAVIGATION.JS
   Sticky navbar, mobile menu, back-to-top, preloader
   ========================================================= */

const Navigation = (() => {
  // Widest viewport that still shows the drawer instead of the desktop nav row.
  // Mirrors the `max-width: 1279px` nav block in css/responsive.css.
  const NAV_DRAWER_MAX = 1279;

  let navbar = null;
  let navToggle = null;
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

  /* ---------- Mobile menu (native <dialog> drawer) ----------
     showModal() supplies the focus trap, ESC handling, focus restore and
     ::backdrop. This code only adds the slide-out animation (a dialog
     disappears instantly on close(), so exit motion needs a class + delay)
     and keeps the toggle's aria-expanded in sync. */
  function initMobile() {
    navToggle = document.querySelector('.nav-toggle');
    const drawer = document.getElementById('navDrawer');
    if (!navToggle || !drawer || typeof drawer.showModal !== 'function') return;

    // Matches --t-slow, the drawer's translate transition in components.css.
    const EXIT_MS = 480;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let closeTimer = null;

    const open = () => {
      if (drawer.open) return;
      drawer.showModal();
      navToggle.classList.add('is-active');
      navToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };

    const finishClose = () => {
      drawer.classList.remove('is-closing');
      drawer.close();
    };

    const close = () => {
      if (!drawer.open || drawer.classList.contains('is-closing')) return;
      // Unlock scrolling before the exit animation, not after: a tapped
      // same-page anchor link (/#faq) must be able to scroll immediately.
      document.body.style.overflow = '';
      if (reduceMotion.matches) {
        finishClose();
        return;
      }
      drawer.classList.add('is-closing');
      closeTimer = setTimeout(finishClose, EXIT_MS);
    };

    // Single cleanup point — runs on every path that closes the dialog.
    drawer.addEventListener('close', () => {
      clearTimeout(closeTimer);
      drawer.classList.remove('is-closing');
      navToggle.classList.remove('is-active');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });

    // ESC: intercept the native instant close and play the exit animation.
    drawer.addEventListener('cancel', (e) => {
      e.preventDefault();
      close();
    });

    navToggle.addEventListener('click', () => {
      drawer.open ? close() : open();
    });

    drawer.querySelector('.nav-drawer__close').addEventListener('click', close);

    // Link taps close instantly, not animated: navigation is under way, and
    // for same-page anchors (/#faq) a close() that lands mid-scroll restores
    // focus and cancels the browser's smooth scroll to the target.
    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        clearTimeout(closeTimer);
        document.body.style.overflow = '';
        finishClose();
      });
    });

    // A click on ::backdrop targets the dialog element itself with
    // coordinates outside its box.
    drawer.addEventListener('click', (e) => {
      if (e.target !== drawer) return;
      const r = drawer.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) close();
    });

    // Reset on resize to desktop. Must match the drawer breakpoint in
    // responsive.css — if this is the larger of the two, the drawer stays
    // modal over a page whose header has already grown its desktop nav row.
    window.addEventListener('resize', () => {
      if (window.innerWidth > NAV_DRAWER_MAX && drawer.open) {
        clearTimeout(closeTimer);
        finishClose();
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
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    // base.njk's inline script already hid this instantly, before paint, if
    // a prior page in this session set the flag below — just clean up.
    if (preloader.classList.contains('is-hidden-instant')) {
      preloader.remove();
      return;
    }

    sessionStorage.setItem('bb-preloader-shown', '1');

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
