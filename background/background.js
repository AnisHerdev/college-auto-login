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

// Update badge to reflect configuration status
async function updateBadge() {
  const data = await chrome.storage.local.get(['usn', 'password', 'autoLoginEnabled']);
  const hasCreds = Boolean(data.usn && data.password);
  const enabled = data.autoLoginEnabled !== false;

  if (!hasCreds) {
    chrome.action.setBadgeText({ text: 'SETUP' });
    chrome.action.setBadgeBackgroundColor({ color: '#EAB308' }); // Amber
  } else if (!enabled) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#64748B' }); // Slate
  } else {
    chrome.action.setBadgeText({ text: 'AUTO' });
    chrome.action.setBadgeBackgroundColor({ color: '#10B981' }); // Emerald
  }
}

// React to storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    updateBadge();
  }
});

// Message listener for tab actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CLOSE_TAB') {
    if (sender.tab && sender.tab.id) {
      // Short delay before closing so user sees the success state if configured
      setTimeout(() => {
        chrome.tabs.remove(sender.tab.id).catch(() => {});
      }, request.delayMs || 1500);
      sendResponse({ success: true });
    }
  } else if (request.action === 'OPEN_PORTAL') {
    chrome.storage.local.get(['portalUrl'], (data) => {
      const url = data.portalUrl || DEFAULT_PORTAL_URL;
      chrome.tabs.create({ url });
      sendResponse({ success: true, url });
    });
    return true; // Keep message channel open for async response
  } else if (request.action === 'UPDATE_BADGE') {
    updateBadge();
    sendResponse({ success: true });
  }
});

// Initial badge check
updateBadge();
