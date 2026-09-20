(function () {
    'use strict';

    /* ====== CONFIG ====== */
    const CONFIG = {
        LOGIN_URL: 'login.html',
        NAME_MIN: 2,
        NAME_MAX: 50,
        EMAIL_MAX: 254,
        PASSWORD_MIN: 8,
        PASSWORD_MAX: 128,
        TOAST_MS: 3200,
        REDIRECT_DELAY_MS: 1800,
        REQUEST_TIMEOUT_MS: 10000
    };

    /* ====== DOM ELEMENTS ====== */
    const $ = (id) => document.getElementById(id);
    const registerForm     = $('registerForm');
    const firstName        = $('firstName');
    const lastName         = $('lastName');
    const emailInput       = $('emailInput');
    const phoneInput       = $('phoneInput');
    const passInput        = $('passInput');
    const confirmPassInput = $('confirmPassInput');
    const termsCheck       = $('termsCheck');
    const btnRegister      = $('btnRegister');
    const toastEl          = $('toast');
    const strengthBar      = $('strengthBar');
    const strengthText     = $('strengthText');

    const errors = {
        firstName: $('firstNameError'),
        lastName: $('lastNameError'),
        email: $('emailError'),
        phone: $('phoneError'),
        pass: $('passError'),
        confirm: $('confirmPassError'),
        terms: $('termsError')
    };

    if (!registerForm || !firstName || !lastName || !emailInput || !phoneInput ||
        !passInput || !confirmPassInput || !termsCheck || !btnRegister) {
        console.error('[register] Required form elements are missing.');
        return;
    }

    /* ====== STATE ====== */
    let isSubmitting = false;
    let toastTimer = null;
    let redirectTimer = null;

    /* ====== UTILS ====== */
    function showToast(message, type = 'success') {
        if (!toastEl) return;
        const iconClass =
            type === 'error'   ? 'fa-times-circle' :
            type === 'warning' ? 'fa-exclamation-triangle' :
                                 'fa-check-circle';

        // DOM APIs instead of innerHTML so message text can never inject markup
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

    /** Remove invisible direction/zero-width characters that sneak in from copy-paste. */
    function stripInvisible(str) {
        // Keeps ZWNJ (\u200C) out of this range on purpose: it is legitimate in Persian words
        return str.replace(/[\u200B\u200D\u200E\u200F\u202A-\u202E\uFEFF]/g, '');
    }

    /** Normalize Arabic Yeh/Kaf to Persian Yeh/Kaf so the same name is stored consistently. */
    function normalizePersianLetters(str) {
        return str.replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9');
    }

    /* ====== FIELD ERROR HELPERS (with accessibility) ====== */
    function setFieldError(input, errorEl, message) {
        if (!errorEl) return;
        const span = errorEl.querySelector('span');
        if (span && message) span.textContent = message;
        errorEl.classList.add('show');
        errorEl.setAttribute('role', 'alert');
        if (input) {
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', errorEl.id);
            if (input !== termsCheck) input.style.borderColor = 'var(--error)';
        }
    }

    function clearFieldError(input, errorEl) {
        if (errorEl) errorEl.classList.remove('show');
        if (input) {
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
            input.style.borderColor = '';
        }
    }

    /* ====== PASSWORD TOGGLE (global: HTML uses onclick="togglePassword(...)") ====== */
    function togglePassword(inputId, iconId) {
        const input = $(inputId);
        const icon = $(iconId);
        if (!input) return;
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        if (icon) {
            icon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
            const btn = icon.closest('button');
            if (btn) btn.setAttribute('aria-pressed', String(isHidden));
        }
    }
    window.togglePassword = togglePassword;

    /* ====== VALIDATORS ====== */
    // Letters (any script, incl. Persian), combining marks, spaces, ZWNJ, apostrophe, hyphen, dot. No digits.
    const NAME_REGEX = /^[\p{L}\p{M}][\p{L}\p{M}\s\u200C'.\-]*$/u;
    const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

    function validateName(raw, label) {
        const v = normalizePersianLetters(stripInvisible(raw)).replace(/\s+/g, ' ').trim();
        if (!v) return { valid: false, message: `لطفاً ${label} را وارد کنید` };
        if (v.length < CONFIG.NAME_MIN) return { valid: false, message: `${label} باید حداقل ${CONFIG.NAME_MIN} حرف باشد` };
        if (v.length > CONFIG.NAME_MAX) return { valid: false, message: `${label} نباید بیشتر از ${CONFIG.NAME_MAX} حرف باشد` };
        if (!NAME_REGEX.test(v)) return { valid: false, message: `${label} فقط می‌تواند شامل حروف باشد` };
        return { valid: true, value: v };
    }

    function validateEmail(raw) {
        const v = stripInvisible(raw).trim().toLowerCase();
        if (!v) return { valid: false, message: 'لطفاً ایمیل خود را وارد کنید' };
        if (v.length > CONFIG.EMAIL_MAX || v.includes('..') || !EMAIL_REGEX.test(v)) {
            return { valid: false, message: 'لطفاً یک ایمیل معتبر وارد کنید' };
        }
        const local = v.split('@')[0];
        if (local.startsWith('.') || local.endsWith('.')) {
            return { valid: false, message: 'لطفاً یک ایمیل معتبر وارد کنید' };
        }
        return { valid: true, value: v };
    }

    /**
     * Normalizes Iranian mobile numbers to 09XXXXXXXXX.
     * Accepts +98…, 0098…, 98…, 9XXXXXXXXX, spaces/dashes, Persian/Arabic digits.
     */
    function normalizePhone(raw) {
        let v = normalizeDigits(stripInvisible(raw)).replace(/[\s\-()]/g, '');
        if (v.startsWith('+98'))       v = '0' + v.slice(3);
        else if (v.startsWith('0098')) v = '0' + v.slice(4);
        else if (v.startsWith('98') && v.length === 12) v = '0' + v.slice(2);
        else if (v.startsWith('9') && v.length === 10)  v = '0' + v;
        return /^09\d{9}$/.test(v) ? v : null;
    }

    function validatePhone(raw) {
        if (!raw.trim()) return { valid: false, message: 'لطفاً شماره موبایل را وارد کنید' };
        const phone = normalizePhone(raw);
        return phone
            ? { valid: true, value: phone }
            : { valid: false, message: 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود' };
    }

    /* ====== PASSWORD RULES ====== */
    // Small offline list of very common passwords (a server-side check should be the real gate)
    const COMMON_PASSWORDS = new Set([
        '12345678', '123456789', '1234567890', '11111111', '00000000', '87654321',
        'password', 'password1', 'password123', 'qwertyui', 'qwerty123', 'qwertyuiop',
        'abcd1234', 'abc12345', 'iloveyou', 'admin123', 'welcome1', 'letmein1',
        '09123456789', '12341234', '1q2w3e4r', '1qaz2wsx'
    ]);

    function isRepeatedOrSequential(p) {
        if (/^(.)\1+$/.test(p)) return true; // aaaaaaaa
        const digits = '0123456789012345678909876543210';
        const letters = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz';
        const lower = p.toLowerCase();
        return digits.includes(lower) || letters.includes(lower); // 12345678, abcdefgh
    }

    function validatePassword(pass, context) {
        if (!pass) return { valid: false, message: 'لطفاً رمز عبور را وارد کنید' };
        if (pass.length < CONFIG.PASSWORD_MIN) {
            return { valid: false, message: `رمز عبور باید حداقل ${CONFIG.PASSWORD_MIN} کاراکتر باشد` };
        }
        if (pass.length > CONFIG.PASSWORD_MAX) {
            return { valid: false, message: `رمز عبور نباید بیشتر از ${CONFIG.PASSWORD_MAX} کاراکتر باشد` };
        }
        if (!pass.trim()) {
            return { valid: false, message: 'رمز عبور نمی‌تواند فقط شامل فاصله باشد' };
        }
        const lower = pass.toLowerCase();
        if (COMMON_PASSWORDS.has(lower) || isRepeatedOrSequential(pass)) {
            return { valid: false, message: 'این رمز عبور بسیار رایج و قابل حدس است. رمز دیگری انتخاب کنید' };
        }
        const { email, phone } = context || {};
        if ((email && lower === email) || (phone && lower === phone)) {
            return { valid: false, message: 'رمز عبور نباید با ایمیل یا شماره موبایل یکسان باشد' };
        }
        return { valid: true, value: pass };
    }

    function validateConfirm(pass, confirm) {
        if (!confirm) return { valid: false, message: 'لطفاً رمز عبور را تکرار کنید' };
        if (pass !== confirm) return { valid: false, message: 'رمز عبور و تکرار آن یکسان نیستند' };
        return { valid: true };
    }

    /* ====== PASSWORD STRENGTH ====== */
    function checkStrength(password) {
        let score = 0;
        if (password.length >= 8 && !COMMON_PASSWORDS.has(password.toLowerCase()) && !isRepeatedOrSequential(password)) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        // Long passphrases deserve credit even without symbols
        if (password.length >= 14 && score < 4) score++;
        return Math.min(score, 4);
    }

    function updateStrengthMeter() {
        if (!strengthBar || !strengthText) return;
        const val = passInput.value;
        const bars = strengthBar.querySelectorAll('.bar');
        bars.forEach((b) => (b.className = 'bar'));

        if (val.length === 0) {
            strengthBar.classList.remove('show');
            strengthText.classList.remove('show');
            strengthText.textContent = '';
            return;
        }

        strengthBar.classList.add('show');
        strengthText.classList.add('show');
        strengthText.setAttribute('aria-live', 'polite');

        const score = checkStrength(val);
        const cls = score <= 2 ? 'weak' : score === 3 ? 'medium' : 'strong';
        for (let i = 0; i < score && i < bars.length; i++) bars[i].classList.add(cls);

        const texts = ['خیلی ضعیف', 'ضعیف', 'متوسط', 'قوی', 'خیلی قوی'];
        strengthText.textContent = 'قدرت رمز: ' + texts[score];
        strengthText.style.color = score <= 2 ? 'var(--error)' : score === 3 ? '#f39c12' : 'var(--success)';
    }

    /* ====== PHONE INPUT SANITIZING ====== */
    function sanitizePhoneField() {
        phoneInput.value = normalizeDigits(phoneInput.value).replace(/\D/g, '').slice(0, 11);
    }

    // maxlength="11" would cut "+98912…" pastes, so normalize pasted text ourselves first
    phoneInput.addEventListener('paste', (e) => {
        const text = (e.clipboardData || window.clipboardData)?.getData('text');
        if (!text) return;
        e.preventDefault();
        const normalized = normalizePhone(text);
        const fallback = normalizeDigits(text).replace(/\D/g, '');
        phoneInput.value = (normalized || fallback).slice(0, 11);
        clearFieldError(phoneInput, errors.phone);
    });
    phoneInput.addEventListener('input', sanitizePhoneField);

    /* ====== REAL-TIME FEEDBACK ====== */
    const fieldMap = [
        [firstName, errors.firstName],
        [lastName, errors.lastName],
        [emailInput, errors.email],
        [phoneInput, errors.phone],
        [passInput, errors.pass],
        [confirmPassInput, errors.confirm]
    ];
    fieldMap.forEach(([input, err]) => {
        input.addEventListener('input', () => clearFieldError(input, err));
    });
    termsCheck.addEventListener('change', () => clearFieldError(termsCheck, errors.terms));

    passInput.addEventListener('input', () => {
        updateStrengthMeter();
        // If the user already typed a confirmation, re-check the match live
        if (confirmPassInput.value) {
            const r = validateConfirm(passInput.value, confirmPassInput.value);
            if (r.valid) clearFieldError(confirmPassInput, errors.confirm);
        }
    });

    // Validate on blur, but only if the user typed something (avoid nagging on tab-through)
    function blurValidate(input, err, fn) {
        input.addEventListener('blur', () => {
            if (!input.value.trim()) return;
            const r = fn();
            if (!r.valid) setFieldError(input, err, r.message);
        });
    }
    blurValidate(emailInput, errors.email, () => validateEmail(emailInput.value));
    blurValidate(phoneInput, errors.phone, () => validatePhone(phoneInput.value));
    blurValidate(confirmPassInput, errors.confirm, () => validateConfirm(passInput.value, confirmPassInput.value));

    // Caps Lock hint
    [passInput, confirmPassInput].forEach((el) => {
        el.addEventListener('keyup', (e) => {
            if (typeof e.getModifierState === 'function' && e.getModifierState('CapsLock')) {
                showToast('Caps Lock روشن است', 'warning');
            }
        });
    });

    /* ====== REGISTER REQUEST ====== */
    /**
     * Replace the body with your real API call.
     * Throw Error('EMAIL_EXISTS' | 'PHONE_EXISTS' | 'RATE_LIMITED' | ...) to get field-level messages.
     */
    async function registerUser(payload) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

        try {
            // ---- SIMULATION (remove when connecting to a real backend) ----
            await new Promise((resolve, reject) => {
                const t = setTimeout(resolve, 1800);
                controller.signal.addEventListener('abort', () => {
                    clearTimeout(t);
                    reject(new DOMException('Aborted', 'AbortError'));
                });
            });
            return { ok: true };
            // ---------------------------------------------------------------

            /* Real example:
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            if (res.status === 409) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.field === 'phone' ? 'PHONE_EXISTS' : 'EMAIL_EXISTS');
            }
            if (res.status === 429) throw new Error('RATE_LIMITED');
            if (!res.ok)            throw new Error('SERVER_ERROR');
            return await res.json();
            */
        } finally {
            clearTimeout(timeout);
        }
    }

    /* ====== FORM SUBMIT ====== */
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (isSubmitting) return; // block double submits

        const first = validateName(firstName.value, 'نام خود');
        const last  = validateName(lastName.value, 'نام خانوادگی');
        const email = validateEmail(emailInput.value);
        const phone = validatePhone(phoneInput.value);
        const pass  = validatePassword(passInput.value, {
            email: email.valid ? email.value : '',
            phone: phone.valid ? phone.value : ''
        });
        const confirm = validateConfirm(passInput.value, confirmPassInput.value);
        const termsOk = termsCheck.checked;

        const checks = [
            [firstName, errors.firstName, first],
            [lastName, errors.lastName, last],
            [emailInput, errors.email, email],
            [phoneInput, errors.phone, phone],
            [passInput, errors.pass, pass],
            [confirmPassInput, errors.confirm, confirm],
            [termsCheck, errors.terms, termsOk
                ? { valid: true }
                : { valid: false, message: 'پذیرش قوانین برای ثبت‌نام الزامی است' }]
        ];

        let firstInvalid = null;
        checks.forEach(([input, err, result]) => {
            if (result.valid) {
                clearFieldError(input, err);
            } else {
                setFieldError(input, err, result.message);
                if (!firstInvalid) firstInvalid = input;
            }
        });

        if (firstInvalid) {
            firstInvalid.focus();
            return;
        }

        isSubmitting = true;
        setLoading(btnRegister, true);

        try {
            await registerUser({
                firstName: first.value,
                lastName: last.value,
                email: email.value,
                phone: phone.value,
                password: pass.value
            });

            showToast('ثبت‌نام با موفقیت انجام شد! خوش آمدید');
            // Stay locked (isSubmitting stays true) until redirect
            redirectTimer = setTimeout(() => {
                window.location.href = CONFIG.LOGIN_URL;
            }, CONFIG.REDIRECT_DELAY_MS);
        } catch (err) {
            const code = err && err.message;
            if (code === 'EMAIL_EXISTS') {
                setFieldError(emailInput, errors.email, 'این ایمیل قبلاً ثبت شده است');
                emailInput.focus();
            } else if (code === 'PHONE_EXISTS') {
                setFieldError(phoneInput, errors.phone, 'این شماره موبایل قبلاً ثبت شده است');
                phoneInput.focus();
            } else if (err && err.name === 'AbortError') {
                showToast('پاسخی از سرور دریافت نشد. دوباره تلاش کنید', 'error');
            } else if (!navigator.onLine) {
                showToast('اتصال اینترنت برقرار نیست', 'error');
            } else if (code === 'RATE_LIMITED') {
                showToast('تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید', 'warning');
            } else {
                showToast('خطایی رخ داد. لطفاً دوباره تلاش کنید', 'error');
            }
            isSubmitting = false;
            setLoading(btnRegister, false);
        }
    });

    /* ====== CLEANUP ====== */
    // Reset a stuck loading state if the user returns via the browser Back button (bfcache)
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            clearTimeout(redirectTimer);
            isSubmitting = false;
            setLoading(btnRegister, false);
        }
    });

    /* ====== INIT ====== */
    document.addEventListener('DOMContentLoaded', () => {
        firstName.focus();
    });
})();
