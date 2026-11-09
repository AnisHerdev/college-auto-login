// RVU Wi-Fi Auto Login - Content Script for Captive Portal

(async function () {
  'use strict';

  // Prevent double injection
  if (window.__RVU_AUTO_LOGIN_INITIALIZED__) return;
  window.__RVU_AUTO_LOGIN_INITIALIZED__ = true;

  // Retrieve user settings from chrome.storage.local
  const settings = await chrome.storage.local.get([
    'usn',
    'password',
    'autoLoginEnabled',
    'autoCloseTab',
    'showStatusBadge'
  ]);

  const autoLoginEnabled = settings.autoLoginEnabled !== false;
  const showStatusBadge = settings.showStatusBadge !== false;
  const autoCloseTab = Boolean(settings.autoCloseTab);
  const usn = settings.usn ? settings.usn.trim() : '';
  const password = settings.password || '';

  let badgeEl = null;
  let hasAttemptedLogin = false;

  // Initialize or fetch the floating badge
  function getOrCreateBadge() {
    if (!showStatusBadge) return null;
    if (badgeEl) return badgeEl;

    badgeEl = document.createElement('div');
    badgeEl.id = 'rvu-auto-login-badge';
    badgeEl.setAttribute('role', 'status');
    badgeEl.setAttribute('aria-live', 'polite');
    badgeEl.innerHTML = `
      <span class="rvu-badge-dot"></span>
      <span class="rvu-badge-title">RVU Wi-Fi:</span>
      <span class="rvu-badge-msg">Detecting...</span>
    `;

    document.body.appendChild(badgeEl);
    return badgeEl;
  }

  function updateBadge(message, state = 'pending', autoDismissMs = 0) {
    const badge = getOrCreateBadge();
    if (!badge) return;

    badge.classList.remove('hidden', 'state-pending', 'state-success', 'state-error');
    badge.classList.add(`state-${state}`);

    const msgEl = badge.querySelector('.rvu-badge-msg');
    if (msgEl) {
      msgEl.textContent = message;
    }

    if (autoDismissMs > 0) {
      setTimeout(() => {
        badge.classList.add('hidden');
      }, autoDismissMs);
    }
  }

  // Check if captive portal is already in a logged-in state
  function isAlreadyLoggedIn() {
    const credentialsDiv = document.getElementById('credentials');
    const loggedInView = document.getElementById('loggedin-view');
    const loggedInMsg = document.getElementById('loggedin-message');
    const statusMsg = document.getElementById('statusmessage');

    // Cyberoam / Sophos sets .loggedin class on credentials or displays loggedin-view
    if (credentialsDiv && credentialsDiv.classList.contains('loggedin')) {
      return true;
    }
    if (loggedInView && window.getComputedStyle(loggedInView).display !== 'none') {
      return true;
    }
    if (loggedInMsg && !loggedInMsg.classList.contains('loggedout') && window.getComputedStyle(loggedInMsg).display !== 'none') {
      return true;
    }

    // Check for success text in statusmessage
    if (statusMsg && statusMsg.innerText.toLowerCase().includes('you are signed in')) {
      return true;
    }

    return false;
  }

  // Check if portal has an error message shown
  function getErrorMessage() {
    const statusMsg = document.getElementById('statusmessage');
    if (statusMsg && !statusMsg.classList.contains('unshown')) {
      const text = statusMsg.innerText.trim();
      if (text.length > 0 && !text.toLowerCase().includes('signing you in')) {
        return text;
      }
    }
    return null;
  }

  // Translate cryptic or raw portal error messages into clear, actionable guidance
  function formatFriendlyError(rawError) {
    if (!rawError) return 'Authentication rejected by gateway.';
    const lower = rawError.toLowerCase();

    if (
      lower.includes('password') ||
      lower.includes('credential') ||
      lower.includes('username') ||
      lower.includes('incorrect') ||
      lower.includes('invalid') ||
      lower.includes('not match')
    ) {
      return 'Incorrect USN or password. Click extension icon to update credentials.';
    }
    if (
      lower.includes('maximum') ||
      lower.includes('concurrent') ||
      lower.includes('already logged in') ||
      lower.includes('limit reached') ||
      lower.includes('exceeded')
    ) {
      return 'Login limit reached: Account already active on another device.';
    }
    if (
      lower.includes('disabled') ||
      lower.includes('locked') ||
      lower.includes('blocked') ||
      lower.includes('expired')
    ) {
      return 'Account expired or temporarily blocked by RVU IT administration.';
    }
    if (
      lower.includes('timeout') ||
      lower.includes('time out') ||
      lower.includes('unreachable') ||
      lower.includes('network')
    ) {
      return 'Network timeout: Wi-Fi portal gateway is unresponsive.';
    }

    return `Portal error: ${rawError}`;
  }

  // Handle login error with multi-surface notifications so user is never left hanging
  function handleLoginError(rawReason) {
    const friendlyMessage = formatFriendlyError(rawReason);
    updateBadge(friendlyMessage, 'error', 12000);

    // Notify background service worker so toolbar badge and tooltip update immediately
    chrome.runtime.sendMessage({
      action: 'LOGIN_RESULT',
      status: 'error',
      message: friendlyMessage
    }).catch(() => {});
  }

  // Handle successful login completion
  function handleLoginSuccess() {
    updateBadge('Connected to RVU Wi-Fi ✓', 'success', autoCloseTab ? 2500 : 4000);

    chrome.runtime.sendMessage({
      action: 'LOGIN_RESULT',
      status: 'success'
    }).catch(() => {});

    if (autoCloseTab) {
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'CLOSE_TAB', delayMs: 500 }).catch(() => {});
      }, 1500);
    }
  }

  // Perform form auto-fill and submit
  async function performLogin() {
    if (hasAttemptedLogin) return;

    // Check if credentials are present
    if (!usn || !password) {
      handleLoginError('Credentials missing. Click extension icon to configure.');
      return;
    }

    if (!autoLoginEnabled) {
      updateBadge('Auto-login paused in settings.', 'pending', 3500);
      return;
    }

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginbutton') || document.querySelector('a[href*="submitRequest"]');

    if (!usernameInput || !passwordInput || !loginButton) {
      return; // Elements not ready yet
    }

    hasAttemptedLogin = true;
    updateBadge(`Signing in as ${usn}...`, 'pending');

    // Fill fields with focus, input, change, and blur events
    usernameInput.focus();
    usernameInput.value = usn;
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
    usernameInput.blur();

    passwordInput.focus();
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
    passwordInput.blur();

    // Small delay to allow any inline validators to process values
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Multi-prong execution to guarantee sign-in across any portal security configuration:
    const anchor = loginButton.closest('a') || document.querySelector('a[href*="submitRequest"]');

    // 1. Dispatch custom event to MAIN world page bridge (calls window.submitRequest in page context)
    window.dispatchEvent(new CustomEvent('__RVU_AUTO_LOGIN_SUBMIT__'));

    // 2. Inline script injection fallback (calls submitRequest directly in page context)
    try {
      const script = document.createElement('script');
      script.textContent = `
        if (typeof window.submitRequest === 'function') {
          window.submitRequest();
        } else {
          var a = document.querySelector('a[href*="submitRequest"]') || document.getElementById('loginbutton')?.closest('a');
          if (a) a.click();
        }
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (e) {
      console.warn('Script injection fallback:', e);
    }

    // 3. Dispatch Enter key event on password input
    const enterOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
    passwordInput.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
    passwordInput.dispatchEvent(new KeyboardEvent('keypress', enterOpts));
    passwordInput.dispatchEvent(new KeyboardEvent('keyup', enterOpts));

    // 4. Click the parent anchor link and button div
    if (anchor) {
      anchor.click();
      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
    loginButton.click();
    loginButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

    // 5. Safety re-trigger: if portal remains idle after 1.2s without error or login, try once more
    setTimeout(() => {
      if (!isAlreadyLoggedIn() && !getErrorMessage()) {
        const spinner = document.getElementById('spinner-view');
        const isSpinning = spinner && window.getComputedStyle(spinner).display !== 'none';
        if (!isSpinning) {
          console.log('[RVU Auto-Login] Portal still idle, re-triggering submit...');
          window.dispatchEvent(new CustomEvent('__RVU_AUTO_LOGIN_SUBMIT__'));
          if (anchor) anchor.click();
        }
      }
    }, 1200);
  }

  // Watch for state changes after submit
  function startStateWatcher() {
    let resolved = false;

    const cleanup = () => {
      resolved = true;
      if (observer) observer.disconnect();
      if (pollingInterval) clearInterval(pollingInterval);
      if (watchdogTimer) clearTimeout(watchdogTimer);
    };

    const observer = new MutationObserver(() => {
      if (resolved) return;

      // 1. Check for success
      if (isAlreadyLoggedIn()) {
        cleanup();
        handleLoginSuccess();
        return;
      }

      // 2. Check for login failure
      const error = getErrorMessage();
      if (error && hasAttemptedLogin) {
        cleanup();
        handleLoginError(error);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // Fallback polling in case DOM mutations don't trigger observer
    const pollingInterval = setInterval(() => {
      if (resolved) return;

      if (isAlreadyLoggedIn()) {
        cleanup();
        handleLoginSuccess();
      } else {
        const error = getErrorMessage();
        if (error && hasAttemptedLogin) {
          cleanup();
          handleLoginError(error);
        }
      }
    }, 400);

    // 10-second watchdog: never leave the user hanging wondering why there is an error
    const watchdogTimer = setTimeout(() => {
      if (resolved) return;
      if (!isAlreadyLoggedIn()) {
        cleanup();
        handleLoginError('Connection timed out after 10s. Portal gateway did not respond.');
      }
    }, 10000);
  }

  // Wait for captive portal DOM elements to be ready
  function init() {
    // Only activate if we are on the captive portal page or simulator
    const isPortalPath = window.location.pathname.toLowerCase().includes('httpclient');
    const isPortalHost = window.location.hostname === '10.16.0.1';
    const hasPortalMarkup = Boolean(document.getElementById('credential-login-div') || document.getElementById('panelheading'));

    if (!isPortalPath && !isPortalHost && !hasPortalMarkup) {
      return;
    }

    if (isAlreadyLoggedIn()) {
      handleLoginSuccess();
      return;
    }

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (usernameInput && passwordInput) {
      startStateWatcher();
      performLogin();
    } else {
      // If elements are not yet present, observe until they mount (or 8s timeout)
      const mountObserver = new MutationObserver(() => {
        const u = document.getElementById('username');
        const p = document.getElementById('password');
        if (u && p) {
          mountObserver.disconnect();
          startStateWatcher();
          performLogin();
        }
      });

      mountObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      setTimeout(() => mountObserver.disconnect(), 8000);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
