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

  // Handle successful login completion
  function handleLoginSuccess() {
    updateBadge('Connected to RVU Wi-Fi ✓', 'success', autoCloseTab ? 2500 : 4000);

    if (autoCloseTab) {
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'CLOSE_TAB', delayMs: 500 });
      }, 1500);
    }
  }

  // Perform form auto-fill and submit
  async function performLogin() {
    if (hasAttemptedLogin) return;

    // Check if credentials are present
    if (!usn || !password) {
      updateBadge('Credentials missing. Click extension icon to configure.', 'error', 6000);
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

    // Fill fields and dispatch events for validation scripts
    usernameInput.value = usn;
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));

    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Small delay to allow any inline validators to execute cleanly
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Trigger sign in
    if (loginButton) {
      loginButton.click();
    }
  }

  // Watch for state changes after submit
  function startStateWatcher() {
    const observer = new MutationObserver(() => {
      // 1. Check for success
      if (isAlreadyLoggedIn()) {
        observer.disconnect();
        handleLoginSuccess();
        return;
      }

      // 2. Check for login failure
      const error = getErrorMessage();
      if (error && hasAttemptedLogin) {
        observer.disconnect();
        updateBadge(`Login failed: ${error}`, 'error');
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // Fallback polling for 12 seconds in case DOM mutations don't trigger observer
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 500;
      if (isAlreadyLoggedIn()) {
        clearInterval(interval);
        observer.disconnect();
        handleLoginSuccess();
      } else {
        const error = getErrorMessage();
        if (error && hasAttemptedLogin) {
          clearInterval(interval);
          observer.disconnect();
          updateBadge(`Login failed: ${error}`, 'error');
        }
      }

      if (elapsed >= 12000) {
        clearInterval(interval);
        observer.disconnect();
      }
    }, 500);
  }

  // Wait for captive portal DOM elements to be ready
  function init() {
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
