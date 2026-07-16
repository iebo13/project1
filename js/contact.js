/* =========================================================
   CONTACT.JS
   Form validation + submission (mock) + toast feedback
   ========================================================= */

const Contact = (() => {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[+\d\s().-]{7,}$/;

  const validators = {
    required: (v) => v.trim().length > 0,
    email: (v) => EMAIL_RE.test(v.trim()),
    phone: (v) => !v || PHONE_RE.test(v.trim()),
    minLength: (v, n) => v.trim().length >= n,
    checked: (_, el) => el.checked,
  };

  function validateField(field) {
    const input = field.querySelector('.field__input, .field__textarea, .field__select');
    if (!input) return true;
    const rules = (input.dataset.rules || '').split('|').filter(Boolean);
    const value = input.value;

    for (const rule of rules) {
      const [name, arg] = rule.split(':');
      const validator = validators[name];
      if (!validator) continue;
      const ok = validator(value, input, arg ? parseInt(arg, 10) : undefined);
      if (!ok) {
        field.classList.add('field--error');
        const errEl = field.querySelector('.field__error');
        if (errEl) errEl.textContent = getErrorMessage(name, input);
        return false;
      }
    }

    field.classList.remove('field--error');
    return true;
  }

  function getErrorMessage(name, input) {
    const t = (window.I18n && window.I18n.t) ? window.I18n.t.bind(window.I18n) : (k) => k;
    const messages = {
      required: t('form.required'),
      email: t('form.email'),
      phone: t('form.phone'),
      minLength: t('form.minLength'),
      checked: t('form.checked'),
    };
    return messages[name] || 'Invalid input.';
  }

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

    // Swap icon for error
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

    const fields = form.querySelectorAll('.field');
    const submitBtn = form.querySelector('[type="submit"]');
    const messageBox = form.querySelector('.form-message');
    const t = (window.I18n && window.I18n.t) ? window.I18n.t.bind(window.I18n) : (k) => k;

    // Live validation after first blur
    fields.forEach((field) => {
      const input = field.querySelector('.field__input, .field__textarea, .field__select');
      if (!input) return;
      input.addEventListener('blur', () => validateField(field));
      input.addEventListener('input', () => {
        if (field.classList.contains('field--error')) validateField(field);
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let valid = true;
      fields.forEach((field) => {
        if (!validateField(field)) valid = false;
      });

      if (!valid) {
        const firstError = form.querySelector('.field--error .field__input, .field--error .field__textarea');
        if (firstError) firstError.focus();
        if (messageBox) {
          messageBox.textContent = t('form.errorMsg');
          messageBox.className = 'form-message form-message--error is-visible';
        }
        return;
      }

      // Mock submission
      const originalLabel = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';

      await new Promise((r) => setTimeout(r, 1400));

      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
      form.reset();
      fields.forEach((f) => f.classList.remove('field--error'));

      if (messageBox) {
        messageBox.textContent = t('form.successMsg');
        messageBox.className = 'form-message form-message--success is-visible';
      }
      showToast(t('form.toast.success'), 'success');

      setTimeout(() => {
        if (messageBox) messageBox.classList.remove('is-visible');
      }, 6000);
    });

    // Newsletter form (footer)
    const newsletter = document.querySelector('.newsletter-form');
    if (newsletter) {
      newsletter.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = newsletter.querySelector('input');
        if (!EMAIL_RE.test(input.value.trim())) {
          showToast(t('form.toast.invalid'), 'error');
          return;
        }
        input.value = '';
        showToast(t('form.toast.subscribed'), 'success');
      });
    }
  }

  return { init };
})();

window.Contact = Contact;
