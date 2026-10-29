# Hush AI Design System

**Status:** Canonical UI specification  
**Applies to:** Every Hush web interface, responsive breakpoint, component, and state  
**Source of truth:** `PRD.md`

> All future Hush UI must use only the tokens, typefaces, component patterns, and states defined here. Do not introduce new colors, fonts, gradients, radii, shadows, or interaction behavior without first updating this document.

## 1. Brand feel

Hush is a **quiet, private intellectual sanctuary**: an editorial reading environment with the precision of a developer tool. It should feel calm, nocturnal, intimate, and trustworthy—not playful, corporate, crowded, cyberpunk, or like a conventional chat-bubble product.

### Design principles

1. **Privacy is visible, not implied**  
   Runtime, storage, and unavailable states must be understandable at a glance. Never use visual treatment that suggests a model is ready when it is not.

2. **Thoughts deserve room**  
   Reading and composing are the visual priorities. Use constrained reading widths, generous vertical rhythm, and quiet surface layers rather than dense dashboards.

3. **Branches remain legible**  
   Thought Trails must communicate lineage and independence with clear structure, restrained connectors, and explicit active/ancestor/sibling states.

## 2. Color system

Use semantic tokens in implementation. Hex values are the only approved palette values. Opacity variants of these values are allowed only when specified below.

### Dark mode — default

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#0B0B12` | App canvas, code canvas |
| `--surface` | `#12121B` | Primary panels, composer, assistant document |
| `--surface-secondary` | `#181722` | Raised controls, cards, side rails |
| `--surface-elevated` | `#242230` | Active cards, popovers, selected controls |
| `--surface-strong` | `#343044` | Pressed surfaces, code headers |
| `--border` | `#343044` | Structural 1px border |
| `--border-strong` | `#48435C` | Hovered/focused non-primary border |
| `--text-primary` | `#F3F0FA` | Main text and headings |
| `--text-secondary` | `#A9A4BB` | Body support text |
| `--text-muted` | `#777187` | Metadata, placeholders, inactive icons |
| `--primary` | `#C4B5FD` | Primary actions, selected accents |
| `--primary-strong` | `#9D8BFF` | Focus, active trail marker, primary hover |
| `--primary-ink` | `#1E0E4E` | Text/icon on solid primary |
| `--success` | `#34D399` | Ready/confirmed state |
| `--warning` | `#FBBF24` | Missing model/configuration warning |
| `--error` | `#FB7185` | Error/destructive action |
| `--error-surface` | `#4C121E` | Error panel background |

Allowed dark overlays: `rgba(196,181,253,0.08)` for subtle nested traces; `rgba(157,139,255,0.12)` for ambient glows; `rgba(0,0,0,0.70)` for modal scrims.

### Light mode — supported alternate theme

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#FAF8FF` | App canvas |
| `--surface` | `#FFFFFF` | Primary panels |
| `--surface-secondary` | `#F3F0FA` | Raised controls, cards |
| `--surface-elevated` | `#E9E3F4` | Active cards, popovers |
| `--surface-strong` | `#D9D1E6` | Pressed surfaces |
| `--border` | `#D1C8DC` | Structural border |
| `--border-strong` | `#A99EBA` | Hover/focus neutral border |
| `--text-primary` | `#201D28` | Main text and headings |
| `--text-secondary` | `#514C5E` | Body support text |
| `--text-muted` | `#746D80` | Metadata, placeholders |
| `--primary` | `#625595` | Primary action/selected accent |
| `--primary-strong` | `#4A3D7C` | Primary hover/focus |
| `--primary-ink` | `#FFFFFF` | Text/icon on solid primary |
| `--success` | `#087F5B` | Ready/confirmed state |
| `--warning` | `#A85C00` | Missing model/configuration warning |
| `--error` | `#B4233C` | Error/destructive action |
| `--error-surface` | `#FFE7EA` | Error panel background |

### Status mapping

- **Ready:** `success` dot and status text.
- **Generating/loading:** `primary-strong` dot with motion only when reduced motion is not requested.
- **Configuration missing/model missing:** `warning` dot and warning surface.
- **Offline/request failed:** `error` dot and error surface.
- Do not use success colors for an HTTP-only health response unless the configured model is confirmed installed. Do not indicate actual generation success until a response stream has produced content.

## 3. Typography

### Approved font families

- **Editorial / headings:** `Newsreader`, Georgia, serif
- **UI, prose, and code:** `Geist`, -apple-system, BlinkMacSystemFont, `Segoe UI`, Roboto, sans-serif
- **Code fallback only:** `ui-monospace`, SFMono-Regular, Menlo, monospace

Do not add display, handwritten, geometric, or additional third-party fonts.

### Type scale

| Token | Family | Size / line height | Weight | Tracking | Use |
| --- | --- | --- | --- | --- | --- |
| `display` | Newsreader | 58px / 64px desktop; 42px / 48px mobile | 400 | -0.025em | Landing statement only |
| `h1` | Newsreader | 40px / 48px; 30px / 38px mobile | 400 | -0.02em | Primary page title |
| `h2` | Newsreader | 28px / 36px | 400 | -0.015em | Assistant response heading |
| `h3` | Newsreader | 22px / 30px | 500 | -0.01em | Card/subsection heading |
| `body-lg` | Geist | 16px / 26px | 400 | -0.005em | Long-form response prose |
| `body` | Geist | 14px / 22px | 400 | 0 | Standard content/input |
| `body-sm` | Geist | 12px / 18px | 400 | 0.005em | Supporting text |
| `label` | Geist | 13px / 18px | 500 | 0.01em | Buttons, controls, form labels |
| `meta` | Geist | 11px / 16px | 500 | 0.04em | Uppercase metadata/status |
| `code` | Geist/mono | 13px / 20px | 400 | -0.01em | Code blocks and runtime details |

- Body content must never be smaller than 14px except explicit `body-sm`, `label`, or `meta` content.
- Use sentence case for action labels. Reserve uppercase for short metadata labels only.
- Limit text measure to 700px for workspace prose and 620px for landing supporting copy.

## 4. Foundations

### Spacing

Base unit: 4px. Only use this scale:

| Token | Value |
| --- | --- |
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |
| `space-16` | 64px |

Page gutters: 24px desktop, 16px mobile. Standard card padding: 24px desktop, 16px mobile.

### Border radius

| Token | Value | Use |
| --- | --- | --- |
| `radius-sm` | 4px | Tags, inline code |
| `radius-md` | 8px | Buttons, inputs, standard cards |
| `radius-lg` | 12px | Composer, dialogs, major cards |
| `radius-full` | 9999px | Status dot only; avoid pill-shaped primary containers |

### Borders and shadows

- Structural borders: 1px `border`.
- Focused primary controls: 1px `primary-strong` plus focus ring.
- Default shadow: none; use tonal separation first.
- Card shadow: `0 12px 32px -20px rgba(0,0,0,0.55)` dark; `0 12px 32px -22px rgba(32,29,40,0.22)` light.
- Focus/active glow: `0 0 20px -8px rgba(157,139,255,0.40)` dark; `0 0 20px -8px rgba(98,85,149,0.30)` light.
- Do not use heavy drop shadows, glassmorphism, or unapproved gradients.

### Breakpoints

| Name | Range | Layout behavior |
| --- | --- | --- |
| Mobile | `< 768px` | Single column; bottom-sheet Thought Trails |
| Tablet | `768px–1199px` | Central workspace; collapsible Thought Trails drawer |
| Desktop | `≥ 1200px` | Workspace plus persistent 288px right Thought Trails inspector |

## 5. Component specifications

### Universal states

Every interactive element must have default, hover, focus-visible, disabled, loading where relevant, and error behavior.

- **Default:** base surface/text token; 1px structural border when contained.
- **Hover:** use `surface-elevated` or `border-strong`; never change layout.
- **Focus-visible:** 2px `primary-strong` outer ring with 2px offset against its background. Do not rely on color alone.
- **Disabled:** 45% opacity, `not-allowed` cursor, no hover/focus action, accessible disabled semantics.
- **Loading:** preserve dimensions, disable conflicting actions, show an accessible text label and motion-safe spinner.
- **Error:** use `error` text/border and `error-surface`; pair icon/color with written recovery guidance.

### Buttons

**Sizes:** small 32px high; default 36px; touch-target 44px minimum on mobile. Horizontal padding: 12px default, 16px primary. Radius: `radius-md`.

| Variant | Default | Hover | Focus | Disabled | Loading/Error |
| --- | --- | --- | --- | --- | --- |
| Primary | solid `primary`, `primary-ink` | `primary-strong` | primary ring | 45% opacity | Spinner replaces leading icon; error is shown externally, not by changing primary button red |
| Secondary | `surface-secondary`, `text-primary`, border | `surface-elevated`, `border-strong` | primary ring | 45% opacity | Spinner/text state allowed |
| Ghost | transparent, `text-secondary` | `surface-secondary`, `text-primary` | primary ring | 45% opacity | Use for low-priority actions |
| Destructive | transparent/error outline, `error` | `error-surface` | error border + primary focus ring | 45% opacity | Require confirmation in modal for irreversible reset |
| Icon | 36×36px desktop, 44×44px mobile | `surface-elevated` | primary ring | 45% opacity | Must include accessible name via text or `aria-label` |

- Buttons must use visible text unless a familiar icon-only action has an accessible name and tooltip.
- Send becomes disabled for empty input. Stop is destructive-adjacent but must not require confirmation.

### Inputs and composer

- Input background: `surface`; border: 1px `border`; radius `radius-md`.
- Default: `text-primary`; placeholder `text-muted`.
- Hover: border `border-strong`.
- Focus: border `primary-strong`, approved focus glow, no removed outline unless replaced by focus-visible ring.
- Error: border `error`, supporting text in `error`, `aria-describedby` links error message.
- Disabled/read-only: `surface-secondary`, 45% opacity for disabled; read-only retains normal contrast.
- Composer: 96px minimum landing height, 56px minimum workspace height; styles appear above or inside the composer; send remains visually anchored at lower right.
- Press Enter to send and Shift+Enter for newline; expose this hint visually on desktop and programmatically.

### Cards, assistant documents, and user turns

- Standard card: `surface-secondary`, 1px `border`, `radius-lg`, 16px–24px padding.
- Assistant response: editorial document card; title uses `h2`/`h3`, prose uses `body-lg`; not a speech bubble.
- User turn: aligned to logical end, max width 75% desktop/92% mobile, `surface-elevated`, `radius-lg`; no bright messaging bubbles.
- Active trail card: `surface-elevated`, `primary` 1px border at 40% opacity, ambient approved glow.
- Hover is reserved for actionable cards; passive reading cards do not jump or elevate.
- Error card: `error-surface`, `error` border, recovery action button.
- Streaming card: primary status marker/cursor and readable “Generating” text; keep copy/branch actions disabled until complete.

### Modal / dialog

- Centered desktop dialog: max width 560px; full-width mobile sheet may use `radius-lg` top corners.
- Surface: `surface`; 1px `border`; approved card shadow; 16px–24px padding.
- Scrim: `rgba(0,0,0,0.70)` dark; equivalent 45% black light.
- Must use `role="dialog"`, `aria-modal="true"`, labelled title, initial focus, focus trap, Escape close, close button, and focus restoration.
- Backdrop click may close informational dialogs; destructive confirmations require an explicit cancel or close control.
- Storage options use selected primary border/surface plus textual “Active” state, never color alone.

### Navbar and runtime status

- Desktop height: 56–70px; mobile height: 56–60px.
- Background: `surface` or `bg` with bottom `border`; no floating opaque nav over reading content.
- Brand: Newsreader “Hush” plus restrained mark. Do not use a consumer SaaS-style avatar as the primary brand.
- Runtime badge always shows icon/dot plus text. It must map exact backend states to the status colors above.
- On narrow screens, retain access to Thought Trails, runtime status, privacy, and reset through icon controls with labels/tooltips.

### Thought Trails inspector

- Desktop: fixed 288px right panel, `surface`, left border `border`.
- Tablet/mobile: modal drawer/bottom sheet, with visible close button and focus containment.
- Header includes “Thought Trails,” active count, and branch creation only when a valid anchor exists.
- Parent/child connectors use 1px `border`; active node uses `primary-strong` 6px dot; inactive node uses `text-muted` 6px dot.
- Node states: root, active, ancestor, sibling, archived (V2), rename/edit, empty.
- Active node includes explicit title, relationship metadata, and turn count. Never imply that a sibling is part of the active model context.

### Tables

Tables are V2 but must follow this spec.

- Wrap in horizontal scroll on mobile; do not shrink body text below 12px.
- Header: `surface-secondary`, `label` typography, `text-secondary`.
- Rows: `surface`, bottom `border`; hover `surface-secondary` only when row is actionable.
- Numeric/runtime values use `code` typography.
- Empty state communicates why data is absent and next action.
- Never use color-only status cells; include text.

### Toasts

- Position: top-right desktop; top-center mobile; 16px from safe edge.
- Width: 320px max; `surface-elevated`, 1px `border`, `radius-md`, 12px padding.
- Variants: success, warning, error, informational (`primary`).
- Include short message, optional recovery action, and dismiss button; auto-dismiss only non-critical success/info after 5 seconds.
- Error and privacy/storage failures remain until dismissed or resolved.
- Announce through a polite live region; urgent failures may use assertive announcement.

### Code blocks

- Outer container: `bg`, `border`, `radius-md`, horizontal scrolling.
- Header: `surface-secondary`, language label in `code`, copy button.
- Code: `code` typography, 14px–16px padding, `text-primary`; syntax accent uses only `primary`, `text-secondary`, and `success` where necessary.
- Copy states: default “Copy,” success icon + “Copied,” error “Copy unavailable” with explanation if clipboard access fails.

## 6. Page layouts

### A. Landing / empty session

**Purpose:** Start an anonymous conversation and establish privacy/runtime truth.

- Desktop: 260px left cognitive-thread rail; centered main content max width 1080px; footer runtime/privacy line.
- Hero order: runtime/privacy badge → `display` title → editorial supporting text → large composer → four prompt starters → Thought Trails explainer → footer details.
- Mobile: hide the cognitive rail; keep brand, runtime badge, privacy control, hero, composer, prompt starters, and privacy note in one scrollable column.
- If runtime is unavailable, retain composer only if submission will surface a clear error; never visually imply availability.

### B. Conversation workspace

- Desktop: top app bar; central scrollable transcript (max 700px); persistent 288px Thought Trails inspector on the right.
- Tablet: app bar; central transcript; Thought Trails accessed by drawer trigger.
- Mobile: fixed app bar; sticky/fixed composer above browser-safe bottom area; Thought Trails opens as bottom sheet.
- Transcript order: active-trail context banner → user turn → assistant document → contextual actions → next turn.
- Composer remains visible without obscuring transcript content; reserve bottom padding equal to composer height.

### C. Streaming state

- Preserve prior transcript and input context.
- Assistant document shows “Generating” metadata with primary marker and animated cursor, respecting reduced-motion settings.
- Stop control is visible and enabled; retry, branch, and content actions for the incomplete response are disabled.
- On cancellation, keep partial content and show “Generation stopped” metadata.

### D. Error, offline, missing model, and configuration-missing states

- Show contextual inline card near the relevant response/composer and status badge in app bar.
- Configuration missing: explain private AI is not configured for this deployment; do not reference hidden environment values.
- Offline: explain server cannot reach Ollama; advise checking host/runtime.
- Model missing: show configured model name and safe setup guidance.
- Timeout: explain slow/loading/resource-constrained inference and offer retry.
- Each card has title, plain-language explanation, recovery action where possible, and technical detail only as non-secret metadata.

### E. Thought Trails drawer / bottom sheet

- Dim the underlying workspace with modal scrim.
- Header: grab handle on mobile, title/count, close control.
- Body: active trail hero card, lineage breadcrumb, sibling/child list.
- Footer: explanatory privacy/context note. Destructive purge/reset remains in the privacy/reset control path, not as an accidental gesture.

### F. Privacy & Architecture dialog

- Sections: local inference disclosure, storage preference, transparent limitation disclosure.
- Desktop centered modal; mobile bottom sheet if viewport height is constrained.
- Display session-only as default. Persistent storage requires a deliberate selection.
- Close, Escape, tab loop, and focus return behavior are mandatory.

### G. Reset confirmation

- Separate confirmation dialog for clearing session and trails.
- Clearly state what is deleted: active browser session, all Thought Trails, and selected browser storage copy.
- Actions: Cancel (secondary) and Clear session (destructive). Default focus is Cancel.

### H. V2 layouts

- **Export:** modal with format choice and local export explanation.
- **Trail search:** inspector search field at top, results retain lineage labels.
- **Model selection:** privacy/runtime dialog section showing installed local model list and current active model; never expose tokens.

## 7. Accessibility rules

1. **Contrast:** normal text requires WCAG AA 4.5:1; large text requires 3:1; controls/borders/focus indicators require 3:1. Verify both themes.
2. **Focus:** every keyboard-reachable element has the canonical visible focus ring. Never remove focus styling without replacement.
3. **Keyboard:** Enter sends from composer; Shift+Enter inserts a newline; Escape closes dialogs/drawers; Tab/Shift+Tab stay within open modal surfaces.
4. **Semantics:** use native buttons, labels, textareas, headings in outline order, lists for trail collections, and proper dialog semantics.
5. **Names and status:** icon-only controls require accessible names. Runtime and error states require written labels in addition to color/icon.
6. **Announcements:** streaming state, response completion, copy confirmation, and failures must use appropriate live-region announcements without excessive token-by-token narration.
7. **Motion:** honor `prefers-reduced-motion`; replace pulsing, glowing, and sheet animations with immediate or minimal transitions.
8. **Touch:** interactive mobile targets are at least 44×44px, with adequate spacing to prevent accidental destructive actions.
9. **Zoom/reflow:** at 200% browser zoom, the composer, dialogs, trail inspector, code blocks, and controls remain usable without horizontal page scrolling except within code/table containers.
10. **No color-only meaning:** pair all state colors with text, icon, or pattern.

## 8. Implementation guardrails

- Map all component styles to the semantic tokens above; do not place arbitrary hex values in components.
- Use one shared component pattern per control type; avoid one-off button/input/modal variants.
- Keep UI copy direct, calm, and transparent. Avoid claiming “private,” “ready,” “local,” or “offline” unless the state supports it.
- Preserve the PRD’s no-account, no-database, no-cloud-fallback constraints in every UI state.
- Update this document before expanding the visual system.
