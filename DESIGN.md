# Design System: RVU Auto Login

## Theme & Visual Identity
- **Aesthetic**: Modern Minimalist Dark. Precision developer-tool feel, deep zinc layers, subtle borders, crisp contrast, refined micro-interactions.
- **Surface Elevation Scale**:
  - `bg-base`: `oklch(0.14 0.01 260)` (deep charcoal/zinc foundation)
  - `bg-surface`: `oklch(0.18 0.012 260)` (card / panel surface)
  - `bg-elevated`: `oklch(0.22 0.015 260)` (input fields, hover states)
  - `border-subtle`: `oklch(0.28 0.015 260)` (hairline structural division)
  - `border-focus`: `oklch(0.65 0.16 230)` (vibrant sapphire / cobalt focus ring)

## Color Palette (OKLCH)
- **Ink Primary**: `oklch(0.96 0.005 260)` (crisp off-white, contrast > 11:1)
- **Ink Secondary**: `oklch(0.72 0.015 260)` (muted labels, helper text, contrast > 5.5:1)
- **Ink Muted / Placeholder**: `oklch(0.55 0.02 260)` (placeholders, meets 4.5:1 requirement)
- **Accent Primary**: `oklch(0.65 0.18 240)` (refined sapphire blue for primary CTA)
- **Accent Primary Hover**: `oklch(0.70 0.19 240)`
- **Success / Connected**: `oklch(0.72 0.17 145)` (emerald green badge/glow)
- **Warning / Retrying**: `oklch(0.75 0.16 75)` (amber notification)
- **Danger / Error**: `oklch(0.65 0.22 25)` (crimson error states)

## Typography
- **Font Stack**: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif`
- **Headings**: Semibold (600), `text-wrap: balance`, letter-spacing: `-0.015em`
- **Body & Labels**: 13px / 1.4 for labels and descriptions, 12px for badges and meta
- **Input Text**: 13.5px monospace/sans blend for USN, secure dots for password

## Components & Micro-interactions
- **Input Fields**:
  - Border transition to `border-focus` with 2px outer ring glow on focus
  - Embedded toggle button for showing/hiding password
  - Clear label hierarchy with USN / Roll number hint
- **Switches & Toggles**:
  - Smooth 180ms ease-out transitions
  - Accessible checkbox backing with custom slider track
- **On-Page Portal Toast**:
  - Compact glassmorphism/pill badge at top-right of portal
  - Floating status: "Detecting...", "Logging in as [USN]...", "Connected ✓"
  - Auto-dismiss on success with gentle fade-out
