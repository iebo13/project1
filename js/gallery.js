/* =========================================================
   GALLERY.JS
   Filtering + lightbox (native <dialog>)
   ========================================================= */

const Gallery = (() => {
  let items = [];
  let filters = [];
  let dialog = null;
  let dialogImg = null;
  let dialogCaption = null;
  let currentList = [];
  let currentIndex = 0;

  /* ---------- Filtering ---------- */
  function initFilters() {
    const filterBar = document.querySelector('.gallery-filters');
    items = Array.from(document.querySelectorAll('.gallery-card'));
    if (!filterBar || !items.length) return;

    filters = Array.from(filterBar.querySelectorAll('.filter-btn'));

    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        filters.forEach((b) => {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        applyFilter(btn.dataset.filter);
      });
    });

    refreshVisible();
  }

  function applyFilter(filter) {
    items.forEach((item) => {
      const cat = item.dataset.category || '';
      const match = filter === 'all' || cat === filter;
      item.classList.toggle('is-hidden', !match);
      if (match) {
        // Re-trigger the fade-in without a forced reflow per card: toggle a
        // class that the animation is keyed to.
        item.classList.remove('is-fresh');
        // eslint-disable-next-line no-unused-expressions
        item.offsetHeight; // single read is unavoidable to restart a CSS animation
        item.classList.add('is-fresh');
      }
    });
    refreshVisible();
  }

  function refreshVisible() {
    // Kept for any future consumer; filtering toggles classes directly.
    return items.filter((item) => !item.classList.contains('is-hidden'));
  }

  /* ---------- Lightbox ---------- */
  function initLightbox() {
    dialog = document.querySelector('dialog.lightbox');
    if (!dialog) return;

    dialogImg = dialog.querySelector('.lightbox__img');
    dialogCaption = dialog.querySelector('.lightbox__caption');

    // Make every openable card keyboard-operable in one pass. Added at runtime
    // so the markup stays clean; role/tabindex don't affect rendering.
    document.querySelectorAll('.gallery-card, .masonry__item').forEach((card) => {
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
    });

    const openAt = (card) => {
      currentList = Array.from(
        document.querySelectorAll('.gallery-card, .masonry__item')
      ).filter((c) => !c.classList.contains('is-hidden'));
      currentIndex = currentList.indexOf(card);
      if (currentIndex === -1) return;
      showCard(card);
      dialog.showModal();
    };

    // Delegated click (mouse) + Enter/Space (keyboard).
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.gallery-card, .masonry__item');
      if (card) openAt(card);
    });
    document.addEventListener('keydown', (e) => {
      const card = e.target.closest && e.target.closest('.gallery-card, .masonry__item');
      if (card && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        openAt(card);
      }
    });

    dialog.querySelector('.lightbox__close').addEventListener('click', () => dialog.close());
    dialog.querySelector('.lightbox__nav--prev').addEventListener('click', (e) => {
      e.stopPropagation();
      nav(-1);
    });
    dialog.querySelector('.lightbox__nav--next').addEventListener('click', (e) => {
      e.stopPropagation();
      nav(1);
    });

    // Click on the dialog itself (the area around the image) closes — same as
    // clicking the backdrop of a modal.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });

    // Escape is native to <dialog>; arrows still need wiring.
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') nav(-1);
      if (e.key === 'ArrowRight') nav(1);
    });

    // Clear the image when the dialog closes (by Escape, backdrop, or button)
    // so it doesn't flash the previous photo on the next open.
    dialog.addEventListener('close', () => {
      dialogImg.src = '';
      dialogImg.alt = '';
      if (dialogCaption) dialogCaption.textContent = '';
    });
  }

  function showCard(card) {
    const img = card.querySelector('img');
    const titleEl = card.querySelector('.gallery-card__title, .masonry__title');
    const catEl = card.querySelector('.gallery-card__cat, .masonry__cat');

    dialogImg.src = (img && (img.dataset.full || img.src)) || '';
    dialogImg.alt = (titleEl && titleEl.textContent) || (img && img.alt) || '';
    if (dialogCaption) {
      dialogCaption.textContent = [catEl && catEl.textContent, titleEl && titleEl.textContent]
        .filter(Boolean)
        .join(' · ');
    }
  }

  function nav(dir) {
    if (!currentList.length) return;
    currentIndex = (currentIndex + dir + currentList.length) % currentList.length;
    showCard(currentList[currentIndex]);
  }

  function init() {
    initFilters();
    initLightbox();
  }

  return { init };
})();

window.Gallery = Gallery;
