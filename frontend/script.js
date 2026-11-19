// === 0. Global Toast Notification (Declared at Root Scope to Eliminate TDZ) ===
function showToast(message = "Translation Completed Successfully", type = 'default', duration = 3500) {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = 'toast show';
    if (type === 'warning') {
        toastEl.classList.add('toast-warning');
    } else if (type === 'info') {
        toastEl.classList.add('toast-info');
    }
    if (window._toastTimeout) clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        if (toastEl) toastEl.classList.remove('show');
    }, duration);
}
window.showToast = showToast;

document.addEventListener('DOMContentLoaded', () => {
    // === 1. Navbar & Mobile Menu ===
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = hamburger.querySelector('i');
        if (navLinks.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-xmark');
        } else {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    });

    // Automatically adjust editor layouts on window resize or device orientation change
    window.addEventListener('resize', () => {
        if (typeof sourceEditor !== 'undefined' && sourceEditor) sourceEditor.layout();
        if (typeof targetEditor !== 'undefined' && targetEditor) targetEditor.layout();
        if (typeof diffEditor !== 'undefined' && diffEditor) diffEditor.layout();
    });

    // === Navigation Helper ===
    function navigateToSection(targetId) {
        if (!targetId) return;
        const allSections = document.querySelectorAll('.hero, .section');
        allSections.forEach(sec => sec.classList.remove('active-section'));
        const targetSec = document.getElementById(targetId);
        if (targetSec) {
            targetSec.classList.add('active-section');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (targetId === 'demo') {
                setTimeout(() => {
                    if (typeof sourceEditor !== 'undefined' && sourceEditor) sourceEditor.layout();
                    if (typeof targetEditor !== 'undefined' && targetEditor) targetEditor.layout();
                    if (typeof diffEditor !== 'undefined' && diffEditor) diffEditor.layout();
                }, 150);
            }
        }
        if (navLinks) navLinks.classList.remove('active');
        if (hamburger) {
            const icon = hamburger.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        }
        const floatingBackBtn = document.getElementById('floating-back-btn');
        if (floatingBackBtn) {
            if (targetId === 'home') {
                floatingBackBtn.classList.remove('show');
            } else {
                floatingBackBtn.classList.add('show');
            }
        }
    }
    window.navigateToSection = navigateToSection;

    // Handle SPA navigation and close mobile menu on link click
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.length > 1) {
                e.preventDefault();
                const targetId = href.substring(1);
                navigateToSection(targetId);
            }
        });
    });

    // Close menu when clicking outside of it
    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && !hamburger.contains(e.target)) {
            navLinks.classList.remove('active');
            if (hamburger.querySelector('i')) {
                hamburger.querySelector('i').classList.remove('fa-xmark');
                hamburger.querySelector('i').classList.add('fa-bars');
            }
        }
    });

    // === 2. Dark/Light Theme Toggle ===
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Check local storage for theme
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        body.setAttribute('data-theme', 'light');
        body.classList.remove('dark-mode');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }

    themeToggleBtn.addEventListener('click', () => {
        if (body.getAttribute('data-theme') === 'light') {
            body.removeAttribute('data-theme');
            body.classList.add('dark-mode');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        } else {
            body.setAttribute('data-theme', 'light');
            body.classList.remove('dark-mode');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        }
    });

    // === 3. Typing Animation ===
    const typingText = "Parse. Analyze. Translate.";
    const typingElement = document.getElementById('typing-text');
    let typeIndex = 0;

    function type() {
        if (typeIndex < typingText.length) {
            typingElement.textContent += typingText.charAt(typeIndex);
            typeIndex++;
            setTimeout(type, 100);
        } else {
            setTimeout(() => {
                typingElement.textContent = "";
                typeIndex = 0;
                type();
            }, 3000);
        }
    }
    type();

    // === 4. Scroll Animations (Intersection Observer) ===
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // If it's a stat number, trigger count animation
                if (entry.target.classList.contains('stat-number') && !entry.target.classList.contains('counted')) {
                    animateValue(entry.target);
                    entry.target.classList.add('counted');
                }
            }
        });
    }, observerOptions);

    document.querySelectorAll('.slide-up, .stat-number').forEach(el => {
        observer.observe(el);
    });

    // === 5. Animated Counters ===
    function animateValue(obj) {
        let startTimestamp = null;
        const duration = 2000;
        const target = parseFloat(obj.getAttribute('data-target'));
        const isFloat = obj.classList.contains('float');

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            let current = easeProgress * target;
            if (isFloat) {
                obj.innerHTML = current.toFixed(1);
            } else {
                obj.innerHTML = Math.floor(current);
            }

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = isFloat ? target.toFixed(1) : target;
            }
        };
        window.requestAnimationFrame(step);
    }

    // Set Copyright Year
    document.getElementById('year').textContent = new Date().getFullYear();

    // === 6. Editor Features (Monaco) & Dummy Implementation ===
    let sourceEditor, targetEditor, diffEditor;
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    const btnToggleDiff = document.getElementById('btn-toggle-diff');
    const targetEditorContainer = document.getElementById('target-editor');
    const diffEditorContainer = document.getElementById('diff-editor');
    let isDiffView = false;
    let isEditorLight = false;

    // ==========================================================
    // FIREBASE AUTHENTICATION & PER-USER TRANSLATION HISTORY
    // ==========================================================
    const firebaseConfig = {
        apiKey: "AIzaSyDKNJ1w9aexAiv0ufTLkXTxbvH4OOFpXSE",
        authDomain: "syn2sem.firebaseapp.com",
        projectId: "syn2sem",
        storageBucket: "syn2sem.firebasestorage.app",
        messagingSenderId: "802073827923",
        appId: "1:802073827923:web:190b2ca57a5e8bc62e04a6",
        measurementId: "G-8JRS67RW5H"
    };

    let fbAuth = null;
    let fbDb = null;
    let currentUser = null;

    if (window.firebase) {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            fbAuth = firebase.auth();
            fbDb = firebase.firestore ? firebase.firestore() : null;
        } catch (e) {
            console.warn("Firebase initialization notice:", e);
        }
    }

    // Auth Modal DOM Elements
    const authOverlay = document.getElementById('auth-overlay');
    const authCard = document.getElementById('auth-card');
    const btnOpenAuth = document.getElementById('btn-open-auth');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    const btnSwitchToRegister = document.getElementById('btn-switch-to-register');
    const btnSwitchToLogin = document.getElementById('btn-switch-to-login');
    const linkGoToRegister = document.getElementById('link-go-to-register');
    const linkGoToLogin = document.getElementById('link-go-to-login');
    const btnGoogleLogin = document.getElementById('btn-google-login');
    const btnGoogleRegister = document.getElementById('btn-google-register');
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    const btnResendVerification = document.getElementById('btn-resend-verification');
    const formLoginEmail = document.getElementById('form-login-email');
    const formRegisterEmail = document.getElementById('form-register-email');
    const loginError = document.getElementById('login-error');
    const loginStatus = document.getElementById('login-status');
    const registerError = document.getElementById('register-error');
    const rememberMe = document.getElementById('remember-me');
    const userProfileBadge = document.getElementById('user-profile-badge');
    const userAvatar = document.getElementById('user-avatar');
    const userDisplayName = document.getElementById('user-display-name');
    const btnLogout = document.getElementById('btn-logout');
    const historyUserEmail = document.getElementById('history-user-email');
    let authReturnFocus = null;
    let authActionsBusy = false;
    let authStateReady = false;
    let resolveAuthStateReady;
    const authStateInitialized = new Promise((resolve) => {
        resolveAuthStateReady = resolve;
    });

    function getAuthErrorMessage(error, action) {
        const code = error && error.code;
        const messages = {
            'auth/invalid-email': 'Enter a valid email address.',
            'auth/user-disabled': 'This account is disabled. Contact support for help.',
            'auth/user-not-found': 'Email or password is incorrect.',
            'auth/wrong-password': 'Email or password is incorrect.',
            'auth/invalid-credential': 'Email or password is incorrect.',
            'auth/network-request-failed': 'A network error occurred. Check your connection and try again.',
            'auth/too-many-requests': 'There have been too many attempts. Wait a little and try again.',
            'auth/email-already-in-use': 'An account already exists for this email. Sign in instead.',
            'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
            'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase Authentication settings.',
            'auth/unauthorized-domain': 'This website domain is not authorized for Firebase sign-in. Add it in Firebase Authentication settings.',
            'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.',
            'auth/operation-not-supported-in-this-environment': 'Google sign-in is not supported in this browser context. Open the site in a standard browser and try again.',
            'auth/account-exists-with-different-credential': 'An account already exists for this email with a different sign-in method. Sign in using that method.',
            'auth/credential-already-in-use': 'This Google account is already linked to another account.',
            'auth/invalid-action-code': 'This verification or password-reset link is invalid or expired. Request a new one.',
            'auth/expired-action-code': 'This verification or password-reset link has expired. Request a new one.'
        };

        if (code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled.';
        if (action === 'login' && ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(code)) {
            return 'Could not sign in with that email and password. If you created this account with Google, choose “Continue with Google”, or reset your password.';
        }
        if (action === 'reset' && (code === 'auth/user-not-found' || code === 'auth/user-disabled')) {
            return 'If an account exists for that address, a password-reset email has been sent.';
        }
        if (messages[code]) return messages[code];
        if (action === 'reset') return 'Could not send the password-reset email. Check the address and try again.';
        if (action === 'verification') return 'Could not send the verification email. Please try again.';
        if (action === 'register') return 'Could not create your account. Check your details and try again.';
        if (action === 'google') return 'Google sign-in could not be completed. Please try again.';
        return 'Sign-in could not be completed. Check your details and try again.';
    }

    function setAuthActionsBusy(isBusy, activeButton, pendingText) {
        authActionsBusy = isBusy;
        document.querySelectorAll('[data-auth-action]').forEach((button) => {
            if (isBusy) {
                if (!button.dataset.idleMarkup) button.dataset.idleMarkup = button.innerHTML;
                button.disabled = true;
                button.setAttribute('aria-busy', 'true');
                if (button === activeButton) button.textContent = pendingText;
            } else {
                button.disabled = false;
                button.removeAttribute('aria-busy');
                if (button.dataset.idleMarkup) button.innerHTML = button.dataset.idleMarkup;
            }
        });
    }

    function clearAuthErrors() {
        if (loginStatus) {
            loginStatus.textContent = '';
            loginStatus.classList.add('hidden');
            loginStatus.style.display = 'none';
        }
        if (loginError) {
            loginError.textContent = '';
            loginError.classList.add('hidden');
            loginError.style.display = 'none';
        }
        if (registerError) {
            registerError.textContent = '';
            registerError.classList.add('hidden');
            registerError.style.display = 'none';
        }
    }

    function showAuthError(target, message) {
        if (!target) return;
        target.textContent = message;
        target.classList.remove('hidden');
        target.style.display = 'block';
    }

    function showAuthStatus(target, message) {
        if (!target) return;
        target.textContent = message;
        target.classList.remove('hidden');
        target.style.display = 'block';
    }

    // Globally accessible sliding toggle
    window.toggleAuthCard = function(toRegister) {
        if (!authCard) return;
        if (typeof toRegister === 'boolean') {
            if (toRegister) {
                authCard.classList.add('register');
            } else {
                authCard.classList.remove('register');
            }
        } else {
            authCard.classList.toggle('register');
        }
        const isRegister = authCard.classList.contains('register');
        const loginForm = authCard.querySelector('.form.login');
        const registerForm = authCard.querySelector('.form.register');
        const loginHero = authCard.querySelector('.auth-hero.login');
        const registerHero = authCard.querySelector('.auth-hero.register');
        if (loginForm) loginForm.setAttribute('aria-hidden', String(isRegister));
        if (registerForm) registerForm.setAttribute('aria-hidden', String(!isRegister));
        if (loginHero) loginHero.setAttribute('aria-hidden', String(isRegister));
        if (registerHero) registerHero.setAttribute('aria-hidden', String(!isRegister));
        authCard.setAttribute('aria-labelledby', isRegister ? 'register-dialog-title' : 'auth-dialog-title');
        clearAuthErrors();
        if (authOverlay && authOverlay.style.display !== 'none' && authOverlay.contains(document.activeElement)) {
            const activeInput = authCard.querySelector(isRegister ? '.form.register input' : '.form.login input');
            if (activeInput) activeInput.focus();
        }
    };

    // Modal open/close & slide transitions
    function openAuthModal(isRegister = false) {
        if (!authOverlay) return;
        authReturnFocus = document.activeElement;
        window.toggleAuthCard(isRegister);
        clearAuthErrors();
        authOverlay.style.display = 'flex';
        authOverlay.classList.remove('hidden');
        document.body.classList.add('auth-modal-open');
        const initialInput = document.getElementById(isRegister ? 'register-name' : 'login-email');
        if (initialInput) initialInput.focus();
    }

    function closeAuthModal() {
        if (authOverlay) {
            authOverlay.classList.add('hidden');
            authOverlay.style.display = 'none';
        }
        document.body.classList.remove('auth-modal-open');
        clearAuthErrors();
        if (authReturnFocus && typeof authReturnFocus.focus === 'function') authReturnFocus.focus();
    }

    if (btnOpenAuth) btnOpenAuth.addEventListener('click', () => openAuthModal(false));
    if (btnCloseAuth) btnCloseAuth.addEventListener('click', closeAuthModal);
    if (btnSwitchToRegister) btnSwitchToRegister.addEventListener('click', (e) => {
        e.stopPropagation();
        window.toggleAuthCard(true);
    });
    if (btnSwitchToLogin) btnSwitchToLogin.addEventListener('click', (e) => {
        e.stopPropagation();
        window.toggleAuthCard(false);
    });
    if (linkGoToRegister) linkGoToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        window.toggleAuthCard(true);
    });
    if (linkGoToLogin) linkGoToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        window.toggleAuthCard(false);
    });

    // Close on background backdrop click
    if (authOverlay) {
        authOverlay.addEventListener('click', (e) => {
            if (e.target === authOverlay) closeAuthModal();
        });
        authOverlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeAuthModal();
                return;
            }
            if (e.key !== 'Tab') return;
            const focusable = Array.from(authOverlay.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
            )).filter(element => element.getClientRects().length > 0);
            if (!focusable.length) {
                e.preventDefault();
                authCard.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && (document.activeElement === first || !authOverlay.contains(document.activeElement))) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && (document.activeElement === last || !authOverlay.contains(document.activeElement))) {
                e.preventDefault();
                first.focus();
            }
        });
    }

    // Auth State Observer
    function updateAuthState(user) {
        currentUser = user;
        if (!authStateReady) {
            authStateReady = true;
            resolveAuthStateReady();
        }
        if (user) {
            if (btnOpenAuth) btnOpenAuth.style.display = 'none';
            if (userProfileBadge) {
                userProfileBadge.style.display = 'flex';
                userProfileBadge.classList.remove('hidden');
            }
            const email = user.email || '';
            const name = user.displayName || email.split('@')[0] || 'User';
            const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff`;
            if (userDisplayName) userDisplayName.textContent = name;
            if (userAvatar) userAvatar.src = avatarUrl;
            if (historyUserEmail) historyUserEmail.textContent = email;
            if (btnResendVerification) btnResendVerification.style.display = email && !user.emailVerified ? 'inline-flex' : 'none';
        } else {
            if (btnOpenAuth) btnOpenAuth.style.display = 'inline-flex';
            if (userProfileBadge) {
                userProfileBadge.style.display = 'none';
                userProfileBadge.classList.add('hidden');
            }
            if (historyUserEmail) historyUserEmail.textContent = 'Guest User';
            if (btnResendVerification) btnResendVerification.style.display = 'none';
        }
    }

    if (fbAuth) {
        fbAuth.onAuthStateChanged((user) => {
            updateAuthState(user);
        }, (error) => {
            console.error("Firebase auth state error:", error);
            if (!authStateReady) {
                authStateReady = true;
                resolveAuthStateReady();
            }
        });
    }

    // Google Sign-in Handler
    async function handleGoogleSignIn(errorTarget, button) {
        if (!fbAuth) {
            showAuthError(errorTarget, 'Sign-in is currently unavailable. Check your connection, then try again.');
            return;
        }
        const provider = new firebase.auth.GoogleAuthProvider();
        if (authActionsBusy) return;
        setAuthActionsBusy(true, button, 'Connecting...');
        try {
            const result = await fbAuth.signInWithPopup(provider);
            const userName = result.user.displayName || result.user.email || 'back';
            showToast(result.additionalUserInfo && result.additionalUserInfo.isNewUser
                ? `Google account created. Welcome, ${userName}!`
                : `Welcome, ${userName}!`);
            closeAuthModal();
        } catch (err) {
            console.error("Google sign-in error:", err);
            const message = getAuthErrorMessage(err, 'google');
            if (err.code !== 'auth/popup-closed-by-user') showAuthError(errorTarget, message);
        } finally {
            setAuthActionsBusy(false);
        }
    }

    if (btnGoogleLogin) btnGoogleLogin.addEventListener('click', () => {
        clearAuthErrors();
        handleGoogleSignIn(loginError, btnGoogleLogin);
    });
    if (btnGoogleRegister) btnGoogleRegister.addEventListener('click', () => {
        clearAuthErrors();
        handleGoogleSignIn(registerError, btnGoogleRegister);
    });

    // Email/Password Login
    if (formLoginEmail) {
        formLoginEmail.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAuthErrors();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            if (!fbAuth) {
                showAuthError(loginError, 'Sign-in is currently unavailable. Check your connection, then try again.');
                return;
            }
            if (authActionsBusy) return;
            const submitButton = formLoginEmail.querySelector('[type="submit"]');
            setAuthActionsBusy(true, submitButton, 'Signing in...');
            try {
                await fbAuth.setPersistence(
                    rememberMe && rememberMe.checked
                        ? firebase.auth.Auth.Persistence.LOCAL
                        : firebase.auth.Auth.Persistence.SESSION
                );
                const cred = await fbAuth.signInWithEmailAndPassword(email, password);
                showToast(`Welcome back, ${cred.user.displayName || cred.user.email || 'back'}!`);
                closeAuthModal();
                formLoginEmail.reset();
            } catch (err) {
                console.error("Email login error:", err);
                showAuthError(loginError, getAuthErrorMessage(err, 'login'));
            } finally {
                setAuthActionsBusy(false);
            }
        });
    }

    // Email/Password Register
    if (formRegisterEmail) {
        formRegisterEmail.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAuthErrors();
            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            if (!fbAuth) {
                showAuthError(registerError, 'Account creation is currently unavailable. Check your connection, then try again.');
                return;
            }
            if (authActionsBusy) return;
            const submitButton = formRegisterEmail.querySelector('[type="submit"]');
            setAuthActionsBusy(true, submitButton, 'Creating account...');
            try {
                const cred = await fbAuth.createUserWithEmailAndPassword(email, password);
                let profileUpdated = true;
                if (name && cred.user.updateProfile) {
                    try {
                        await cred.user.updateProfile({ displayName: name });
                    } catch (profileError) {
                        profileUpdated = false;
                        console.error("Account created, but profile update failed:", profileError);
                    }
                }
                updateAuthState(cred.user);
                let verificationSent = true;
                if (cred.user.sendEmailVerification) {
                    try {
                        await cred.user.sendEmailVerification();
                    } catch (verificationError) {
                        verificationSent = false;
                        console.error("Account created, but verification email failed:", verificationError);
                    }
                }
                const notice = [
                    `Account created. Welcome, ${name || email}!`,
                    verificationSent ? 'Check your inbox to verify your email.' : 'The verification email could not be sent; use Verify email in your profile to retry.',
                    profileUpdated ? '' : 'Your profile name could not be saved.'
                ].filter(Boolean).join(' ');
                showToast(notice, verificationSent && profileUpdated ? 'default' : 'warning', 6000);
                closeAuthModal();
                formRegisterEmail.reset();
            } catch (err) {
                console.error("Email register error:", err);
                showAuthError(registerError, getAuthErrorMessage(err, 'register'));
            } finally {
                setAuthActionsBusy(false);
            }
        });
    }

    if (btnForgotPassword) {
        btnForgotPassword.addEventListener('click', async () => {
            clearAuthErrors();
            const emailInput = document.getElementById('login-email');
            const email = emailInput ? emailInput.value.trim() : '';
            if (!email) {
                showAuthError(loginError, 'Enter your email address first, then select Forgot password.');
                if (emailInput) emailInput.focus();
                return;
            }
            if (!fbAuth) {
                showAuthError(loginError, 'Password recovery is currently unavailable. Check your connection, then try again.');
                return;
            }
            btnForgotPassword.disabled = true;
            try {
                await fbAuth.sendPasswordResetEmail(email);
                showAuthStatus(loginStatus, 'If an account exists for that address, a password-reset email has been sent.');
            } catch (err) {
                console.error("Password reset error:", err);
                if (err.code === 'auth/user-not-found' || err.code === 'auth/user-disabled') {
                    showAuthStatus(loginStatus, getAuthErrorMessage(err, 'reset'));
                } else {
                    showAuthError(loginError, getAuthErrorMessage(err, 'reset'));
                }
            } finally {
                btnForgotPassword.disabled = false;
            }
        });
    }

    if (btnResendVerification) {
        btnResendVerification.addEventListener('click', async () => {
            if (!currentUser || !currentUser.sendEmailVerification) return;
            btnResendVerification.disabled = true;
            try {
                await currentUser.sendEmailVerification();
                showToast('Verification email sent. Check your inbox.');
            } catch (err) {
                console.error("Verification email error:", err);
                showToast(getAuthErrorMessage(err, 'verification'), 'warning');
            } finally {
                btnResendVerification.disabled = false;
            }
        });
    }

    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const input = document.getElementById(button.dataset.passwordToggle);
            if (!input) return;
            const showPassword = input.type === 'password';
            input.type = showPassword ? 'text' : 'password';
            button.textContent = showPassword ? 'Hide' : 'Show';
            button.setAttribute('aria-label', `${showPassword ? 'Hide' : 'Show'} password`);
            button.setAttribute('aria-pressed', String(showPassword));
        });
    });

    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (fbAuth) {
                try {
                    await fbAuth.signOut();
                    showToast("Signed out successfully.");
                } catch (err) {
                    console.error("Sign-out error:", err);
                    showToast("Could not sign out. Please try again.", 'warning');
                }
            }
        });
    }

    // --- History Modal Logic (Per-User Isolated Storage) ---
    const historyOverlay = document.getElementById('history-overlay');
    const btnHistory = document.getElementById('btn-history');
    const btnCloseHistory = document.getElementById('btn-close-history');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const historyList = document.getElementById('history-list');
    const historySearch = document.getElementById('history-search');
    const historySourceFilter = document.getElementById('history-source-filter');
    const historyTargetFilter = document.getElementById('history-target-filter');
    const historyFavoritesOnly = document.getElementById('history-favorites-only');
    const historyResultCount = document.getElementById('history-result-count');
    let historyItems = [];

    function getUserHistoryKey() {
        if (currentUser && currentUser.uid) {
            return `syn2sem_history_${currentUser.uid}`;
        }
        return 'syn2sem_history_guest';
    }

    async function loadHistory() {
        if (historyUserEmail) {
            historyUserEmail.textContent = currentUser
                ? `${currentUser.email || 'Signed in'} · synced to your account`
                : 'Guest mode · stored on this device';
        }

        let items = [];
        let cloudLoadFailed = false;

        historyList.textContent = 'Loading translation history...';

        if (fbDb && currentUser && currentUser.uid) {
            try {
                const snapshot = await fbDb.collection('users')
                    .doc(currentUser.uid)
                    .collection('translations')
                    .orderBy('timestamp', 'desc')
                    .limit(25)
                    .get();

                if (!snapshot.empty) {
                    items = snapshot.docs.map(doc => ({
                        ...doc.data(),
                        id: doc.id,
                        firestoreId: doc.id
                    }));
                }
            } catch (err) {
                cloudLoadFailed = true;
                console.error("Firestore history load error, falling back to local user store:", err);
            }
        }

        if (!items || items.length === 0) {
            try {
                const key = getUserHistoryKey();
                items = JSON.parse(localStorage.getItem(key) || '[]');
            } catch (err) {
                console.error("Local translation history could not be read:", err);
                historyList.textContent = 'History could not be read from this browser.';
                showToast('Could not load translation history.', 'warning');
                return;
            }
        }

        if (items.length === 0) {
            historyItems = [];
            populateHistoryLanguageFilters(historyItems);
            if (historyResultCount) historyResultCount.textContent = '0 translations';
            renderHistory();
            historyList.textContent = currentUser
                ? 'No saved translations yet. Translate code while signed in and it will appear here.'
                : 'No saved translations on this device yet. Sign in to sync your history across devices.';
            if (cloudLoadFailed) {
                showToast('Cloud history is unavailable. Showing history saved on this device.', 'warning');
            }
            return;
        }

        historyItems = items.map((item, index) => ({
            ...item,
            id: item.id || item.firestoreId || `legacy-${item.timestamp || 'untimed'}-${index}`,
            firestoreId: item.firestoreId || (currentUser && fbDb ? item.id : undefined),
            favorite: Boolean(item.favorite)
        }));
        populateHistoryLanguageFilters(historyItems);
        renderHistory();
        if (cloudLoadFailed) {
            showToast('Cloud history is unavailable. Showing history saved on this device.', 'warning');
        }
    }

    function populateHistoryLanguageFilters(items) {
        [[historySourceFilter, 'sourceLang'], [historyTargetFilter, 'targetLang']].forEach(([select, property]) => {
            if (!select) return;
            const selected = select.value;
            const languages = [...new Set(items.map(item => item[property]).filter(Boolean))].sort();
            select.replaceChildren(new Option('All', ''));
            languages.forEach(language => select.add(new Option(language, language)));
            if (languages.includes(selected)) select.value = selected;
        });
    }

    function renderHistory() {
        if (!historyList) return;
        const query = (historySearch ? historySearch.value : '').trim().toLowerCase();
        const source = historySourceFilter ? historySourceFilter.value : '';
        const target = historyTargetFilter ? historyTargetFilter.value : '';
        const favoritesOnly = Boolean(historyFavoritesOnly && historyFavoritesOnly.checked);
        const filtered = historyItems.filter(item => {
            const content = `${item.sourceLang || ''} ${item.targetLang || ''} ${item.sourceCode || ''} ${item.targetCode || ''}`.toLowerCase();
            return (!query || content.includes(query)) &&
                (!source || item.sourceLang === source) &&
                (!target || item.targetLang === target) &&
                (!favoritesOnly || item.favorite);
        });
        if (historyResultCount) {
            historyResultCount.textContent = `${filtered.length} of ${historyItems.length} translation${historyItems.length === 1 ? '' : 's'}`;
        }
        historyList.replaceChildren();
        if (!filtered.length) {
            historyList.textContent = historyItems.length
                ? 'No translations match these search and filter settings.'
                : 'No saved translations yet. Translate code while signed in and it will appear here.';
            return;
        }

        filtered.forEach(item => {
            const entry = document.createElement('article');
            entry.className = 'history-item';
            const restore = document.createElement('button');
            restore.type = 'button';
            restore.className = 'history-restore';
            restore.setAttribute('aria-label', `Restore ${item.sourceLang || 'source'} to ${item.targetLang || 'target'} translation`);
            const languages = document.createElement('span');
            languages.className = 'history-item-langs';
            languages.textContent = `${item.sourceLang || 'Source'} → ${item.targetLang || 'Target'}`;
            const sourcePreview = document.createElement('span');
            sourcePreview.className = 'history-item-code';
            sourcePreview.textContent = `Input: ${(item.sourceCode || '').substring(0, 100)}`;
            const targetPreview = document.createElement('span');
            targetPreview.className = 'history-item-code history-item-output';
            targetPreview.textContent = `Output: ${(item.targetCode || '').substring(0, 100)}`;
            const savedAt = document.createElement('time');
            savedAt.className = 'history-item-time';
            const timestamp = Number(item.timestamp);
            if (Number.isFinite(timestamp) && timestamp > 0) {
                savedAt.dateTime = new Date(timestamp).toISOString();
                savedAt.textContent = new Date(timestamp).toLocaleString();
            } else {
                savedAt.textContent = 'Saved time unavailable';
            }
            restore.append(languages, sourcePreview, targetPreview, savedAt);
            restore.addEventListener('click', () => {
                sourceLang.value = item.sourceLang;
                targetLang.value = item.targetLang;
                if (typeof sourceEditor !== 'undefined' && sourceEditor) sourceEditor.setValue(item.sourceCode || '');
                if (typeof targetEditor !== 'undefined' && targetEditor) targetEditor.setValue(item.targetCode || '');
                historyOverlay.classList.add('hidden');
                showToast(`Restored translation (${item.sourceLang} → ${item.targetLang})`);
            });
            const actions = document.createElement('div');
            actions.className = 'history-item-actions';
            const favorite = document.createElement('button');
            favorite.type = 'button';
            favorite.className = 'history-item-action history-favorite-button';
            favorite.setAttribute('aria-label', item.favorite ? 'Remove from favorites' : 'Add to favorites');
            favorite.setAttribute('aria-pressed', String(item.favorite));
            favorite.title = item.favorite ? 'Remove from favorites' : 'Add to favorites';
            favorite.innerHTML = `<i class="fa-${item.favorite ? 'solid' : 'regular'} fa-star" aria-hidden="true"></i>`;
            favorite.addEventListener('click', () => toggleHistoryFavorite(item));
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'history-item-action history-delete-button';
            remove.setAttribute('aria-label', 'Delete translation from history');
            remove.title = 'Delete translation';
            remove.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
            remove.addEventListener('click', () => deleteHistoryItem(item));
            actions.append(favorite, remove);
            entry.append(restore, actions);
            historyList.appendChild(entry);
        });
    }

    function persistLocalHistory() {
        try {
            localStorage.setItem(getUserHistoryKey(), JSON.stringify(historyItems));
            return true;
        } catch (err) {
            console.error("Local translation history could not be saved:", err);
            showToast('Could not update history on this device.', 'warning');
            return false;
        }
    }

    async function toggleHistoryFavorite(item) {
        const previous = item.favorite;
        item.favorite = !previous;
        if (!persistLocalHistory()) {
            item.favorite = previous;
            renderHistory();
            return;
        }
        if (fbDb && currentUser && item.firestoreId) {
            try {
                await fbDb.collection('users').doc(currentUser.uid)
                    .collection('translations').doc(item.firestoreId).update({ favorite: item.favorite });
            } catch (err) {
                console.error("Cloud favorite update failed:", err);
                showToast('Favorite saved on this device, but cloud sync failed.', 'warning');
            }
        }
        renderHistory();
    }

    async function deleteHistoryItem(item) {
        const previousItems = historyItems;
        historyItems = historyItems.filter(entry => entry.id !== item.id);
        if (!persistLocalHistory()) {
            historyItems = previousItems;
            renderHistory();
            return;
        }
        if (fbDb && currentUser && item.firestoreId) {
            try {
                await fbDb.collection('users').doc(currentUser.uid)
                    .collection('translations').doc(item.firestoreId).delete();
            } catch (err) {
                historyItems = previousItems;
                persistLocalHistory();
                renderHistory();
                console.error("Cloud history entry deletion failed:", err);
                showToast('Could not delete this entry from cloud history. Please try again.', 'warning');
                return;
            }
        }
        renderHistory();
        showToast('Translation removed from history.');
    }

    async function saveHistory(sourceCode, targetCode, sLang, tLang) {
        const id = `translation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const item = {
            id,
            sourceCode,
            targetCode,
            sourceLang: sLang,
            targetLang: tLang,
            timestamp: Date.now(),
            favorite: false
        };

        try {
            const key = getUserHistoryKey();
            const stored = JSON.parse(localStorage.getItem(key) || '[]');
            stored.unshift(item);
            if (stored.length > 25) stored.pop();
            localStorage.setItem(key, JSON.stringify(stored));
        } catch (err) {
            console.error("Local translation history could not be saved:", err);
            showToast('Translation completed, but history could not be saved on this device.', 'warning');
        }

        if (fbDb && currentUser && currentUser.uid) {
            try {
                await fbDb.collection('users')
                    .doc(currentUser.uid)
                    .collection('translations')
                    .doc(id)
                    .set(item);
            } catch (err) {
                console.error("Firestore history save error:", err);
                showToast('Translation completed, but cloud history could not be saved.', 'warning');
            }
        }
    }

    [historySearch, historySourceFilter, historyTargetFilter, historyFavoritesOnly].forEach(control => {
        if (!control) return;
        control.addEventListener(control.tagName === 'SELECT' || control.type === 'checkbox' ? 'change' : 'input', renderHistory);
    });

    if (btnHistory) {
        btnHistory.addEventListener('click', async () => {
            historyOverlay.classList.remove('hidden');
            try {
                await loadHistory();
            } catch (err) {
                console.error("Translation history could not be loaded:", err);
                historyList.textContent = 'History could not be loaded. Please try again.';
                showToast('Could not load translation history.', 'warning');
            }
        });
    }
    if (btnCloseHistory) btnCloseHistory.addEventListener('click', () => historyOverlay.classList.add('hidden'));
    if (btnClearHistory) btnClearHistory.addEventListener('click', async () => {
        const clearMessage = currentUser
            ? 'Clear this translation history from this device and the cloud? This cannot be undone.'
            : 'Clear this translation history from this device? This cannot be undone.';
        if (!window.confirm(clearMessage)) return;
        if (fbDb && currentUser && currentUser.uid) {
            try {
                const snapshot = await fbDb.collection('users')
                    .doc(currentUser.uid)
                    .collection('translations')
                    .get();
                const batch = fbDb.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            } catch (err) {
                console.error("Firestore history clear error:", err);
                showToast("Could not clear cloud history. Your local history was kept; please try again.", 'warning');
                return;
            }
        }
        localStorage.removeItem(getUserHistoryKey());
        historyItems = [];
        loadHistory();
        showToast("History cleared for this user.");
    });
    // --- End History & Auth Logic ---

    // --- API Key & Cloud AI Settings Logic ---
    const apiOverlay = document.getElementById('api-overlay');
    const btnApiSettings = document.getElementById('btn-api-settings');
    const btnCloseApi = document.getElementById('btn-close-api');
    const btnSaveApiKey = document.getElementById('btn-save-api-key');
    const btnRemoveApiKey = document.getElementById('btn-remove-api-key');
    const selectAiProvider = document.getElementById('ai-provider');
    const inputAiApiKeys = [
        document.getElementById('ai-api-key-1'),
        document.getElementById('ai-api-key-2'),
        document.getElementById('ai-api-key-3')
    ];
    const inputAiModel = document.getElementById('ai-model');
    const selectExecutionRunner = document.getElementById('execution-runner');
    const inputPistonUrl = document.getElementById('piston-url');
    const inputPistonKey = document.getElementById('piston-key');
    const apiStatusText = document.getElementById('api-status-text');
    const savedAiSettingsKey = 'syn2sem.aiSettings';

    function readSavedAiSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(savedAiSettingsKey) || '{}');
            const apiKeys = Array.isArray(saved.apiKeys)
                ? saved.apiKeys.filter(key => typeof key === 'string' && key.trim())
                : (typeof saved.apiKey === 'string' && saved.apiKey.trim() ? [saved.apiKey] : []);
            return {
                apiKeys,
                provider: typeof saved.provider === 'string' ? saved.provider : '',
                model: typeof saved.model === 'string' ? saved.model : '',
                runner: typeof saved.runner === 'string' ? saved.runner : '',
                pistonUrl: typeof saved.pistonUrl === 'string' ? saved.pistonUrl : '',
                pistonKey: typeof saved.pistonKey === 'string' ? saved.pistonKey : ''
            };
        } catch (error) {
            console.warn('Could not read saved AI settings from this browser:', error);
            return { apiKeys: [], provider: '', model: '', runner: '', pistonUrl: '', pistonKey: '' };
        }
    }

    async function checkApiConfig() {
        try {
            const res = await fetch('/api-config');
            if (res.ok) {
                const data = await res.json();
                const saved = readSavedAiSettings();
                const provider = saved.provider || data.provider;
                const model = saved.model || data.model;
                if (saved.apiKeys.length) {
                    if (apiStatusText) {
                        const count = saved.apiKeys.length;
                        apiStatusText.textContent = `${count} API key${count === 1 ? '' : 's'} saved in this browser (${String(provider || 'AI').toUpperCase()}); automatic failover enabled.`;
                    }
                } else if (data.configured) {
                    if (apiStatusText) apiStatusText.textContent = `A server-side ${String(data.provider || 'AI').toUpperCase()} key is configured.`;
                } else {
                    if (apiStatusText) apiStatusText.innerHTML = `<span style="color: #94a3b8;">AST Compiler (Offline mode)</span>`;
                }
                if (provider && selectAiProvider) selectAiProvider.value = provider;
                if (model && model !== 'none' && inputAiModel) inputAiModel.value = model;

                if (selectExecutionRunner && (saved.runner || data.runner)) {
                    selectExecutionRunner.value = saved.runner || data.runner;
                }
                if (inputPistonUrl && (saved.pistonUrl || data.pistonUrl)) {
                    inputPistonUrl.value = saved.pistonUrl || data.pistonUrl;
                }
            }
        } catch (e) {
            if (apiStatusText) apiStatusText.textContent = 'AST Compiler (Offline mode)';
        }
    }

    if (btnApiSettings) {
        btnApiSettings.addEventListener('click', () => {
            checkApiConfig();
            if (apiOverlay) apiOverlay.classList.remove('hidden');
        });
    }
    if (btnCloseApi) {
        btnCloseApi.addEventListener('click', () => {
            if (apiOverlay) apiOverlay.classList.add('hidden');
        });
    }
    if (apiOverlay) {
        apiOverlay.addEventListener('click', (e) => {
            if (e.target === apiOverlay) apiOverlay.classList.add('hidden');
        });
    }

    if (btnSaveApiKey) {
        btnSaveApiKey.addEventListener('click', async () => {
            const enteredApiKeys = inputAiApiKeys
                .map(input => (input ? input.value : '').trim())
                .filter(Boolean);
            const provider = selectAiProvider ? selectAiProvider.value : 'gemini';
            const model = (inputAiModel.value || '').trim();
            const runner = selectExecutionRunner ? selectExecutionRunner.value : 'piston';
            const pistonUrl = (inputPistonUrl ? inputPistonUrl.value : '').trim();
            const pistonKey = (inputPistonKey ? inputPistonKey.value : '').trim();
            const existingAiSettings = readSavedAiSettings();
            const apiKeys = enteredApiKeys.length ? enteredApiKeys : existingAiSettings.apiKeys;
            const savedPistonKey = pistonKey || existingAiSettings.pistonKey;

            const payload = {
                runner,
                provider
            };
            if (model) payload.model = model;
            if (pistonUrl !== undefined) payload.pistonUrl = pistonUrl;
            if (savedPistonKey) payload.pistonKey = savedPistonKey;

            try {
                localStorage.setItem(savedAiSettingsKey, JSON.stringify({
                    apiKeys,
                    provider,
                    model,
                    runner,
                    pistonUrl,
                    pistonKey: savedPistonKey
                }));
                const res = await fetch('/set-api-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showToast(`Settings saved! Runner: ${runner.toUpperCase()}`);
                    inputAiApiKeys.forEach(input => { if (input) input.value = ''; });
                    checkApiConfig();
                    setTimeout(() => { if (apiOverlay) apiOverlay.classList.add('hidden'); }, 600);
                } else {
                    alert('Failed to save settings.');
                }
            } catch (err) {
                alert('Failed to connect to server to save settings.');
            }
        });
    }

    if (btnRemoveApiKey) {
        btnRemoveApiKey.addEventListener('click', async () => {
            try {
                localStorage.removeItem(savedAiSettingsKey);
                await fetch('/set-api-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: '', provider: '', model: '', runner: 'piston', pistonUrl: '', pistonKey: '' })
                });
                inputAiApiKeys.forEach(input => { if (input) input.value = ''; });
                if (inputAiModel) inputAiModel.value = '';
                if (inputPistonUrl) inputPistonUrl.value = '';
                if (inputPistonKey) inputPistonKey.value = '';
                showToast('Settings reset to default.');
                checkApiConfig();
            } catch (e) {}
        });
    }

    checkApiConfig();
    // --- End API Key Logic ---

    // Load Monaco Editor
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.41.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        try {
        
        sourceEditor = monaco.editor.create(document.getElementById('source-editor'), {
            value: `public class Demo{\n  public static void main(String args[]){\n    System.out.println("Hello");\n  }\n}`,
            language: 'java',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            scrollbar: {
                alwaysConsumeOnTouch: false
            }
        });
        
        // Auto Detect Language Helper Function
        function autoDetectLanguage(code) {
            if (!code || code.trim().length < 5) return null;
            const text = code.trim();

            if (text.includes('public class') || text.includes('public static void main') || text.includes('System.out.print') || text.includes('Scanner ')) {
                return 'java';
            }
            if (text.includes('#include <iostream>') || text.includes('std::cout') || text.includes('std::cin') || text.includes('std::endl') || text.includes('using namespace std')) {
                return 'cpp';
            }
            if (text.includes('#include <stdio.h>') || text.includes('printf(') || text.includes('scanf(') || text.includes('#include <stdlib.h>')) {
                return 'c';
            }
            if (text.includes('def ') || text.includes('elif ') || (text.includes('print(') && !text.includes(';') && !text.includes('{')) || (text.includes(':') && !text.includes('{') && !text.includes(';'))) {
                return 'python';
            }
            if (text.includes('console.log') || text.includes('let ') || text.includes('const ') || text.includes('function ') || text.includes('=>')) {
                return 'javascript';
            }
            return null;
        }

        // Clear syntax markers when user starts typing, sync diff editor, auto-detect language & auto-analyze
        let autoDetectTimeout = null;
        sourceEditor.onDidChangeModelContent(() => {
            if (window.errorDecorations) window.errorDecorations.clear();
            if (isDiffView && diffEditor) {
                const models = diffEditor.getModel();
                if (models && models.original) {
                    models.original.setValue(sourceEditor.getValue());
                }
            }

            clearTimeout(autoDetectTimeout);
            autoDetectTimeout = setTimeout(() => {
                const code = sourceEditor.getValue();
                const detected = autoDetectLanguage(code);
                if (detected && detected !== sourceLang.value) {
                    sourceLang.value = detected;
                    monaco.editor.setModelLanguage(sourceEditor.getModel(), detected);
                    showToast(`Auto-Detected Source Language: ${detected.toUpperCase()}`);
                }
                
                // Auto-trigger analysis when code is pasted or typed
                if (code.trim().length > 5) {
                    const btnAnalyze = document.getElementById('btn-analyze');
                    if (btnAnalyze) {
                        // Show a small indication that it's analyzing
                        btnAnalyze.click();
                    }
                }
            }, 800);
        });

        targetEditor = monaco.editor.create(targetEditorContainer, {
            value: '',
            language: 'python',
            theme: 'vs-dark',
            automaticLayout: true,
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            scrollbar: {
                alwaysConsumeOnTouch: false
            }
        });

        diffEditor = monaco.editor.createDiffEditor(diffEditorContainer, {
            theme: 'vs-dark',
            automaticLayout: true,
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            renderSideBySide: window.innerWidth > 768, // Inline diff on mobile, side-by-side on laptop
            scrollbar: {
                alwaysConsumeOnTouch: false
            }
        });

        // Initialize permanent models for the diff editor
        const diffOriginalModel = monaco.editor.createModel('', 'java');
        const diffModifiedModel = monaco.editor.createModel('', 'python');
        diffEditor.setModel({
            original: diffOriginalModel,
            modified: diffModifiedModel
        });

        // Toggle Diff View
        const btnToggleDiff = document.getElementById('btn-toggle-diff');
        if (btnToggleDiff) {
            btnToggleDiff.addEventListener('click', () => {
                isDiffView = !isDiffView;
                if (isDiffView) {
                    diffEditorContainer.classList.remove('hidden');
                    const diffHeader = document.getElementById('diff-header');
                    if (diffHeader) diffHeader.classList.remove('hidden');
                    diffEditor.layout();
                } else {
                    diffEditorContainer.classList.add('hidden');
                    const diffHeader = document.getElementById('diff-header');
                    if (diffHeader) diffHeader.classList.add('hidden');
                }
            });
        }

        // Line-by-line hover highlighting (Semantic correspondence)
        let sourceDecorations = [];
        let targetDecorations = [];
        
        function updateHoverLine(lineNum) {
            if (!sourceEditor || !targetEditor) return;
            const decObj = [{
                range: new monaco.Range(lineNum, 1, lineNum, 1),
                options: { isWholeLine: true, className: 'hover-line-highlight' }
            }];
            sourceDecorations = sourceEditor.deltaDecorations(sourceDecorations, decObj);
            targetDecorations = targetEditor.deltaDecorations(targetDecorations, decObj);
        }
        
        function clearHoverLine() {
            if (sourceEditor) sourceDecorations = sourceEditor.deltaDecorations(sourceDecorations, []);
            if (targetEditor) targetDecorations = targetEditor.deltaDecorations(targetDecorations, []);
        }

        sourceEditor.onMouseMove(e => {
            if (e.target && e.target.position) updateHoverLine(e.target.position.lineNumber);
        });
        targetEditor.onMouseMove(e => {
            if (e.target && e.target.position) updateHoverLine(e.target.position.lineNumber);
        });
        sourceEditor.onMouseLeave(() => clearHoverLine());
        targetEditor.onMouseLeave(() => clearHoverLine());

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                const btnTranslate = document.getElementById('btn-translate');
                if (btnTranslate) btnTranslate.click();
            }
        });

        // Gap Analysis View is now automatically controlled by the translation engine

        // Code Theme Toggle for Editor
        const editorThemeToggle = document.querySelector('.theme-toggle-editor');
        editorThemeToggle.addEventListener('click', () => {
            isEditorLight = !isEditorLight;
            monaco.editor.setTheme(isEditorLight ? 'vs' : 'vs-dark');
            editorThemeToggle.innerHTML = isEditorLight ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-palette"></i>';
        });

        // Active Development Notification Helper for C++ & JavaScript
        const devBanner = document.getElementById('dev-lang-banner');
        const btnCloseDevBanner = document.getElementById('btn-close-dev-banner');
        if (btnCloseDevBanner && devBanner) {
            btnCloseDevBanner.addEventListener('click', () => {
                devBanner.style.display = 'none';
            });
        }

        function checkDevLang(lang, position = 'Language') {
            if (lang === 'cpp' || lang === 'javascript') {
                const langName = lang === 'cpp' ? 'C++' : 'JavaScript';
                showToast(`🚧 We are currently working on ${langName} support! Full support is active for Java, Python, and C.`, 'warning', 4500);
                if (devBanner) devBanner.style.display = 'flex';
                return true;
            } else {
                if (devBanner && sourceLang.value !== 'cpp' && sourceLang.value !== 'javascript' && targetLang.value !== 'cpp' && targetLang.value !== 'javascript') {
                    devBanner.style.display = 'none';
                }
                return false;
            }
        }

        // Language Dropdowns change model languages
        sourceLang.addEventListener('change', () => {
            monaco.editor.setModelLanguage(sourceEditor.getModel(), sourceLang.value);
            checkDevLang(sourceLang.value, 'Source');
        });
        sourceLang.addEventListener('click', () => {
            if (sourceLang.value === 'cpp' || sourceLang.value === 'javascript') {
                checkDevLang(sourceLang.value, 'Source');
            }
        });

        targetLang.addEventListener('change', () => {
            monaco.editor.setModelLanguage(targetEditor.getModel(), targetLang.value);
            updateTargetLanguagePresets();
            checkDevLang(targetLang.value, 'Target');
        });
        targetLang.addEventListener('click', () => {
            if (targetLang.value === 'cpp' || targetLang.value === 'javascript') {
                checkDevLang(targetLang.value, 'Target');
            }
        });

        // Quick Preset Language Selectors for Languages (Java, Python, C, C++, JavaScript)
        document.querySelectorAll('.btn-preset-lang').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang');
                sourceLang.value = lang;
                monaco.editor.setModelLanguage(sourceEditor.getModel(), lang);
                
                let sample = '';
                if (lang === 'java') {
                    sample = `public class Demo {\n  public static void main(String[] args) {\n    int n = 5;\n    for (int i = 0; i < n; i++) {\n      System.out.println("Value: " + i);\n    }\n  }\n}`;
                    showToast(`Loaded ${lang.toUpperCase()} Main Language Sample`);
                } else if (lang === 'python') {
                    sample = `n = 5\nfor i in range(n):\n    print(f"Value: {i}")\n`;
                    showToast(`Loaded ${lang.toUpperCase()} Main Language Sample`);
                } else if (lang === 'c') {
                    sample = `#include <stdio.h>\n\nint main(void) {\n    int n = 5;\n    for (int i = 0; i < n; i++) {\n        printf("Value: %d\\n", i);\n    }\n    return 0;\n}\n`;
                    showToast(`Loaded ${lang.toUpperCase()} Main Language Sample`);
                } else if (lang === 'cpp') {
                    sample = `#include <iostream>\n\nint main() {\n    int n = 5;\n    for (int i = 0; i < n; i++) {\n        std::cout << "Value: " << i << std::endl;\n    }\n    return 0;\n}\n`;
                    checkDevLang('cpp');
                } else if (lang === 'javascript') {
                    sample = `const n = 5;\nfor (let i = 0; i < n; i++) {\n    console.log("Value: " + i);\n}\n`;
                    checkDevLang('javascript');
                }
                sourceEditor.setValue(sample);
            });
        });

        // Predefined Translations (Core Matrix for Java, Python, C)
        const translationsMap = {
            'java_python': {
                input: `public class Demo {\n  public static void main(String[] args) {\n    int n = 5;\n    for (int i = 0; i < n; i++) {\n      System.out.println("Value: " + i);\n    }\n  }\n}`,
                output: `n = 5\nfor i in range(n):\n    print("Value: " + str(i))`
            },
            'python_java': {
                input: `n = 5\nfor i in range(n):\n    print("Value:", i)\n`,
                output: `public class Demo {\n  public static void main(String[] args) {\n    int n = 5;\n    for (int i = 0; i < n; i++) {\n      System.out.println("Value:" + i);\n    }\n  }\n}`
            },
            'java_c': {
                input: `public class Demo {\n  public static void main(String[] args) {\n    int n = 5;\n    for (int i = 0; i < n; i++) {\n      System.out.println("Value: " + i);\n    }\n  }\n}`,
                output: `#include <stdio.h>\n\nint main(void) {\n    int n = 5;\n    for (int i = 0; i < n; i++) {\n        printf("Value: %d\\n", i);\n    }\n    return 0;\n}`
            },
            'c_java': {
                input: `#include <stdio.h>\n\nint main() {\n    int n = 5;\n    for (int i = 0; i < n; i++) {\n        printf("Value: %d\\n", i);\n    }\n    return 0;\n}`,
                output: `public class Demo {\n    public static void main(String[] args) {\n        int n = 5;\n        for (int i = 0; i < n; i++) {\n            System.out.println("Value: " + i);\n        }\n    }\n}`
            },
            'c_python': {
                input: `#include <stdio.h>\n\nint main() {\n    int n = 5;\n    for (int i = 0; i < n; i++) {\n        printf("Value: %d\\n", i);\n    }\n    return 0;\n}`,
                output: `n = 5\nfor i in range(n):\n    print("Value: " + str(i))`
            },
            'python_c': {
                input: `n = 5\nfor i in range(n):\n    print(i)\n`,
                output: `#include <stdio.h>\n\nint main(void) {\n    int n = 5;\n    for (int i = 0; i < n; i++) {\n        printf("%d\\n", i);\n    }\n    return 0;\n}`
            },
            'c_javascript': {
                input: `#include <stdio.h>\n\nint main() {\n    printf("Hello World");\n    return 0;\n}`,
                output: `console.log("Hello World");`
            },
            'javascript_c': {
                input: `console.log("Hello World");`,
                output: `#include <stdio.h>\n\nint main() {\n    printf("Hello World");\n    return 0;\n}`
            },
            'cpp_python': {
                input: `#include <iostream>\n\nint main() {\n    std::cout << "Data Structures" << std::endl;\n    return 0;\n}`,
                output: `print("Data Structures")`
            },
            'python_cpp': {
                input: `print("Data Structures")`,
                output: `#include <iostream>\n\nint main() {\n    std::cout << "Data Structures" << std::endl;\n    return 0;\n}`
            }
        };

        // Analyze Code Button
        const btnAnalyze = document.getElementById('btn-analyze');
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        const dashboard = document.getElementById('results-dashboard');
        const btnTranslate = document.getElementById('btn-translate');
        let translationInProgress = false;

        if (btnTranslate) {
            const languageSelects = [sourceLang, targetLang];
            let selectionGlowTimeout;
            const updateTranslationGlow = () => {
                const languageControlActive = languageSelects.some(select =>
                    select.matches(':hover') || document.activeElement === select
                );
                btnTranslate.classList.toggle('language-selection-active', languageControlActive);
            };
            const showTranslationGlow = () => {
                btnTranslate.classList.add('language-selection-active');
                window.clearTimeout(selectionGlowTimeout);
                selectionGlowTimeout = window.setTimeout(() => {
                    updateTranslationGlow();
                }, 900);
            };

            languageSelects.forEach(select => {
                select.addEventListener('pointerenter', updateTranslationGlow);
                select.addEventListener('pointerleave', updateTranslationGlow);
                select.addEventListener('focus', () => btnTranslate.classList.add('language-selection-active'));
                select.addEventListener('blur', updateTranslationGlow);
                select.addEventListener('change', showTranslationGlow);
            });
        }
        
        btnAnalyze.addEventListener('click', async () => {
            if (!sourceEditor.getValue().trim()) {
                alert("Please enter some code to analyze.");
                return;
            }

            loadingText.textContent = "Analyzing Syntax & Semantics...";
            loadingOverlay.classList.remove('hidden');
            dashboard.classList.add('hidden');

            try {
                const response = await fetch(`/analyze-code?lang=${sourceLang.value}`, {
                    method: 'POST',
                    body: sourceEditor.getValue()
                });
                
                loadingOverlay.classList.add('hidden');
                dashboard.classList.remove('hidden');

                if (response.ok) {
                    const result = await response.json();
                    if (result.error) {
                        alert(result.message);
                        return;
                    }

                    // Syntax Errors
                    const syntaxEl = document.getElementById('res-syntax');
                    
                    // Draw or Clear Editor Decorations
                    if (window.errorDecorations) window.errorDecorations.clear();
                    
                    if (result.markers && result.markers.length > 0) {
                        const decorations = result.markers.map(m => ({
                            range: new monaco.Range(m.line, 1, m.line, 1),
                            options: {
                                isWholeLine: true,
                                className: 'error-line-highlight',
                                hoverMessage: { value: '🤖 **AI Fix:** ' + m.message }
                            }
                        }));
                        window.errorDecorations = sourceEditor.createDecorationsCollection(decorations);
                    }
                    
                    if (result.errorCount > 0) {
                        syntaxEl.innerHTML = `<i class="fa-solid fa-xmark text-red"></i> ${result.errorCount} syntax errors detected`;
                        syntaxEl.className = 'result-value text-red';
                        document.getElementById('res-gap').textContent = 'Translation Blocked - Fix Errors';
                        document.getElementById('res-score').textContent = 'N/A';
                        document.getElementById('res-time-complexity').textContent = 'N/A';
                        document.getElementById('res-space-complexity').textContent = 'N/A';
                        
                        const suggestions = document.getElementById('res-suggestions');
                        if (result.markers && result.markers.length > 0) {
                            suggestions.innerHTML = result.markers.map((m, i) => `
                                <li style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; list-style-type: none;">
                                    <strong style="color: #ff6b6b;">❌ Line ${m.line} Error:</strong><br>
                                    <div style="font-family: monospace; background: rgba(0,0,0,0.3); padding: 5px 10px; border-radius: 4px; margin: 5px 0; border-left: 3px solid #ff6b6b;">
                                        ${m.sourceLine || '(Empty or Missing Line)'}
                                    </div>
                                    <span style="color: var(--primary-color);"><strong>🤖 AI Fix:</strong> ${m.message}</span>
                                </li>
                            `).join('');
                        } else {
                            suggestions.innerHTML = `<li>AST Analysis aborted due to syntax errors.</li>`;
                        }
                    } else {
                        syntaxEl.innerHTML = '<i class="fa-solid fa-check"></i> No syntax errors detected';
                        syntaxEl.className = 'result-value text-green';
                        document.getElementById('res-gap').textContent = 'Low Risk';
                        document.getElementById('res-score').textContent = '92%';
                        document.getElementById('res-time-complexity').textContent = result.timeComplexity || 'O(1)';
                        document.getElementById('res-space-complexity').textContent = result.spaceComplexity || 'O(1)';
                        
                        const suggestions = document.getElementById('res-suggestions');
                        suggestions.innerHTML = `
                            <li><strong>Time Complexity:</strong> ${result.timeExplanation || 'N/A'}</li>
                            <li><strong>Space Complexity:</strong> ${result.spaceExplanation || 'N/A'}</li>
                            <li><strong>Cyclomatic Complexity:</strong> ${result.cyclomaticComplexity || '1'} (Independent paths)</li>
                            <li><strong>Halstead Volume:</strong> ${result.halsteadVolume || '0.00'}</li>
                            <li><strong>Halstead Difficulty:</strong> ${result.halsteadDifficulty || '0.00'}</li>
                            <li><strong>Data Flow Analysis:</strong> ${result.dataFlow || 'Verified'}</li>
                            <li><strong>Dead Code:</strong> ${result.deadCode || 'None'}</li>
                        `;
                    }
                    
                    document.getElementById('res-confidence').textContent = '96%';

                    // Semantic Logic Breakdown
                    const logicList = document.getElementById('res-logic-breakdown');
                    if (logicList) {
                        logicList.innerHTML = result.breakdown.map(item => `<li>${item}</li>`).join('');
                    }
                    
                    // Smoothly scroll the dashboard into full view after everything is populated
                    setTimeout(() => {
                        dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);

                } else {
                    alert("Failed to connect to the server.");
                }
            } catch (e) {
                console.error("Analysis failed:", e);
                loadingOverlay.classList.add('hidden');
                alert("Error during analysis. Make sure the local server is running.");
            }
        });

        // Syn2Sem Engine Translate Button (Calls Backend /translate-code)
        btnTranslate.addEventListener('click', async () => {
            if (translationInProgress) return;
            translationInProgress = true;
            const originalTranslateLabel = btnTranslate.innerHTML;
            let translationUiActive = false;
            try {
                if (fbAuth && !authStateReady) await authStateInitialized;
                if (!currentUser) {
                    showToast("Sign in to translate code.", 'warning');
                    openAuthModal(false);
                    return;
                }

                const inputCode = sourceEditor.getValue();
                if (!inputCode.trim()) {
                    showToast("Please enter code to translate.", 'warning');
                    return;
                }

                const sLang = sourceLang.value;
                const tLang = targetLang.value;
                const aiSettings = readSavedAiSettings();

                if (sLang === 'cpp' || sLang === 'javascript' || tLang === 'cpp' || tLang === 'javascript') {
                    showToast("🚧 We are currently working on C++ and JavaScript support! Full support is active for Java, Python, and C.", 'warning', 4500);
                }

                loadingText.textContent = "Translating code...";
                loadingOverlay.classList.remove('hidden');
                btnTranslate.disabled = true;
                btnTranslate.setAttribute('aria-busy', 'true');
                btnTranslate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Translating...';
                translationUiActive = true;

                const response = await fetch(`/translate-code?sourceLang=${sLang}&targetLang=${tLang}`, {
                    method: 'POST',
                    headers: {
                        'X-API-Keys': aiSettings.apiKeys.join(','),
                        'X-API-Provider': aiSettings.provider,
                        'X-API-Model': aiSettings.model
                    },
                    body: inputCode
                });

                const result = await response.json().catch(() => ({}));
                if (!response.ok || result.error) {
                    throw new Error(result.message || `Translation failed (HTTP ${response.status}).`);
                }

                const translatedCode = result.translatedCode;
                if (typeof translatedCode !== 'string' || !translatedCode.trim()) {
                    throw new Error('The translation service returned no translated code. Please try again.');
                }

                targetEditor.setValue(translatedCode);

                dashboard.classList.remove('hidden');
                if (result.similarityScore) document.getElementById('res-score').textContent = result.similarityScore;
                if (result.gapStatus) document.getElementById('res-gap').textContent = result.gapStatus;
                if (result.confidence) document.getElementById('res-confidence').textContent = result.confidence;

                const models = diffEditor.getModel();
                if (models) {
                    monaco.editor.setModelLanguage(models.original, sLang);
                    monaco.editor.setModelLanguage(models.modified, tLang);
                    models.original.setValue(inputCode);
                    models.modified.setValue(translatedCode);
                }

                if (isDiffView) {
                    diffEditorContainer.classList.remove('hidden');
                    const diffHeader = document.getElementById('diff-header');
                    if (diffHeader) diffHeader.classList.remove('hidden');
                    setTimeout(() => {
                        if (diffEditor) diffEditor.layout();
                    }, 150);
                }

                saveHistory(inputCode, translatedCode, sLang, tLang);
                if (result.translationMethod !== 'compiler' && result.targetVerified === false) {
                    showToast('Translation completed, but the output has syntax issues. Review it before running.', 'warning', 6500);
                } else if (result.translationMethod !== 'compiler') {
                    showToast('Translation complete.');
                }
            } catch (err) {
                console.error("Syn2Sem Translate error:", err);
                showToast(err.message || 'Translation failed. Please try again.', 'warning', 6500);
            } finally {
                if (translationUiActive) {
                    loadingOverlay.classList.add('hidden');
                    btnTranslate.disabled = false;
                    btnTranslate.removeAttribute('aria-busy');
                    btnTranslate.innerHTML = originalTranslateLabel;
                }
                translationInProgress = false;
            }
        });

        // Clear Button
        const clearEditors = () => {
            sourceEditor.setValue('');
            targetEditor.setValue('');
            const diffModels = diffEditor.getModel();
            if (diffModels) {
                diffModels.original.setValue('');
                diffModels.modified.setValue('');
            }
            dashboard.classList.add('hidden');
            btnTranslate.style.opacity = '1';
            btnTranslate.style.cursor = 'pointer';
            const diffHeader = document.getElementById('diff-header');
            if (diffHeader) diffHeader.classList.add('hidden');
            diffEditorContainer.classList.add('hidden');
            isDiffView = false;
        };
        const btnClear = document.getElementById('btn-clear');
        const btnClearSourceMobile = document.getElementById('btn-clear-source-mobile');
        if (btnClear) btnClear.addEventListener('click', clearEditors);
        if (btnClearSourceMobile) btnClearSourceMobile.addEventListener('click', clearEditors);

        // Copy Output
        const btnCopy = document.getElementById('btn-copy');
        btnCopy.addEventListener('click', () => {
            const val = targetEditor.getValue();
            if (!val) return;
            navigator.clipboard.writeText(val).then(() => {
                const icon = btnCopy.querySelector('i');
                icon.classList.remove('fa-copy');
                icon.classList.add('fa-check');
                icon.style.color = 'var(--success-color)';
                setTimeout(() => {
                    icon.classList.remove('fa-check');
                    icon.classList.add('fa-copy');
                    icon.style.color = '';
                }, 2000);
            });
        });

        // Open Output in Notepad (via server) or fallback to download
        const btnDownload = document.getElementById('btn-download');
        btnDownload.addEventListener('click', async () => {
            const val = targetEditor.getValue();
            if (!val) return;
            
            try {
                // Attempt to send to local server to open Notepad directly
                const response = await fetch('/open-notepad', {
                    method: 'POST',
                    body: val
                });
                
                if (response.ok) {
                    showToast("Opened directly in Notepad!");
                    return;
                } else {
                    alert("Failed to open Notepad. Is the server running?");
                }
            } catch (e) {
                console.error("Server connection failed:", e);
                alert("Error: Cannot open Notepad directly.\n\nYou are viewing this file directly in the browser (file://). To allow this app to open Notepad on your computer, you MUST run the local server by typing 'node server.js' in the terminal, and then open http://localhost:3000 in your browser.");
            }
        });

        // Generate PDF Report
        const btnDownloadPdf = document.getElementById('btn-download-pdf');
        if (btnDownloadPdf) {
            btnDownloadPdf.addEventListener('click', () => {
                const sourceCode = sourceEditor ? sourceEditor.getValue() : '';
                const translatedCode = targetEditor ? targetEditor.getValue() : '';
                if (!translatedCode.trim()) {
                    alert("No code to export. Please translate something first!");
                    return;
                }
                
                try {
                    // Check if jsPDF is available
                    if (!window.jspdf) {
                        alert("PDF library is still loading or failed to load. Please wait a moment and try again.");
                        return;
                    }
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const margin = 15;
                    const contentWidth = pageWidth - margin * 2;
                    const footerY = pageHeight - 10;
                    let y = 57;

                    const addPageHeader = (continuation = false) => {
                        doc.setFillColor(15, 23, 42);
                        doc.rect(0, 0, pageWidth, 39, 'F');
                        doc.setFillColor(6, 182, 212);
                        doc.rect(0, 39, pageWidth, 1.5, 'F');
                        doc.setTextColor(255, 255, 255);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(19);
                        doc.text(continuation ? 'Translation Report (continued)' : 'Syn2Sem Translation Report', margin, 19);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(9);
                        doc.setTextColor(203, 213, 225);
                        doc.text(`${sourceLang.value.toUpperCase()} to ${targetLang.value.toUpperCase()}  |  ${new Date().toLocaleString()}`, margin, 29);
                    };

                    const addSectionTitle = (title) => {
                        if (y + 12 > footerY - 5) {
                            doc.addPage();
                            addPageHeader(true);
                            y = 52;
                        }
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(11);
                        doc.setTextColor(15, 23, 42);
                        doc.text(title, margin, y);
                        y += 4;
                        doc.setDrawColor(6, 182, 212);
                        doc.setLineWidth(0.5);
                        doc.line(margin, y, margin + contentWidth, y);
                        y += 7;
                    };

                    const addCodeSection = (title, code) => {
                        addSectionTitle(title);
                        const lines = doc.splitTextToSize(code || 'No source code available.', contentWidth - 8);
                        const lineHeight = 4.2;
                        let lineIndex = 0;

                        while (lineIndex < lines.length) {
                            if (y + lineHeight + 6 > footerY - 8) {
                                doc.addPage();
                                addPageHeader(true);
                                y = 52;
                            }
                            const availableLines = Math.max(1, Math.floor((footerY - 8 - y - 6) / lineHeight));
                            const pageLines = lines.slice(lineIndex, lineIndex + availableLines);
                            const blockHeight = pageLines.length * lineHeight + 6;
                            doc.setFillColor(245, 248, 252);
                            doc.setDrawColor(226, 232, 240);
                            doc.roundedRect(margin, y - 3, contentWidth, blockHeight, 2, 2, 'FD');
                            doc.setFont('courier', 'normal');
                            doc.setFontSize(8.5);
                            doc.setTextColor(30, 41, 59);
                            doc.text(pageLines, margin + 4, y + 1);
                            y += blockHeight + 8;
                            lineIndex += pageLines.length;

                            if (lineIndex < lines.length) {
                                doc.addPage();
                                addPageHeader(true);
                                y = 52;
                            }
                        }
                    };

                    addPageHeader();

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(15, 23, 42);
                    doc.text('Translation details', margin, y);
                    y += 6;
                    doc.setFillColor(240, 249, 255);
                    doc.setDrawColor(186, 230, 253);
                    doc.roundedRect(margin, y - 3, contentWidth, 15, 2, 2, 'FD');
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.setTextColor(51, 65, 85);
                    doc.text(`Source: ${sourceLang.value.toUpperCase()}`, margin + 5, y + 3);
                    doc.text(`Target: ${targetLang.value.toUpperCase()}`, margin + 85, y + 3);
                    y += 22;

                    addSectionTitle('Analysis summary');
                    const metricValues = [
                        ['Semantic similarity', document.getElementById('res-score')?.textContent],
                        ['Syntax status', document.getElementById('res-syntax')?.textContent],
                        ['Translation confidence', document.getElementById('res-confidence')?.textContent],
                        ['Semantic gap prediction', document.getElementById('res-gap')?.textContent],
                        ['Time complexity', document.getElementById('res-time-complexity')?.textContent],
                        ['Space complexity', document.getElementById('res-space-complexity')?.textContent]
                    ];
                    const columnWidth = contentWidth / 2;
                    metricValues.forEach(([label, value], index) => {
                        const column = index % 2;
                        const row = Math.floor(index / 2);
                        const x = margin + column * columnWidth;
                        const metricY = y + row * 12;
                        doc.setFillColor(248, 250, 252);
                        doc.setDrawColor(226, 232, 240);
                        doc.roundedRect(x, metricY - 4, columnWidth - 3, 11, 1.5, 1.5, 'FD');
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        doc.setTextColor(100, 116, 139);
                        doc.text(label, x + 3, metricY);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(9);
                        doc.setTextColor(30, 41, 59);
                        doc.text((value || '').trim() || 'Not available', x + 3, metricY + 4);
                    });
                    y += 42;

                    addCodeSection('Source code', sourceCode);
                    addCodeSection('Translated code', translatedCode);

                    const pageCount = doc.getNumberOfPages();
                    for (let page = 1; page <= pageCount; page++) {
                        doc.setPage(page);
                        doc.setDrawColor(226, 232, 240);
                        doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        doc.setTextColor(100, 116, 139);
                        doc.text('Generated by Syn2Sem', margin, footerY);
                        doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, footerY, { align: 'right' });
                    }

                    doc.save("Syntax_to_Semantics_Report.pdf");
                    showToast("PDF Report Downloaded!");
                } catch (e) {
                    console.error("PDF Generation failed:", e);
                    alert("Error generating PDF. Make sure you are connected to the internet to load the PDF engine.");
                }
            });
        }

        const langToExt = {
            python: '.py',
            java: '.java',
            c: '.c',
            cpp: '.cpp',
            javascript: '.js'
        };
        const ideHelperUrl = 'http://127.0.0.1:43127';
        const openInIde = async (ide, label) => {
            const code = targetEditor && targetEditor.getValue();
            if (!code || !code.trim()) {
                showToast('Translate code before opening it in an IDE.', 'warning');
                return;
            }

            let helperReady = false;
            try {
                const healthResponse = await fetch(`${ideHelperUrl}/health`);
                if (!healthResponse.ok) {
                    throw new Error(`The IDE helper returned status ${healthResponse.status}.`);
                }
                const health = await healthResponse.json();
                if (!health.ready) {
                    throw new Error('The IDE helper is not ready.');
                }
                helperReady = true;

                const response = await fetch(`${ideHelperUrl}/open`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ide,
                        language: targetLang.value,
                        code
                    })
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(result.message || `Could not open ${label}.`);
                }
                showToast(result.message || `Opened translated code in ${label}.`);
            } catch (error) {
                console.error(`${label} companion connection failed:`, error);
                if (!helperReady) {
                    window.location.assign('/install-ide-helper.cmd');
                    showToast('One-time setup started: open the downloaded Syn2Sem installer. It will start the connector automatically when Windows starts. Then click the IDE logo again.', 'warning', 10000);
                    return;
                }
                showToast(`${label} could not open the translated code. ${error.message}`, 'warning', 6500);
            }
        };

        const btnVscode = document.getElementById('btn-vscode');
        if (btnVscode) {
            btnVscode.addEventListener('click', () => openInIde('vscode', 'VS Code'));
        }

        const btnAntigravity = document.getElementById('btn-antigravity');
        if (btnAntigravity) {
            btnAntigravity.addEventListener('click', () => openInIde('antigravity', 'Antigravity IDE'));
        }

        // Run Code in Console Output
        const btnRun = document.getElementById('btn-run');
        const consoleContainer = document.getElementById('console-output-container');
        const consoleContent = document.getElementById('console-output-content');
        const btnCloseConsole = document.getElementById('btn-close-console');

        if (btnCloseConsole) {
            btnCloseConsole.addEventListener('click', () => {
                consoleContainer.classList.add('hidden');
            });
        }

        if (btnRun) {
            btnRun.addEventListener('click', async () => {
                const val = targetEditor.getValue();
                if (!val) {
                    alert("No code to run!");
                    return;
                }

                if (targetLang.value === 'cpp' || targetLang.value === 'javascript') {
                    showToast("🚧 We are currently working on C++ and JavaScript support! Full support is active for Java, Python, and C.", 'warning', 4500);
                }
                
                consoleContainer.classList.remove('hidden');
                consoleContent.textContent = "Executing code...\n";
                
                try {
                    // Auto-detect target code language to avoid running with wrong runtime
                    let runUrl = `/run-code?lang=${targetLang.value}`;
                    try {
                        const detectedRunLang = autoDetectLanguage ? autoDetectLanguage(val) : null;
                        if (detectedRunLang && detectedRunLang !== targetLang.value) {
                            runUrl += `&autoDetectRun=true`;
                        }
                    } catch (e) { /* ignore detection errors */ }

                    const runSettings = readSavedAiSettings();
                    const runHeaders = {};
                    if (runSettings.runner) runHeaders['X-Execution-Runner'] = runSettings.runner;
                    if (runSettings.pistonKey) runHeaders['X-Piston-API-Key'] = runSettings.pistonKey;

                    const response = await fetch(runUrl, {
                        method: 'POST',
                        headers: runHeaders,
                        body: val
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.error) {
                            consoleContent.innerHTML = `<span class="text-red">${result.output}</span>`;
                        } else {
                            consoleContent.textContent = result.output || "Code executed successfully (no output).";
                        }
                    } else {
                        consoleContent.innerHTML = `<span class="text-red">Failed to execute. Is the server running?</span>`;
                    }
                } catch (e) {
                    console.error("Execution failed:", e);
                    consoleContent.innerHTML = `<span class="text-red">Connection error. You must run 'node server.js' and view on localhost:3000 to execute code.</span>`;
                }
                consoleContent.scrollIntoView({ behavior: 'smooth', block: 'end' });
            });
        }
        } catch (err) {
            alert("JS MONACO REQ ERROR:\n" + err.message + "\n" + err.stack);
        }
    }); // End Monaco Require

    // === 5. Mobile Share Feature ===
    const btnShare = document.getElementById('btn-share');
    if (btnShare) {
        btnShare.addEventListener('click', () => {
            const targetLang = document.getElementById('target-lang').value;
            // Get translated code value from target editor
            let translatedCode = "";
            if (typeof targetEditor !== 'undefined' && targetEditor) {
                translatedCode = targetEditor.getValue();
            }

            if (!translatedCode || translatedCode.trim() === "") {
                showToast("Translate some code first!");
                return;
            }

            if (navigator.share) {
                navigator.share({
                    title: `Syn2Sem Translated Code (${targetLang.toUpperCase()})`,
                    text: translatedCode,
                })
                .then(() => console.log('Successful share'))
                .catch((error) => console.log('Error sharing', error));
            } else {
                // Fallback: Copy to clipboard
                navigator.clipboard.writeText(translatedCode);
                showToast("Code copied to clipboard!");
            }
        });
    }

    // === 6. Live Studio Demo Presets & Presentation Mode ===
    const demoPresetsSelect = document.getElementById('demo-presets-select');
    const demoPresetScripts = {
        fibonacci: {
            java: `public class Demo {\n    public static void main(String[] args) {\n        int n = 10;\n        int a = 0, b = 1;\n        System.out.println("Fibonacci Series up to " + n + " terms:");\n        for (int i = 1; i <= n; ++i) {\n            System.out.print(a + " ");\n            int next = a + b;\n            a = b;\n            b = next;\n        }\n    }\n}`,
            python: `n = 10\na, b = 0, 1\nprint(f"Fibonacci Series up to {n} terms:")\nfor _ in range(n):\n    print(a, end=" ")\n    a, b = b, a + b\nprint()`,
            c: `#include <stdio.h>\n\nint main() {\n    int n = 10, a = 0, b = 1, next;\n    printf("Fibonacci Series up to %d terms:\\n", n);\n    for (int i = 1; i <= n; ++i) {\n        printf("%d ", a);\n        next = a + b;\n        a = b;\n        b = next;\n    }\n    printf("\\n");\n    return 0;\n}`
        },
        binary_search: {
            java: `public class Demo {\n    public static int binarySearch(int[] arr, int target) {\n        int low = 0, high = arr.length - 1;\n        while (low <= high) {\n            int mid = low + (high - low) / 2;\n            if (arr[mid] == target) return mid;\n            if (arr[mid] < target) low = mid + 1;\n            else high = mid - 1;\n        }\n        return -1;\n    }\n    public static void main(String[] args) {\n        int[] arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n        int target = 23;\n        int result = binarySearch(arr, target);\n        System.out.println("Element " + target + " found at index: " + result);\n    }\n}`,
            python: `def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n\narr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]\ntarget = 23\nresult = binary_search(arr, target)\nprint(f"Element {target} found at index: {result}")`,
            c: `#include <stdio.h>\n\nint binarySearch(int arr[], int size, int target) {\n    int low = 0, high = size - 1;\n    while (low <= high) {\n        int mid = low + (high - low) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) low = mid + 1;\n        else high = mid - 1;\n    }\n    return -1;\n}\n\nint main() {\n    int arr[] = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n    int size = sizeof(arr) / sizeof(arr[0]);\n    int target = 23;\n    int result = binarySearch(arr, size, target);\n    printf("Element %d found at index: %d\\n", target, result);\n    return 0;\n}`
        },
        class_demo: {
            java: `public class BankAccount {\n    private String owner;\n    private double balance;\n\n    public BankAccount(String owner, double balance) {\n        this.owner = owner;\n        this.balance = balance;\n    }\n    public void deposit(double amount) {\n        this.balance += amount;\n        System.out.println(owner + " deposited: $" + amount + " | New Balance: $" + balance);\n    }\n    public static void main(String[] args) {\n        BankAccount acc = new BankAccount("Alex", 500.0);\n        acc.deposit(250.0);\n    }\n}`,
            python: `class BankAccount:\n    def __init__(self, owner, balance):\n        self.owner = owner\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance += amount\n        print(f"{self.owner} deposited: \${amount} | New Balance: \${self.balance}")\n\nacc = BankAccount("Alex", 500.0)\nacc.deposit(250.0)`,
            c: `#include <stdio.h>\n\ntypedef struct {\n    char owner[50];\n    double balance;\n} BankAccount;\n\nvoid deposit(BankAccount *acc, double amount) {\n    acc->balance += amount;\n    printf("%s deposited: $%.2f | New Balance: $%.2f\\n", acc->owner, amount, acc->balance);\n}\n\nint main() {\n    BankAccount acc = {"Alex", 500.0};\n    deposit(&acc, 250.0);\n    return 0;\n}`
        },
        matrix_mult: {
            python: `A = [[1, 2], [3, 4]]\nB = [[5, 6], [7, 8]]\nresult = [[0, 0], [0, 0]]\n\nfor i in range(len(A)):\n    for j in range(len(B[0])):\n        for k in range(len(B)):\n            result[i][j] += A[i][k] * B[k][j]\n\nprint("Matrix Multiplication Result:")\nfor row in result:\n    print(row)`,
            java: `public class MatrixMult {\n    public static void main(String[] args) {\n        int[][] A = {{1, 2}, {3, 4}};\n        int[][] B = {{5, 6}, {7, 8}};\n        int[][] res = new int[2][2];\n        for (int i = 0; i < 2; i++) {\n            for (int j = 0; j < 2; j++) {\n                for (int k = 0; k < 2; k++) {\n                    res[i][j] += A[i][k] * B[k][j];\n                }\n                System.out.print(res[i][j] + " ");\n            }\n            System.out.println();\n        }\n    }\n}`,
            c: `#include <stdio.h>\n\nint main() {\n    int A[2][2] = {{1, 2}, {3, 4}};\n    int B[2][2] = {{5, 6}, {7, 8}};\n    int res[2][2] = {0};\n    printf("Matrix Multiplication Result:\\n");\n    for (int i = 0; i < 2; i++) {\n        for (int j = 0; j < 2; j++) {\n            for (int k = 0; k < 2; k++) {\n                res[i][j] += A[i][k] * B[k][j];\n            }\n            printf("%d ", res[i][j]);\n        }\n        printf("\\n");\n    }\n    return 0;\n}`
        }
    };

    if (demoPresetsSelect) {
        demoPresetsSelect.addEventListener('change', (e) => {
            const presetKey = e.target.value;
            if (!presetKey || !demoPresetScripts[presetKey]) return;
            const currentLang = document.getElementById('source-lang').value || 'java';
            const code = demoPresetScripts[presetKey][currentLang] || demoPresetScripts[presetKey]['java'] || demoPresetScripts[presetKey]['python'];
            if (typeof sourceEditor !== 'undefined' && sourceEditor) {
                sourceEditor.setValue(code);
                showToast(`Loaded ${presetKey.replace('_', ' ').toUpperCase()} sample script!`);
            }
        });
    }

    // Presentation Mode Toggle
    const btnFullscreen = document.getElementById('btn-fullscreen-demo');
    const demoStudioContainer = document.getElementById('demo-studio-container');
    if (btnFullscreen && demoStudioContainer) {
        btnFullscreen.addEventListener('click', () => {
            demoStudioContainer.classList.toggle('studio-fullscreen-mode');
            const isFull = demoStudioContainer.classList.contains('studio-fullscreen-mode');
            btnFullscreen.innerHTML = isFull ? '<i class="fa-solid fa-compress"></i> Exit Presentation' : '<i class="fa-solid fa-expand"></i> Presentation Mode';
            setTimeout(() => {
                if (typeof sourceEditor !== 'undefined' && sourceEditor) sourceEditor.layout();
                if (typeof targetEditor !== 'undefined' && targetEditor) targetEditor.layout();
                if (typeof diffEditor !== 'undefined' && diffEditor) diffEditor.layout();
            }, 200);
        });
    }
});
