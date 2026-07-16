/* =========================================================
   SLIDER.JS
   Testimonials / generic slider with autoplay + swipe
   ========================================================= */

const Slider = (() => {
  const instances = [];

  class SliderInstance {
    constructor(root) {
      this.root = root;
      this.track = root.querySelector('.slider__track');
      this.slides = Array.from(root.querySelectorAll('.slider__slide'));
      this.dots = Array.from(root.querySelectorAll('.slider__dot'));
      this.prevBtn = root.querySelector('.slider__btn--prev');
      this.nextBtn = root.querySelector('.slider__btn--next');
      this.current = 0;
      this.autoplay = root.dataset.autoplay === 'true';
      this.interval = parseInt(root.dataset.interval || 5500, 10);
      this.timer = null;
      this.isAnimating = false;
      this.perView = 1;

      if (!this.track || !this.slides.length) return;

      this.init();
    }

    init() {
      this.calcPerView();
      this.bind();
      this.goTo(0, false);
      if (this.autoplay) this.start();

      // Recalc on resize
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this.calcPerView();
          this.goTo(this.current, false);
        }, 200);
      });
    }

    calcPerView() {
      const w = window.innerWidth;
      if (w >= 1024 && this.root.dataset.perViewDesktop) {
        this.perView = parseInt(this.root.dataset.perViewDesktop, 10);
      } else if (w >= 640 && this.root.dataset.perViewTablet) {
        this.perView = parseInt(this.root.dataset.perViewTablet, 10);
      } else {
        this.perView = 1;
      }
      // Slide width
      this.slides.forEach((s) => {
        s.style.flex = `0 0 ${100 / this.perView}%`;
      });
    }

    bind() {
      if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());

      this.dots.forEach((dot, i) => {
        dot.addEventListener('click', () => this.goTo(i * this.perView));
      });

      // Pause on hover
      this.root.addEventListener('mouseenter', () => this.stop());
      this.root.addEventListener('mouseleave', () => this.autoplay && this.start());

      // Pause on focus within (keyboard accessibility)
      this.root.addEventListener('focusin', () => this.stop());
      this.root.addEventListener('focusout', () => this.autoplay && this.start());

      // Keyboard
      this.root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
      });

      // Touch / swipe
      let startX = 0;
      let isDown = false;
      this.track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDown = true;
        this.stop();
      }, { passive: true });

      this.track.addEventListener('touchend', (e) => {
        if (!isDown) return;
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;
        if (Math.abs(diff) > 50) {
          diff > 0 ? this.next() : this.prev();
        }
        isDown = false;
        if (this.autoplay) this.start();
      });

      // Visibility — pause when tab hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stop();
        else if (this.autoplay) this.start();
      });
    }

    maxIndex() {
      return Math.max(0, this.slides.length - this.perView);
    }

    goTo(index, animate = true) {
      this.current = Math.min(Math.max(0, index), this.maxIndex());
      const offset = -(this.current * (100 / this.perView));
      this.track.style.transition = animate ? '' : 'none';
      this.track.style.transform = `translateX(${offset}%)`;
      if (!animate) {
        // Force reflow then restore transition
        // eslint-disable-next-line no-unused-expressions
        this.track.offsetHeight;
        this.track.style.transition = '';
      }

      // Update dots
      const activeDot = Math.round(this.current / this.perView);
      this.dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === activeDot);
        dot.setAttribute('aria-selected', i === activeDot ? 'true' : 'false');
      });

      // Disable buttons at edges
      if (this.prevBtn) this.prevBtn.disabled = this.current === 0;
      if (this.nextBtn) this.nextBtn.disabled = this.current >= this.maxIndex();
    }

    next() { this.goTo(this.current + this.perView); }
    prev() { this.goTo(this.current - this.perView); }

    start() {
      this.stop();
      this.timer = setInterval(() => {
        if (this.current >= this.maxIndex()) this.goTo(0);
        else this.next();
      }, this.interval);
    }

    stop() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }
  }

  function init() {
    document.querySelectorAll('.slider').forEach((root) => {
      instances.push(new SliderInstance(root));
    });
  }

  return { init, instances };
})();

window.Slider = Slider;
