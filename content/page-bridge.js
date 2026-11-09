// RVU Wi-Fi Auto Login - Page Bridge (Runs in MAIN world with direct access to page JavaScript)

(function () {
  'use strict';

  function triggerSubmit(attempt = 1) {
    console.log(`[RVU Auto-Login Bridge] Attempt ${attempt} to submit credentials...`);

    // 1. Direct call to page's submitRequest function if available
    if (typeof window.submitRequest === 'function') {
      try {
        window.submitRequest();
        console.log('[RVU Auto-Login Bridge] Executed window.submitRequest() successfully.');
        return true;
      } catch (err) {
        console.warn('[RVU Auto-Login Bridge] submitRequest() call error:', err);
      }
    }

    // 2. If submitRequest is not yet loaded (e.g., httpclient.js still downloading), retry up to 8 times (2.4s)
    if (attempt <= 8) {
      setTimeout(() => triggerSubmit(attempt + 1), 300);
      return false;
    }

    // 3. Fallback: simulate click on anchor and loginbutton element
    const anchor = document.querySelector('a[href*="submitRequest"]') ||
                   document.getElementById('loginbutton')?.closest('a');
    if (anchor) {
      anchor.click();
      console.log('[RVU Auto-Login Bridge] Fallback: Clicked anchor element.');
    }

    const btn = document.getElementById('loginbutton');
    if (btn) {
      btn.click();
      console.log('[RVU Auto-Login Bridge] Fallback: Clicked #loginbutton.');
    }

    return true;
  }

  // Listen for trigger event from isolated content script
  window.addEventListener('__RVU_AUTO_LOGIN_SUBMIT__', () => {
    triggerSubmit(1);
  });
})();
