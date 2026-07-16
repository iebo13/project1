/* =========================================================
   FAQ.JS
   Accessible accordion with smooth height animation
   ========================================================= */

const FAQ = (() => {
  function init() {
    const items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    items.forEach((item, idx) => {
      const btn = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!btn || !answer) return;

      // Accessibility
      const id = `faq-panel-${idx}`;
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', id);
      answer.id = id;
      answer.setAttribute('role', 'region');

      btn.addEventListener('click', () => toggle(item));

      // Keyboard support already handled by native button
    });

    // Open first item by default
    if (items[0]) {
      // Allow CSS to settle first
      requestAnimationFrame(() => openItem(items[0]));
    }
  }

  function toggle(item) {
    const isOpen = item.classList.contains('is-open');
    // Close siblings (single-open accordion)
    item.parentElement.querySelectorAll('.faq-item.is-open').forEach((sib) => {
      if (sib !== item) closeItem(sib);
    });
    isOpen ? closeItem(item) : openItem(item);
  }

  function openItem(item) {
    const btn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    item.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    answer.style.maxHeight = answer.scrollHeight + 'px';

    // After transition, allow auto height in case content changes
    answer.addEventListener('transitionend', function handler(e) {
      if (e.propertyName === 'max-height' && item.classList.contains('is-open')) {
        answer.style.maxHeight = 'none';
        answer.removeEventListener('transitionend', handler);
      }
    });
  }

  function closeItem(item) {
    const btn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    // Set explicit height before setting to 0 for transition
    answer.style.maxHeight = answer.scrollHeight + 'px';
    requestAnimationFrame(() => {
      answer.style.maxHeight = '0';
    });

    item.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  }

  return { init };
})();

window.FAQ = FAQ;
