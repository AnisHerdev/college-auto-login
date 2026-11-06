# RVU Wi-Fi Auto Login (Chrome Extension)

A lightweight, zero-friction Chrome extension (Manifest V3) that automatically authenticates to the RVU campus Wi-Fi captive portal (`https://10.16.0.1:8090/httpclient.html`).

---

## Features

- **Hands-Free Authentication**: Automatically detects the captive portal, fills your USN/Roll number and password, and triggers sign-in.
- **Modern Minimalist UI**: Built with precision typography, deep zinc surfaces, accessible contrast (WCAG AA), and tactile micro-interactions.
- **On-Page Status Overlay**: A sleek floating badge appears on the portal page indicating connection progress (`Signing in...`, `Connected ✓`, or error alerts).
- **Tab Management**: Defaults to keeping the captive portal tab open (recommended for Sophos keepalive networks), with an optional toggle to auto-close after login.
- **100% Private & Local**: Your credentials never leave your browser. Stored securely in `chrome.storage.local`.
- **Zero Build Dependencies**: Native vanilla JS/CSS/HTML with Manifest V3. No compilation or node_modules needed to install.

---

## Installation Guide

### Step 1: Open Chrome Extensions
1. Open Google Chrome (or Brave, Microsoft Edge, Arc).
2. Navigate to `chrome://extensions` in your address bar.
3. Turn **ON** the **Developer mode** toggle in the top-right corner.

### Step 2: Load the Extension
1. Click the **Load unpacked** button in the top-left corner.
2. Select this project folder:
   ```
   D:\Anish\RVU\MY_PROJECTS\college-auto-login
   ```
3. The extension **RVU Wi-Fi Auto Login** is now installed! Pin it to your browser toolbar for quick access.

---

## How to Use

1. Click the extension icon in your browser toolbar.
2. Enter your university USN / Roll number (e.g., `RVU23CSE001`).
3. Enter your Wi-Fi portal password (use the eye icon to verify).
4. Click **Save Credentials**. The badge will turn green (**Active**).
5. Whenever you connect to RVU Wi-Fi and the portal page opens (`https://10.16.0.1:8090/httpclient.html`), the extension will instantly log you in!

---

## Offline Testing Simulator

Want to test the auto-login flow right now without being on campus Wi-Fi?

1. Start the local test server:
   ```bash
   npm run test-server
   ```
2. Open `http://localhost:8090/httpclient.html` in your browser.
3. Watch the extension fill credentials and complete login automatically!

---

## File Architecture

```
college-auto-login/
├── manifest.json            # Manifest V3 extension configuration
├── PRODUCT.md               # Product context and design principles
├── DESIGN.md                # Impeccable UI tokens and design system
├── background/
│   └── background.js        # Service worker for badge states and tab management
├── content/
│   ├── content.js           # Auto-login injection script for portal DOM
│   └── content.css          # Injected on-page floating status badge styles
├── popup/
│   ├── popup.html           # Minimalist settings & credentials popup
│   ├── popup.css            # Dark mode styles (OKLCH, zero AI slop)
│   └── popup.js             # Form handler, storage sync & UI toggles
├── icons/                   # High-res extension icons (16, 32, 48, 128, SVG)
├── scripts/
│   ├── generate-icons.mjs   # Pure JS icon generator
│   └── test-server.mjs      # Local test captive portal server
└── test/
    └── httpclient.html      # Offline portal simulator
```
