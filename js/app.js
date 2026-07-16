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
  window.Slider && window.Slider.init();
  window.Gallery && window.Gallery.init();
  window.Contact && window.Contact.init();
});
