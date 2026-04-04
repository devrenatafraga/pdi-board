/* Diagnostic script for Clerk configuration issues
 * Add to client/js to help diagnose DNS and domain errors
 *
 * Usage: Include this before auth.js loads, or run in DevTools console
 */

const ClerkDiagnostics = (() => {
  function formatKey(key) {
    if (!key) return '❌ NOT SET';
    const start = key.substring(0, 10);
    const end = key.substring(key.length - 4);
    return `${start}...${end}`;
  }

  function detectCustomDomain() {
    // Try to extract domain from publishable key if it contains one
    const pubKey = window.__clerk_publishable_key;
    if (!pubKey) return null;

    // Check if Clerk is loaded and has frontend API info
    if (window.Clerk?.frontendApi) {
      return window.Clerk.frontendApi;
    }

    return null;
  }

  function diagnose() {
    console.log('%c=== CLERK DIAGNOSTICS ===', 'color: #4F46E5; font-weight: bold; font-size: 14px;');

    // 1. Check if key is set
    console.log('\n📋 Configuration:');
    const pubKey = window.__clerk_publishable_key;
    console.log(`  Publishable Key: ${formatKey(pubKey)}`);
    console.log(`  Key Type: ${pubKey?.startsWith('pk_test_') ? '🧪 Test' : pubKey?.startsWith('pk_live_') ? '🚀 Live' : '❓ Unknown'}`);

    // 2. Check Clerk SDK
    console.log('\n🔌 Clerk SDK:');
    console.log(`  Loaded: ${typeof window.Clerk !== 'undefined' ? '✅ Yes' : '❌ No'}`);
    if (window.Clerk) {
      console.log(`  Frontend API: ${window.Clerk.frontendApi || '❌ Not set'}`);
      console.log(`  User Signed In: ${window.Clerk.user ? '✅ Yes' : '❌ No'}`);
      if (window.Clerk.user) {
        console.log(`    └─ User ID: ${window.Clerk.user.id}`);
      }
    }

    // 3. Check custom domain
    console.log('\n🌐 Domain:');
    const customDomain = detectCustomDomain();
    if (customDomain) {
      const isDns = customDomain.includes('clerk.pdi-board.com');
      console.log(`  Custom Domain: ${customDomain}`);
      console.log(`  Type: ${isDns ? '⚠️ CUSTOM (may need DNS setup)' : '✅ Default Clerk domain'}`);
    } else {
      console.log(`  Domain: ✅ Default Clerk domain`);
    }

    // 4. Check Auth module
    console.log('\n🔐 Auth Module:');
    console.log(`  Loaded: ${typeof Auth !== 'undefined' ? '✅ Yes' : '❌ No'}`);
    if (typeof Auth !== 'undefined' && Auth.getToken) {
      console.log(`  Can get token: ✅ Yes`);
    }

    // 5. Check for network errors in console
    console.log('\n⚠️ Common Issues:');
    if (pubKey?.includes('pk_test_') && pubKey?.startsWith('%%')) {
      console.log(`  • ❌ Publishable key not injected (shows %%)`);
    } else if (!pubKey) {
      console.log(`  • ❌ Publishable key not set`);
    } else if (!window.Clerk) {
      console.log(`  • ❌ Clerk SDK not loaded (check script tag)`);
    } else if (customDomain?.includes('clerk.pdi-board.com')) {
      console.log(`  • ⚠️ CUSTOM DOMAIN detected: ${customDomain}`);
      console.log(`    → If you see "net::ERR_NAME_NOT_RESOLVED" errors:`);
      console.log(`    → Remove custom domain in Clerk Dashboard → Settings → Domain`);
    } else {
      console.log(`  • ✅ Configuration looks OK`);
    }

    console.log('\n📚 For detailed help, see: CLERK_DNS_ERROR.md');
  }

  return { diagnose };
})();

// Auto-run diagnostics if there are errors
if (typeof window !== 'undefined') {
  window.ClerkDiagnostics = ClerkDiagnostics;

  // Run diagnostics on errors
  window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('ERR_NAME_NOT_RESOLVED')) {
      console.error('🔴 DNS Error detected! Running diagnostics...');
      ClerkDiagnostics.diagnose();
    }
  });
}

// Usage: Call in browser console
// ClerkDiagnostics.diagnose()

