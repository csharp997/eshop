  /* ====== DOM ELEMENTS ====== */
        const registerForm = document.getElementById('registerForm');
        const firstName = document.getElementById('firstName');
        const lastName = document.getElementById('lastName');
        const emailInput = document.getElementById('emailInput');
        const phoneInput = document.getElementById('phoneInput');
        const passInput = document.getElementById('passInput');
        const confirmPassInput = document.getElementById('confirmPassInput');
        const termsCheck = document.getElementById('termsCheck');
        const btnRegister = document.getElementById('btnRegister');
        const toastEl = document.getElementById('toast');
        const strengthBar = document.getElementById('strengthBar');
        const strengthText = document.getElementById('strengthText');

        /* ====== UTILS ====== */
        function showToast(message, type = 'success') {
            const iconClass = type === 'error' ? 'fa-times-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle';
            toastEl.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
            toastEl.classList.add('show');
            setTimeout(() => toastEl.classList.remove('show'), 3200);
        }

        function setLoading(btn, isLoading) {
            btn.disabled = isLoading;
            btn.classList.toggle('loading', isLoading);
        }

        function showError(elId, show) {
            document.getElementById(elId).classList.toggle('show', show);
        }

        function clearErrorOnInput(input, errorId) {
            input.addEventListener('input', () => {
                showError(errorId, false);
                input.style.borderColor = '';
            });
        }

        /* ====== PASSWORD TOGGLE ====== */
        function togglePassword(inputId, iconId) {
            const input = document.getElementById(inputId);
            const icon = document.getElementById(iconId);
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            icon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
        }

        /* ====== VALIDATION ====== */
        function validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        function validatePhone(phone) {
            return /^09\d{9}$/.test(phone);
        }

        /* ====== PASSWORD STRENGTH ====== */
        function checkStrength(password) {
            let score = 0;
            if (password.length >= 8) score++;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
            if (/\d/.test(password)) score++;
            if (/[^A-Za-z0-9]/.test(password)) score++;
            return score;
        }

        passInput.addEventListener('input', function() {
            const val = this.value;
            const bars = strengthBar.querySelectorAll('.bar');
            bars.forEach(b => b.className = 'bar');

            if (val.length === 0) {
                strengthBar.classList.remove('show');
                strengthText.classList.remove('show');
                return;
            }

            strengthBar.classList.add('show');
            strengthText.classList.add('show');
            const score = checkStrength(val);

            for (let i = 0; i < score; i++) {
                if (score <= 2) bars[i].classList.add('weak');
                else if (score === 3) bars[i].classList.add('medium');
                else bars[i].classList.add('strong');
            }

            const texts = ['خیلی ضعیف', 'ضعیف', 'متوسط', 'قوی', 'خیلی قوی'];
            strengthText.textContent = 'قدرت رمز: ' + texts[score];
            strengthText.style.color = score <= 2 ? 'var(--error)' : score === 3 ? '#f39c12' : 'var(--success)';
        });

        /* ====== CLEAR ERRORS ====== */
        clearErrorOnInput(firstName, 'firstNameError');
        clearErrorOnInput(lastName, 'lastNameError');
        clearErrorOnInput(emailInput, 'emailError');
        clearErrorOnInput(phoneInput, 'phoneError');
        clearErrorOnInput(passInput, 'passError');
        clearErrorOnInput(confirmPassInput, 'confirmPassError');
        termsCheck.addEventListener('change', () => showError('termsError', false));

        /* ====== ONLY DIGITS FOR PHONE ====== */
        phoneInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });

        /* ====== FORM SUBMIT ====== */
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            let hasError = false;

            if (!firstName.value.trim()) {
                showError('firstNameError', true);
                firstName.style.borderColor = 'var(--error)';
                setTimeout(() => firstName.style.borderColor = '', 2000);
                hasError = true;
            }

            if (!lastName.value.trim()) {
                showError('lastNameError', true);
                lastName.style.borderColor = 'var(--error)';
                setTimeout(() => lastName.style.borderColor = '', 2000);
                hasError = true;
            }

            if (!validateEmail(emailInput.value.trim())) {
                showError('emailError', true);
                emailInput.style.borderColor = 'var(--error)';
                setTimeout(() => emailInput.style.borderColor = '', 2000);
                hasError = true;
            }

            if (!validatePhone(phoneInput.value.trim())) {
                showError('phoneError', true);
                phoneInput.style.borderColor = 'var(--error)';
                setTimeout(() => phoneInput.style.borderColor = '', 2000);
                hasError = true;
            }

            if (passInput.value.length < 8) {
                showError('passError', true);
                passInput.style.borderColor = 'var(--error)';
                setTimeout(() => passInput.style.borderColor = '', 2000);
                hasError = true;
            }

            if (passInput.value !== confirmPassInput.value || !confirmPassInput.value) {
                showError('confirmPassError', true);
                confirmPassInput.style.borderColor = 'var(--error)';
                setTimeout(() => confirmPassInput.style.borderColor = '', 2000);
                hasError = true;
            }

            if (!termsCheck.checked) {
                showError('termsError', true);
                hasError = true;
            }

            if (hasError) return;

            setLoading(btnRegister, true);

            setTimeout(() => {
                setLoading(btnRegister, false);
                showToast('ثبت‌نام با موفقیت انجام شد! خوش آمدید');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1800);
            }, 1800);
        });

        /* ====== INIT ====== */
        document.addEventListener('DOMContentLoaded', () => {
            firstName.focus();
        });