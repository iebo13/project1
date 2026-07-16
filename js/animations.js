/* =========================================================
   ANIMATIONS.JS
   Scroll-reveal, parallax, counters init, micro-interactions
   ========================================================= */

const Animations = (() => {
  const reveals = [];
  let observer = null;

  /* ---------- Scroll reveal via IntersectionObserver ---------- */
  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = parseInt(entry.target.dataset.revealDelay || 0, 10);
            setTimeout(() => entry.target.classList.add('is-visible'), delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    els.forEach((el) => {
      reveals.push(el);
      observer.observe(el);
    });
  }

  /* ---------- Parallax for hero background ---------- */
  function initParallax() {
    const heroBg = document.querySelector('.hero__bg img');
    if (!heroBg) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let ticking = false;
    let lastY = 0;

    const onScroll = () => {
      lastY = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Only parallax while hero is in viewport
          if (lastY < window.innerHeight) {
            heroBg.style.transform = `translateY(${lastY * 0.35}px) scale(1.05)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Stagger reveal for grids ---------- */
  function initStagger() {
    const groups = document.querySelectorAll('[data-stagger]');
    if (!groups.length) return;

    groups.forEach((group) => {
      const children = group.children;
      const step = parseInt(group.dataset.stagger || 100, 10);
      Array.from(children).forEach((child, i) => {
        child.setAttribute('data-reveal', 'up-soft');
        child.style.setProperty('--reveal-delay', `${i * step}ms`);
      });
    });
  }

  /* ---------- Button ripple effect ---------- */
  function initRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  /* ---------- Magnetic hover on primary buttons ---------- */
  function initMagnetic() {
    const magnetics = document.querySelectorAll('[data-magnetic]');
    if (!magnetics.length) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    magnetics.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* ---------- Animated progress bars (reviews page) ---------- */
  function initProgressBars() {
    const bars = document.querySelectorAll('.review-bar__fill');
    if (!bars.length) return;

    if (!('IntersectionObserver' in window)) {
      bars.forEach((b) => b.classList.add('is-animated'));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-animated');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    bars.forEach((b) => obs.observe(b));
  }

  /* ---------- Tilt effect for premium cards ---------- */
  function initTilt() {
    const tilts = document.querySelectorAll('[data-tilt]');
    if (!tilts.length) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || window.matchMedia('(hover: none)').matches) return;

    tilts.forEach((card) => {
      card.style.transition = 'transform 200ms ease-out';
      card.style.transformStyle = 'preserve-3d';

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(1000px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translateY(-6px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ---------- Smooth anchor scroll (compensate for navbar) ---------- */
  function initSmoothAnchors() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const navbarH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height-scrolled')) || 68;
      const y = target.getBoundingClientRect().top + window.scrollY - navbarH - 16;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  }

  /* ---------- Active nav link based on URL ---------- */
  function initActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === path || (path === '' && href === 'index.html')) {
        link.classList.add('is-active');
      }
    });
  }

  function init() {
    initStagger();
    initReveal();
    initParallax();
    initRipple();
    initMagnetic();
    initProgressBars();
    initTilt();
    initSmoothAnchors();
    initActiveNav();
  }

  return { init, initReveal };
})();

window.Animations = Animations;
