/* =========================================================
   GALLERY.JS
   Filtering + lightbox + lazy loading
   ========================================================= */

const Gallery = (() => {
  let items = [];
  let filters = [];
  let lightbox = null;
  let lightboxImg = null;
  let lightboxCaption = null;
  let currentIndex = 0;
  let visibleIndices = [];

  /* ---------- Filtering ---------- */
  function initFilters() {
    const filterBar = document.querySelector('.gallery-filters');
    items = Array.from(document.querySelectorAll('.gallery-card'));
    if (!filterBar || !items.length) return;

    filters = Array.from(filterBar.querySelectorAll('.filter-btn'));

    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        filters.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const filter = btn.dataset.filter;
        applyFilter(filter);
      });
    });

    // Build initial visible list
    refreshVisible();
  }

  function applyFilter(filter) {
    items.forEach((item) => {
      const cat = item.dataset.category || '';
      const match = filter === 'all' || cat === filter;
      if (match) {
        item.classList.remove('is-hidden');
        // Re-trigger fade-in animation
        item.style.animation = 'none';
        // eslint-disable-next-line no-unused-expressions
        item.offsetHeight;
        item.style.animation = 'scaleIn 500ms var(--ease-out)';
      } else {
        item.classList.add('is-hidden');
      }
    });
    refreshVisible();
  }

  function refreshVisible() {
    visibleIndices = items
      .map((item, i) => (item.classList.contains('is-hidden') ? -1 : i))
      .filter((i) => i !== -1);
  }

  /* ---------- Lightbox ---------- */
  function initLightbox() {
    lightbox = document.querySelector('.lightbox');
    if (!lightbox) return;

    lightboxImg = lightbox.querySelector('.lightbox__img');
    lightboxCaption = lightbox.querySelector('.lightbox__caption');
    const closeBtn = lightbox.querySelector('.lightbox__close');
    const prevBtn = lightbox.querySelector('.lightbox__nav--prev');
    const nextBtn = lightbox.querySelector('.lightbox__nav--next');

    // Delegate clicks on gallery cards
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.gallery-card, .masonry__item');
      if (!card) return;
      // Build the list of currently visible images
      const allCards = Array.from(document.querySelectorAll('.gallery-card, .masonry__item'))
        .filter((c) => !c.classList.contains('is-hidden'));
      const idx = allCards.indexOf(card);
      if (idx === -1) return;
      currentIndex = idx;
      visibleLightboxList = allCards;
      openLightbox();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navLightbox(-1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navLightbox(1); });

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navLightbox(-1);
      if (e.key === 'ArrowRight') navLightbox(1);
    });
  }

  let visibleLightboxList = [];

  function getImgSrc(card) {
    const img = card.querySelector('img');
    if (!img) return '';
    // Use data-full if present (higher-res version), else src
    return img.dataset.full || img.src;
  }

  function getCaption(card) {
    const title = card.querySelector('.gallery-card__title, .masonry__title');
    const cat = card.querySelector('.gallery-card__cat, .masonry__cat');
    const parts = [];
    if (cat) parts.push(cat.textContent);
    if (title) parts.push(title.textContent);
    return parts.join(' · ');
  }

  function openLightbox() {
    if (!visibleLightboxList.length) return;
    const card = visibleLightboxList[currentIndex];
    lightboxImg.src = getImgSrc(card);
    lightboxImg.alt = (card.querySelector('.gallery-card__title, .masonry__title') || {}).textContent || '';
    if (lightboxCaption) lightboxCaption.textContent = getCaption(card);
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function navLightbox(dir) {
    currentIndex = (currentIndex + dir + visibleLightboxList.length) % visibleLightboxList.length;
    const card = visibleLightboxList[currentIndex];
    // Brief fade transition
    lightboxImg.style.opacity = '0';
    setTimeout(() => {
      lightboxImg.src = getImgSrc(card);
      lightboxImg.alt = (card.querySelector('.gallery-card__title, .masonry__title') || {}).textContent || '';
      if (lightboxCaption) lightboxCaption.textContent = getCaption(card);
      lightboxImg.style.opacity = '';
    }, 200);
  }

    function init() {
    initFilters();
    initLightbox();
  }

  return { init };
})();

window.Gallery = Gallery;
