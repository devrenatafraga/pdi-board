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

  async function init() {
    const publishableKey = window.__clerk_publishable_key;

    // If no key is configured (local dev without Clerk), skip auth entirely
    if (!publishableKey || publishableKey.startsWith('%%')) {
      console.warn('[Auth] CLERK_PUBLISHABLE_KEY not set — running without authentication');
      _startAppWithoutAuth();
      return;
    }

    // Dynamically load Clerk JS
    await _loadClerkScript(publishableKey);

    const clerk = window.Clerk;
    await clerk.load();
    _clerk = clerk;

    if (clerk.user) {
      _startApp(clerk.user);
    } else {
      _showLogin(clerk);
    }

    // React to sign-in / sign-out events
    clerk.addListener(({ user }) => {
      if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        _startApp(user);
      } else {
        document.getElementById('app').classList.add('hidden');
        document.getElementById('setup-overlay').classList.add('hidden');
        _showLogin(clerk);
      }
    });
  }

  function _loadClerkScript(publishableKey) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('clerk-js');
      if (existing) { resolve(); return; }
      const script = document.createElement('script');
      script.id = 'clerk-js';
      script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
      script.setAttribute('data-clerk-publishable-key', publishableKey);
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function _showLogin(clerk) {
    const screen = document.getElementById('login-screen');
    screen.classList.remove('hidden');
    clerk.mountSignIn(document.getElementById('clerk-sign-in'), {
      routing: 'virtual',
    });
  }

  function _startApp(user) {
    _renderNavUser(user);
    // Delegate to App — it will call API.get('/data') which now has the token
    if (window.App) App.init();
  }

  function _startAppWithoutAuth() {
    if (window.App) App.init();
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

// Boot auth before DOMContentLoaded fires (script is loaded synchronously)
document.addEventListener('DOMContentLoaded', () => Auth.init());
