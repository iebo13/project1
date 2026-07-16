/* =========================================================
   APP.JS
   Entry point — initialises every module in correct order.

   NOTE: This project deliberately uses the global namespace
   pattern (window.Animations, window.Navigation, ...) rather
   than ES6 module imports so that it works by simply opening
   index.html in a browser (no local server, no file:// CORS).
   Each module is loaded via a regular <script> tag in HTML
   and attaches itself to window. This file orchestrates them.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Init order matters:
  // 1) I18n first so all text is in place before any UI that depends on it
  // 2) Animations (sets up observers)
  // 3) UI components
  // 4) Forms / interactions
  window.I18n && window.I18n.init();
  window.Animations && window.Animations.init();
  window.Navigation && window.Navigation.init();
  window.Counter && window.Counter.init();
  window.FAQ && window.FAQ.init();
  window.Slider && window.Slider.init();
  window.Gallery && window.Gallery.init();
  window.Contact && window.Contact.init();

  // Console watermark — agency touch
  if (window.console && console.log) {
    const styles = [
      'color: #fff',
      'background: linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
      'padding: 8px 14px',
      'border-radius: 8px',
      'font-weight: 700',
      'font-family: Inter, sans-serif',
    ].join(';');
    console.log('%cBlitzBlank — Premium Reinigung · Düsseldorf', styles);
  }
});
