(function () {
    'use strict';

    /* ====== CONFIG ====== */
    const CONFIG = {
        REMEMBER_KEY: 'market_remember_user',
        REDIRECT_URL: 'index.html',
        PASSWORD_MIN: 6,
        PASSWORD_MAX: 128,
        EMAIL_MAX: 254,
        TOAST_MS: 3200,
        REDIRECT_DELAY_MS: 1500,
        REQUEST_TIMEOUT_MS: 10000,
        MAX_ATTEMPTS: 5,          // client-side throttle (UX only, not security)
        LOCKOUT_MS: 30000
    };

    /* ====== DOM ELEMENTS ====== */
    const $ = (id) => document.getElementById(id);
    const loginForm  = $('loginForm');
    const userInput  = $('userInput');
    const passInput  = $('passInput');
    const userError  = $('userError');
    const passError  = $('passError');
    const btnLogin   = $('btnLogin');
    const toastEl    = $('toast');
    const eyeIcon    = $('eyeIcon');
    const rememberMe = $('rememberMe');

    // Fail loudly (in console) instead of throwing cryptic errors later
    if (!loginForm || !userInput || !passInput || !btnLogin) {
        console.error('[login] Required form elements are missing.');
        return;
    }

    /* ====== STATE ====== */
    let isSubmitting = false;
    let failedAttempts = 0;
    let lockedUntil = 0;
    let toastTimer = null;
    let redirectTimer = null;

    /* ====== SAFE STORAGE (localStorage can throw in private mode / when blocked) ====== */
    const storage = {
        get(key) {
            try { return localStorage.getItem(key); } catch (_) { return null; }
        },
        set(key, value) {
            try { localStorage.setItem(key, value); } catch (_) { /* ignore */ }
        },
        remove(key) {
            try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
        }
    };

    /* ====== UTILS ====== */
    function showToast(message, type = 'success') {
        if (!toastEl) return;
        const iconClass =
            type === 'error'   ? 'fa-times-circle' :
            type === 'warning' ? 'fa-exclamation-triangle' :
                                 'fa-check-circle';

        // Build with DOM APIs (no innerHTML) so message text can never inject markup
        toastEl.textContent = '';
        const icon = document.createElement('i');
        icon.className = `fas ${iconClass}`;
        const text = document.createElement('span');
        text.textContent = message;
        toastEl.append(icon, ' ', text);

        toastEl.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toastEl.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        toastEl.classList.add('show');

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), CONFIG.TOAST_MS);
    }

    function setLoading(btn, isLoading) {
        btn.disabled = isLoading;
        btn.classList.toggle('loading', isLoading);
        btn.setAttribute('aria-busy', String(isLoading));
    }

    /** Convert Persian (۰-۹) and Arabic-Indic (٠-٩) digits to Latin 0-9. */
    function normalizeDigits(str) {
        return str
            .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
            .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
    }

    /* ====== FIELD ERROR HELPERS (with accessibility) ====== */
    function setFieldError(input, errorEl, message) {
        const span = errorEl.querySelector('span');
        if (span && message) span.textContent = message;
        errorEl.classList.add('show');
        errorEl.setAttribute('role', 'alert');
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', errorEl.id);
        input.style.borderColor = 'var(--error)';
    }

    function clearFieldError(input, errorEl) {
        errorEl.classList.remove('show');
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        input.style.borderColor = '';
    }

    /* ====== PASSWORD TOGGLE (kept global because the HTML uses onclick="togglePassword()") ====== */
    function togglePassword() {
        const isHidden = passInput.type === 'password';
        passInput.type = isHidden ? 'text' : 'password';
        if (eyeIcon) eyeIcon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
        const btn = eyeIcon && eyeIcon.closest('button');
        if (btn) btn.setAttribute('aria-pressed', String(isHidden));
    }
    window.togglePassword = togglePassword;

    /* ====== VALIDATION ====== */
    const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

    /**
     * Normalizes Iranian mobile numbers to the 09XXXXXXXXX format.
     * Accepts: 09121234567, 9121234567, +989121234567, 00989121234567,
     * with spaces/dashes/parentheses and Persian/Arabic digits.
     * Returns null if it is not a valid mobile number.
     */
    function normalizePhone(raw) {
        let v = normalizeDigits(raw).replace(/[\s\-()]/g, '');
        if (v.startsWith('+98'))       v = '0' + v.slice(3);
        else if (v.startsWith('0098')) v = '0' + v.slice(4);
        else if (v.startsWith('98') && v.length === 12) v = '0' + v.slice(2);
        else if (v.startsWith('9') && v.length === 10)  v = '0' + v;
        return /^09\d{9}$/.test(v) ? v : null;
    }

    function normalizeEmail(raw) {
        const v = raw.trim().toLowerCase();
        if (v.length > CONFIG.EMAIL_MAX) return null;
        if (v.includes('..')) return null;
        return EMAIL_REGEX.test(v) ? v : null;
    }

    /** @returns {{valid: boolean, value?: string, message?: string}} */
    function validateIdentifier(raw) {
        // Strip invisible characters (zero-width space/joiners, RTL/LTR marks) that
        // often sneak in when copying Persian text
        const cleaned = raw.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '').trim();
        if (!cleaned) {
            return { valid: false, message: 'لطفاً ایمیل یا شماره موبایل را وارد کنید' };
        }
        if (cleaned.includes('@')) {
            const email = normalizeEmail(cleaned);
            return email
                ? { valid: true, value: email }
                : { valid: false, message: 'فرمت ایمیل معتبر نیست' };
        }
        const phone = normalizePhone(cleaned);
        return phone
            ? { valid: true, value: phone }
            : { valid: false, message: 'شماره موبایل معتبر نیست (مثال: 09121234567)' };
    }

    /** Passwords are NOT trimmed: leading/trailing spaces can be part of a real password. */
    function validatePassword(pass) {
        if (!pass) {
            return { valid: false, message: 'لطفاً رمز عبور را وارد کنید' };
        }
        if (pass.length < CONFIG.PASSWORD_MIN) {
            return { valid: false, message: `رمز عبور باید حداقل ${CONFIG.PASSWORD_MIN} کاراکتر باشد` };
        }
        if (pass.length > CONFIG.PASSWORD_MAX) {
            return { valid: false, message: `رمز عبور نباید بیشتر از ${CONFIG.PASSWORD_MAX} کاراکتر باشد` };
        }
        return { valid: true, value: pass };
    }

    /* ====== AUTH REQUEST ====== */
    /**
     * Replace the body of this function with your real API call.
     * It has a timeout via AbortController and normalizes failures into thrown Errors.
     */
    async function authenticate(identifier, password) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

        try {
            // ---- SIMULATION (remove when connecting to a real backend) ----
            await new Promise((resolve, reject) => {
                const t = setTimeout(resolve, 1500);
                controller.signal.addEventListener('abort', () => {
                    clearTimeout(t);
                    reject(new DOMException('Aborted', 'AbortError'));
                });
            });
            return { ok: true };
            // ---------------------------------------------------------------

            /* Real example:
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ identifier, password }),
                signal: controller.signal
            });
            if (res.status === 401) throw new Error('INVALID_CREDENTIALS');
            if (res.status === 429) throw new Error('RATE_LIMITED');
            if (!res.ok)            throw new Error('SERVER_ERROR');
            return await res.json();
            */
        } finally {
            clearTimeout(timeout);
        }
    }

    function messageForError(err) {
        if (err && err.name === 'AbortError')          return 'پاسخی از سرور دریافت نشد. دوباره تلاش کنید';
        if (!navigator.onLine)                         return 'اتصال اینترنت برقرار نیست';
        if (err && err.message === 'INVALID_CREDENTIALS') return 'ایمیل/شماره موبایل یا رمز عبور اشتباه است';
        if (err && err.message === 'RATE_LIMITED')     return 'تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید';
        return 'خطایی رخ داد. لطفاً دوباره تلاش کنید';
    }

    /* ====== FORM SUBMIT ====== */
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (isSubmitting) return; // block double submits (Enter spam, double click)

        // Client-side lockout after repeated failures
        const now = Date.now();
        if (now < lockedUntil) {
            const secs = Math.ceil((lockedUntil - now) / 1000);
            showToast(`تلاش‌های ناموفق زیاد بود. ${secs} ثانیه دیگر دوباره امتحان کنید`, 'warning');
            return;
        }

        const userResult = validateIdentifier(userInput.value);
        const passResult = validatePassword(passInput.value);

        let firstInvalid = null;

        if (!userResult.valid) {
            setFieldError(userInput, userError, userResult.message);
            firstInvalid = firstInvalid || userInput;
        } else {
            clearFieldError(userInput, userError);
        }

        if (!passResult.valid) {
            setFieldError(passInput, passError, passResult.message);
            firstInvalid = firstInvalid || passInput;
        } else {
            clearFieldError(passInput, passError);
        }

        if (firstInvalid) {
            firstInvalid.focus();
            return;
        }

        isSubmitting = true;
        setLoading(btnLogin, true);

        try {
            await authenticate(userResult.value, passResult.value);

            failedAttempts = 0;

            if (rememberMe && rememberMe.checked) {
                storage.set(CONFIG.REMEMBER_KEY, userResult.value); // never store the password
            } else {
                storage.remove(CONFIG.REMEMBER_KEY);
            }

            showToast('خوش آمدید! ورود با موفقیت انجام شد');

            // Keep the button disabled while we wait to redirect
            redirectTimer = setTimeout(() => {
                window.location.href = CONFIG.REDIRECT_URL;
            }, CONFIG.REDIRECT_DELAY_MS);
        } catch (err) {
            failedAttempts += 1;
            if (failedAttempts >= CONFIG.MAX_ATTEMPTS) {
                lockedUntil = Date.now() + CONFIG.LOCKOUT_MS;
                failedAttempts = 0;
            }
            showToast(messageForError(err), 'error');
            passInput.select();
            isSubmitting = false;
            setLoading(btnLogin, false);
        }
        // Note: on success isSubmitting stays true so the form can't be resubmitted before redirect
    });

    /* ====== REAL-TIME FEEDBACK ====== */
    userInput.addEventListener('input', () => clearFieldError(userInput, userError));
    passInput.addEventListener('input', () => clearFieldError(passInput, passError));

    // Validate identifier when leaving the field (only if user typed something)
    userInput.addEventListener('blur', () => {
        if (!userInput.value.trim()) return;
        const r = validateIdentifier(userInput.value);
        if (!r.valid) setFieldError(userInput, userError, r.message);
    });

    // Caps Lock hint on the password field
    passInput.addEventListener('keyup', (e) => {
        if (typeof e.getModifierState === 'function' && e.getModifierState('CapsLock')) {
            showToast('Caps Lock روشن است', 'warning');
        }
    });

    /* ====== CLEANUP ====== */
    // If the user navigates back (bfcache), reset the stuck "loading" state
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            clearTimeout(redirectTimer);
            isSubmitting = false;
            setLoading(btnLogin, false);
        }
    });

    /* ====== INIT ====== */
    document.addEventListener('DOMContentLoaded', () => {
        const savedUser = storage.get(CONFIG.REMEMBER_KEY);
        if (savedUser) {
            userInput.value = savedUser;
            if (rememberMe) rememberMe.checked = true;
            passInput.focus();  // username already filled, so go to password
        } else {
            userInput.focus();
        }
    });
})();
