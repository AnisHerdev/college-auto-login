// RVU Auto Login - Background Service Worker

const DEFAULT_PORTAL_URL = 'https://10.16.0.1:8090/httpclient.html';

// Initialize defaults on extension install / update
chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await chrome.storage.local.get([
    'usn',
    'password',
    'autoLoginEnabled',
    'autoCloseTab',
    'showStatusBadge',
    'portalUrl'
  ]);

  const updates = {};
  if (current.autoLoginEnabled === undefined) updates.autoLoginEnabled = true;
  if (current.autoCloseTab === undefined) updates.autoCloseTab = false;
  if (current.showStatusBadge === undefined) updates.showStatusBadge = true;
  if (!current.portalUrl) updates.portalUrl = DEFAULT_PORTAL_URL;

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }

  updateBadge();
});

// Update badge to reflect configuration and connection status
let flashBadgeTimeout = null;

async function updateBadge() {
  if (flashBadgeTimeout) {
    clearTimeout(flashBadgeTimeout);
    flashBadgeTimeout = null;
  }

  const data = await chrome.storage.local.get([
    'usn',
    'password',
    'autoLoginEnabled',
    'lastLoginError'
  ]);
  const hasCreds = Boolean(data.usn && data.password);
  const enabled = data.autoLoginEnabled !== false;
  const lastError = data.lastLoginError;

  if (!hasCreds) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#EAB308' }); // Amber
    chrome.action.setTitle({ title: 'RVU Wi-Fi: Setup required - click to configure credentials' });
  } else if (!enabled) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#64748B' }); // Slate
    chrome.action.setTitle({ title: 'RVU Wi-Fi: Auto-login paused in settings' });
  } else if (lastError && lastError.message) {
    chrome.action.setBadgeText({ text: 'ERR' });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' }); // Crimson
    chrome.action.setTitle({ title: `RVU Wi-Fi Error: ${lastError.message}` });
  } else {
    // Keep icon clean when active — no oversized text overlaying the Wi-Fi icon
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'RVU Wi-Fi: Auto-login ready & active' });
  }
}

// React to storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    // If credentials or toggle changed, clear any previous login error
    if (changes.usn || changes.password || changes.autoLoginEnabled) {
      if (changes.lastLoginError === undefined) {
        chrome.storage.local.remove('lastLoginError').catch(() => {});
      }
    }
    updateBadge();
  }
});

// Message listener for tab actions and login feedback
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CLOSE_TAB') {
    if (sender.tab && sender.tab.id) {
      setTimeout(() => {
        chrome.tabs.remove(sender.tab.id).catch(() => {});
      }, request.delayMs || 1500);
      sendResponse({ success: true });
    }
  } else if (request.action === 'OPEN_PORTAL') {
    // Also clear error when manually opening portal to retry
    chrome.storage.local.remove('lastLoginError').catch(() => {});
    chrome.storage.local.get(['portalUrl'], (data) => {
      const url = data.portalUrl || DEFAULT_PORTAL_URL;
      chrome.tabs.create({ url });
      sendResponse({ success: true, url });
    });
    return true; // Keep message channel open for async response
  } else if (request.action === 'LOGIN_RESULT') {
    if (request.status === 'success') {
      chrome.storage.local.remove('lastLoginError').catch(() => {});
      // Flash brief checkmark for 3s
      if (flashBadgeTimeout) clearTimeout(flashBadgeTimeout);
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#10B981' }); // Emerald
      chrome.action.setTitle({ title: 'RVU Wi-Fi: Successfully connected & authenticated ✓' });

      flashBadgeTimeout = setTimeout(() => {
        flashBadgeTimeout = null;
        updateBadge();
      }, 3000);
    } else if (request.status === 'error') {
      const errorData = {
        message: request.message || 'Authentication failed',
        timestamp: Date.now()
      };
      chrome.storage.local.set({ lastLoginError: errorData }, () => {
        updateBadge();
      });
    }
    sendResponse({ success: true });
  } else if (request.action === 'CLEAR_ERROR') {
    chrome.storage.local.remove('lastLoginError', () => {
      updateBadge();
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'UPDATE_BADGE') {
    updateBadge();
    sendResponse({ success: true });
  }
});

// Initial badge check
updateBadge();
