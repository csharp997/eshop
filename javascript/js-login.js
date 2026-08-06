  /* ====== DOM ELEMENTS ====== */
        const loginForm = document.getElementById('loginForm');
        const userInput = document.getElementById('userInput');
        const passInput = document.getElementById('passInput');
        const userError = document.getElementById('userError');
        const passError = document.getElementById('passError');
        const btnLogin = document.getElementById('btnLogin');
        const toastEl = document.getElementById('toast');
        const eyeIcon = document.getElementById('eyeIcon');

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

        /* ====== PASSWORD TOGGLE ====== */
        function togglePassword() {
            const isHidden = passInput.type === 'password';
            passInput.type = isHidden ? 'text' : 'password';
            eyeIcon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
        }

        /* ====== VALIDATION ====== */
        function validateEmailOrPhone(value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^09\d{9}$/;
            return emailRegex.test(value) || phoneRegex.test(value);
        }

        /* ====== FORM SUBMIT ====== */
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const user = userInput.value.trim();
            const pass = passInput.value.trim();
            let hasError = false;

            if (!user || !validateEmailOrPhone(user)) {
                userError.classList.add('show');
                userInput.style.borderColor = 'var(--error)';
                setTimeout(() => { userInput.style.borderColor = ''; }, 2000);
                hasError = true;
            } else {
                userError.classList.remove('show');
            }

            if (pass.length < 6) {
                passError.classList.add('show');
                passInput.style.borderColor = 'var(--error)';
                setTimeout(() => { passInput.style.borderColor = ''; }, 2000);
                hasError = true;
            } else {
                passError.classList.remove('show');
            }

            if (hasError) return;

            setLoading(btnLogin, true);

            // Simulate API call
            setTimeout(() => {
                setLoading(btnLogin, false);
                showToast('خوش آمدید! ورود با موفقیت انجام شد');

                if (document.getElementById('rememberMe').checked) {
                    localStorage.setItem('market_remember_user', user);
                } else {
                    localStorage.removeItem('market_remember_user');
                }

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }, 1500);
        });

        /* ====== REAL-TIME CLEAR ERRORS ====== */
        userInput.addEventListener('input', () => {
            userError.classList.remove('show');
            userInput.style.borderColor = '';
        });
        passInput.addEventListener('input', () => {
            passError.classList.remove('show');
            passInput.style.borderColor = '';
        });

        /* ====== INIT ====== */
        document.addEventListener('DOMContentLoaded', () => {
            const savedUser = localStorage.getItem('market_remember_user');
            if (savedUser) {
                userInput.value = savedUser;
                document.getElementById('rememberMe').checked = true;
            }
            userInput.focus();
        });