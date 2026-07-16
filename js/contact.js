/* =========================================================
   CONTACT.JS
   Form submission (mock) + toast feedback.
   Validation is native: the form has no `novalidate`, so the browser
   checks required/minlength/type=email/pattern before the submit event
   fires. This handler only runs on a valid form.
   ========================================================= */

const Contact = (() => {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showToast(message, type = 'success') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `
        <svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
        </svg>
        <span class="toast__msg"></span>
      `;
      document.body.appendChild(toast);
    }
    toast.className = `toast toast--${type}`;
    toast.querySelector('.toast__msg').textContent = message;
    toast.setAttribute('role', 'status');

    const icon = toast.querySelector('.toast__icon');
    if (type === 'error') {
      icon.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
    } else {
      icon.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>';
    }

    requestAnimationFrame(() => toast.classList.add('is-visible'));
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 4200);
  }

  function init() {
    const form = document.querySelector('#contact-form');
    if (!form) return;

    const submitBtn = form.querySelector('[type="submit"]');
    const messageBox = form.querySelector('.form-message');
    // The browser only fires `submit` once every native constraint passes.
    // Invalid attempts are blocked + reported by the UA before this runs.
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const originalLabel = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';

      await new Promise((r) => setTimeout(r, 1400));

      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
      form.reset();

      if (messageBox) {
        messageBox.textContent = messageBox.dataset.success || '';
        messageBox.className = 'form-message form-message--success is-visible';
      }
      showToast(messageBox?.dataset.toastSuccess || '', 'success');

      setTimeout(() => {
        if (messageBox) messageBox.classList.remove('is-visible');
      }, 6000);
    });

    // Newsletter signup (footer)
    const newsletter = document.querySelector('.newsletter-form');
    if (newsletter) {
      newsletter.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = newsletter.querySelector('input');
        if (!EMAIL_RE.test(input.value.trim())) {
          showToast(newsletter.dataset.invalid || '', 'error');
          return;
        }
        input.value = '';
        showToast(newsletter.dataset.subscribed || '', 'success');
      });
    }
  }

  return { init };
})();

window.Contact = Contact;
