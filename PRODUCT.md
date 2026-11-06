# Product

## Register

product

## Users
RVU (and university) students and faculty connecting to the campus Wi-Fi network who are repeatedly prompted by the Sophos/Cyberoam captive portal (`https://10.16.0.1:8090/httpclient.html`) to authenticate.

## Product Purpose
Eliminate the friction of manually entering university roll number / USN and password every time the device reconnects to college Wi-Fi. Provide a secure, zero-effort browser extension that automatically detects the captive portal, fills credentials, triggers login, and provides clear visual feedback.

## Brand Personality
Precise, effortless, and refined. Modern developer-grade tool aesthetic that feels native, snappy, trustworthy, and distraction-free.

## Anti-references
- Cluttered, dated extensions with aggressive popup ads or bloated menus.
- Harsh, neon, uncalibrated dark modes or generic cookie-cutter form cards.
- Intrusive or flickering scripts that spam the login button or get stuck in retry loops.
- Sloppy input designs with unaligned labels, poor contrast, or no password visibility toggle.

## Design Principles
1. **Zero-Friction Automation**: Once credentials are saved, authentication should happen seamlessly without user intervention.
2. **Tactile Feedback & Transparency**: Always let the user know what state the extension is in (Idle, Saving, Logging in, Connected, or Error).
3. **Impeccable Visual Craft**: Deep zinc surfaces, crisp typography, subtle elevation borders, smooth micro-interactions, and accessible contrast (≥ 4.5:1).
4. **Resilient Handling**: Handle captive portal quirks gracefully (pre-existing values, delayed DOM rendering, keepalive requirements).

## Accessibility & Inclusion
- Full keyboard navigability (`Tab`, `Enter`, `Space` for toggles and buttons).
- High-contrast text exceeding WCAG AA standards (≥ 4.5:1 for body and labels).
- Visual and ARIA status announcements for screen readers.
- Respect `prefers-reduced-motion` for transitions and animations.
