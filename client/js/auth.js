/* auth.js — Clerk authentication for PDI Board
 *
 * Responsibilities:
 *  1. Load the Clerk JS SDK dynamically
 *  2. Show login screen when user is not authenticated
 *  3. Inject Authorization header into all API calls (via Auth.getToken())
 *  4. Render user avatar + logout button in the navbar
 *
 * The publishable key is embedded by the server into window.__clerk_publishable_key.
 * In development you can also set it via .env and have the server render it.
 */

const Auth = (() => {
  let _clerk = null;
  let _isBootstrappingApp = false;
  let _startedForUserId = null;

  function _diag(method, message, details) {
    const mappedMethod = method === 'log' ? 'info' : method;
    if (typeof Logger !== 'undefined' && typeof Logger[mappedMethod] === 'function') {
      Logger[mappedMethod](message, details);
    }
  }

  async function init() {
    const publishableKey = window.__clerk_publishable_key;
    _diag('log', 'auth.init:start', { hasPublishableKey: Boolean(publishableKey) });

    if (!publishableKey || publishableKey.startsWith('%%')) {
      Logger.error('[Auth] CLERK_PUBLISHABLE_KEY is not configured');
      _showInitError(new Error('CLERK_PUBLISHABLE_KEY is not configured.'));
      return;
    }

    await _loadClerkScript(publishableKey);
    _diag('log', 'auth.clerk-script-loaded');

    const clerk = window.Clerk;
    await clerk.load();
    _clerk = clerk;
    _diag('log', 'auth.clerk-loaded', { hasUser: Boolean(clerk.user) });

    if (clerk.user) {
      await new Promise(resolve => setTimeout(resolve, 100));
      await _startApp(clerk.user);
    } else {
      _diag('log', 'auth.show-login');
      _showLogin(clerk);
    }

    clerk.addListener(({ user }) => {
      _diag('log', 'auth.listener', { hasUser: Boolean(user) });
      if (user) {
        _startApp(user);
      } else {
        _startedForUserId = null;
        const app = document.getElementById('app');
        const setup = document.getElementById('setup-overlay');
        if (app) app.classList.add('hidden');
        if (setup) setup.classList.add('hidden');
        _showLogin(clerk);
      }
    });
  }

   function _loadClerkScript(publishableKey) {
     return new Promise((resolve, reject) => {
       const existing = document.getElementById('clerk-js');
       if (existing) { resolve(); return; }

       // Suppress Clerk development key warnings in dev mode
       const originalWarn = console.warn;
       if (publishableKey.startsWith('pk_test_')) {
         console.warn = function(...args) {
           // Suppress Clerk development keys warning
           if (args[0] && typeof args[0] === 'string' && args[0].includes('development keys')) {
             return;
           }
           originalWarn.apply(console, args);
         };
       }

       const script = document.createElement('script');
       script.id = 'clerk-js';
       script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
       script.setAttribute('data-clerk-publishable-key', publishableKey);

       script.onload = () => {
         // Restore original console.warn after Clerk is loaded
         if (publishableKey.startsWith('pk_test_')) {
           console.warn = originalWarn;
         }
         resolve();
       };

       script.onerror = reject;
       document.head.appendChild(script);
     });
   }

  function _showLogin(clerk) {
    const screen = document.getElementById('login-screen');
    if (!screen) return;
    screen.classList.remove('hidden');
    const btn = document.getElementById('btn-google-signin');
    if (btn) btn.onclick = () => clerk.redirectToSignIn({ redirectUrl: window.location.href });
  }

  function _showLoadingLogin() {
    const screen = document.getElementById('login-screen');
    if (!screen) return;
    screen.classList.remove('hidden');
    const btn = document.getElementById('btn-google-signin');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Carregando...';
    }
  }

  function _showInitError(err) {
    const app = document.getElementById('app');
    const setup = document.getElementById('setup-overlay');
    if (app) app.classList.add('hidden');
    if (setup) setup.classList.add('hidden');
    const screen = document.getElementById('login-screen');
    if (!screen) return;
    screen.classList.remove('hidden');
    _diag('error', 'auth.init-error-ui', { message: err && err.message });
    screen.innerHTML = `
      <div class="login-card">
        <div class="login-logo">⚠️</div>
        <h1 class="login-title">Application Load Error</h1>
        <p class="login-subtitle">${err?.message || 'Unexpected failure while starting after login.'}</p>
        <button class="btn-google-signin" onclick="location.reload()">Try Again</button>
      </div>`;
  }

  async function _startApp(user) {
    const userId = user && user.id;
    const app = document.getElementById('app');
    const setup = document.getElementById('setup-overlay');
    const appAlreadyVisible = (app && !app.classList.contains('hidden')) || (setup && !setup.classList.contains('hidden'));

    // Ignore repeated Clerk "user" events after the app is already up for this user.
    if (_startedForUserId && userId && _startedForUserId === userId && appAlreadyVisible) {
      _diag('warn', 'auth.start-app:skipped-already-started', { userId });
      return;
    }

    if (_isBootstrappingApp) {
      _diag('warn', 'auth.start-app:skipped-duplicate');
      return;
    }

    _diag('log', 'auth.start-app', { userId: user && user.id });
    _renderNavUser(user);
    // App handles data bootstrap after auth is available.
    if (typeof App !== 'undefined' && App && typeof App.init === 'function') {
      _isBootstrappingApp = true;
      _showLoadingLogin();
      try {
        await App.init();
        _startedForUserId = userId || _startedForUserId;
        const shouldHideLogin = (app && !app.classList.contains('hidden')) || (setup && !setup.classList.contains('hidden'));
        const screen = document.getElementById('login-screen');
        if (screen && shouldHideLogin) screen.classList.add('hidden');
      } catch (err) {
        Logger.error('[Auth] App initialization failed', { message: err && err.message });
        _showInitError(err);
      } finally {
        _isBootstrappingApp = false;
      }
    } else {
      _diag('error', 'auth.app-missing', { hasGlobalApp: typeof App !== 'undefined' });
      _showInitError(new Error('App failed to load correctly.'));
    }
  }

  function _renderNavUser(user) {
    const el = document.getElementById('nav-user');
    if (!el) return;
    const name = user.firstName || user.username || user.emailAddresses?.[0]?.emailAddress || '';
    const photo = user.imageUrl || '';
    el.innerHTML = `
      <div class="nav-user-info">
        ${photo ? `<img src="${photo}" alt="${name}" class="nav-avatar" />` : ''}
        <span class="nav-username">${name}</span>
        <button class="btn btn-ghost btn-sm" id="btn-logout" title="Sair">⏻</button>
      </div>`;
    document.getElementById('btn-logout').onclick = () => _clerk?.signOut();
  }

  async function getToken() {
    if (!_clerk?.session) return null;
    try {
      return await _clerk.session.getToken();
    } catch {
      return null;
    }
  }

  return { init, getToken };
})();

// Auth bootstraps on DOMContentLoaded.
document.addEventListener('DOMContentLoaded', () => Auth.init());
