// RVU Wi-Fi Auto Login - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const usnInput = document.getElementById('usnInput');
  const passwordInput = document.getElementById('passwordInput');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const eyeOffIcon = document.getElementById('eyeOffIcon');
  const credentialsForm = document.getElementById('credentialsForm');
  const saveBtn = document.getElementById('saveBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const statusChip = document.getElementById('statusChip');
  const statusChipText = document.getElementById('statusChipText');

  const autoLoginToggle = document.getElementById('autoLoginToggle');
  const autoCloseToggle = document.getElementById('autoCloseToggle');
  const showBadgeToggle = document.getElementById('showBadgeToggle');

  const openPortalBtn = document.getElementById('openPortalBtn');
  const clearCredsBtn = document.getElementById('clearCredsBtn');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');

  // Error Alert Elements
  const errorAlert = document.getElementById('errorAlert');
  const errorAlertMessage = document.getElementById('errorAlertMessage');
  const errorAlertTime = document.getElementById('errorAlertTime');
  const dismissErrorBtn = document.getElementById('dismissErrorBtn');

  let toastTimeout = null;

  function showToast(message, isError = false) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastMsg.textContent = message;
    toast.classList.remove('hidden', 'toast-error');
    if (isError) {
      toast.classList.add('toast-error');
    }
    toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2400);
  }

  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Recently';
    const elapsedSec = Math.floor((Date.now() - timestamp) / 1000);
    if (elapsedSec < 30) return 'Just now';
    if (elapsedSec < 60) return `${elapsedSec}s ago`;
    const elapsedMin = Math.floor(elapsedSec / 60);
    if (elapsedMin < 60) return `${elapsedMin}m ago`;
    const elapsedHours = Math.floor(elapsedMin / 60);
    return `${elapsedHours}h ago`;
  }

  function renderErrorAlert(lastError) {
    if (lastError && lastError.message) {
      errorAlertMessage.textContent = lastError.message;
      errorAlertTime.textContent = formatRelativeTime(lastError.timestamp);
      errorAlert.classList.remove('hidden');
    } else {
      errorAlert.classList.add('hidden');
    }
  }

  function updateStatusIndicator(hasCreds, isEnabled, hasError = false) {
    statusChip.classList.remove('chip-active', 'chip-unset', 'chip-paused', 'chip-error');
    if (!hasCreds) {
      statusChip.classList.add('chip-unset');
      statusChipText.textContent = 'Setup';
    } else if (!isEnabled) {
      statusChip.classList.add('chip-paused');
      statusChipText.textContent = 'Paused';
    } else if (hasError) {
      statusChip.classList.add('chip-error');
      statusChipText.textContent = 'Failed';
    } else {
      statusChip.classList.add('chip-active');
      statusChipText.textContent = 'Active';
    }
  }

  // Load existing configuration and error state
  const stored = await chrome.storage.local.get([
    'usn',
    'password',
    'autoLoginEnabled',
    'autoCloseTab',
    'showStatusBadge',
    'portalUrl',
    'lastLoginError'
  ]);

  if (stored.usn) usnInput.value = stored.usn;
  if (stored.password) passwordInput.value = stored.password;

  const autoLoginEnabled = stored.autoLoginEnabled !== false;
  autoLoginToggle.checked = autoLoginEnabled;
  autoCloseToggle.checked = Boolean(stored.autoCloseTab);
  showBadgeToggle.checked = stored.showStatusBadge !== false;

  const hasCreds = Boolean(stored.usn && stored.password);
  const currentError = stored.lastLoginError;
  renderErrorAlert(currentError);
  updateStatusIndicator(hasCreds, autoLoginEnabled, Boolean(currentError && currentError.message));

  // Dismiss Error Alert
  dismissErrorBtn.addEventListener('click', async () => {
    errorAlert.classList.add('hidden');
    await chrome.storage.local.remove('lastLoginError');
    chrome.runtime.sendMessage({ action: 'CLEAR_ERROR' });
    const currentCreds = Boolean(usnInput.value.trim() && passwordInput.value);
    updateStatusIndicator(currentCreds, autoLoginToggle.checked, false);
  });

  // Toggle Password Visibility
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', isPassword);
    eyeOffIcon.classList.toggle('hidden', !isPassword);
  });

  // Save Credentials Form
  credentialsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usn = usnInput.value.trim();
    const password = passwordInput.value;

    if (!usn || !password) {
      showToast('Please provide both USN and password', true);
      return;
    }

    await chrome.storage.local.set({ usn, password });
    await chrome.storage.local.remove('lastLoginError');
    errorAlert.classList.add('hidden');

    // Tactile button feedback
    const originalText = saveBtnText.textContent;
    saveBtnText.textContent = 'Saved ✓';
    saveBtn.style.backgroundColor = 'oklch(0.72 0.17 145)'; // Success Emerald

    setTimeout(() => {
      saveBtnText.textContent = originalText;
      saveBtn.style.backgroundColor = '';
    }, 1400);

    showToast('Credentials saved successfully');
    updateStatusIndicator(true, autoLoginToggle.checked, false);

    chrome.runtime.sendMessage({ action: 'CLEAR_ERROR' });
  });

  // Automation Settings Listeners
  autoLoginToggle.addEventListener('change', async () => {
    const enabled = autoLoginToggle.checked;
    await chrome.storage.local.set({ autoLoginEnabled: enabled });
    const hasCreds = Boolean(usnInput.value.trim() && passwordInput.value);
    const hasError = !errorAlert.classList.contains('hidden');
    updateStatusIndicator(hasCreds, enabled, hasError);
    chrome.runtime.sendMessage({ action: 'UPDATE_BADGE' });
    showToast(enabled ? 'Auto-login enabled' : 'Auto-login paused');
  });

  autoCloseToggle.addEventListener('change', async () => {
    const autoClose = autoCloseToggle.checked;
    await chrome.storage.local.set({ autoCloseTab: autoClose });
    showToast(autoClose ? 'Auto-close enabled' : 'Auto-close disabled');
  });

  showBadgeToggle.addEventListener('change', async () => {
    const show = showBadgeToggle.checked;
    await chrome.storage.local.set({ showStatusBadge: show });
    showToast(show ? 'Status badge enabled' : 'Status badge hidden');
  });

  // Open Portal Page
  openPortalBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_PORTAL' });
  });

  // Clear Credentials
  clearCredsBtn.addEventListener('click', async () => {
    if (!usnInput.value && !passwordInput.value) {
      showToast('No credentials to clear');
      return;
    }

    if (confirm('Are you sure you want to remove your saved credentials?')) {
      await chrome.storage.local.remove(['usn', 'password', 'lastLoginError']);
      errorAlert.classList.add('hidden');
      usnInput.value = '';
      passwordInput.value = '';
      updateStatusIndicator(false, autoLoginToggle.checked, false);
      chrome.runtime.sendMessage({ action: 'CLEAR_ERROR' });
      showToast('Credentials removed');
    }
  });
});
