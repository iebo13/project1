/* =========================================================
   COUNTER.JS
   Animated stat counters using IntersectionObserver + rAF
   ========================================================= */

const Counter = (() => {
  const DURATION = 2200;
  let started = new WeakSet();

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function animate(el) {
    if (started.has(el)) return;
    started.add(el);

    const target = parseFloat(el.dataset.counter || '0');
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const decimals = parseInt(el.dataset.decimals || 0, 10);
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / DURATION, 1);
      const eased = easeOutExpo(progress);
      const value = target * eased;
      el.textContent = prefix + formatNumber(value, decimals) + suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = prefix + formatNumber(target, decimals) + suffix;
      }
    };

    requestAnimationFrame(tick);
  }

  function formatNumber(value, decimals) {
    const fixed = value.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart ? `${withSep}.${decPart}` : withSep;
  }

  function init() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
      counters.forEach((el) => {
        const target = parseFloat(el.dataset.counter || '0');
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        el.textContent = prefix + formatNumber(target, 0) + suffix;
      });
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    counters.forEach((c) => obs.observe(c));
  }

  return { init };
})();

window.Counter = Counter;
