---
name: Hush
colors:
  surface: '#13131a'
  surface-dim: '#13131a'
  surface-bright: '#393841'
  surface-container-lowest: '#0e0e15'
  surface-container-low: '#1b1b22'
  surface-container: '#1f1f26'
  surface-container-high: '#2a2931'
  surface-container-highest: '#34343c'
  on-surface: '#e4e1ec'
  on-surface-variant: '#cac4d1'
  inverse-surface: '#e4e1ec'
  inverse-on-surface: '#303038'
  outline: '#938f9a'
  outline-variant: '#48454f'
  surface-tint: '#ccbeff'
  primary: '#dfd5ff'
  on-primary: '#332664'
  primary-container: '#c4b5fd'
  on-primary-container: '#514483'
  inverse-primary: '#625595'
  secondary: '#c9beff'
  on-secondary: '#30138c'
  secondary-container: '#4934a5'
  on-secondary-container: '#bbaeff'
  tertiary: '#ddd8eb'
  on-tertiary: '#312f3d'
  tertiary-container: '#c1bccf'
  on-tertiary-container: '#4e4b5b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e7deff'
  primary-fixed-dim: '#ccbeff'
  on-primary-fixed: '#1e0e4e'
  on-primary-fixed-variant: '#4a3d7c'
  secondary-fixed: '#e5deff'
  secondary-fixed-dim: '#c9beff'
  on-secondary-fixed: '#1b0063'
  on-secondary-fixed-variant: '#4732a3'
  tertiary-fixed: '#e5e0f3'
  tertiary-fixed-dim: '#c9c4d7'
  on-tertiary-fixed: '#1c1a28'
  on-tertiary-fixed-variant: '#474554'
  background: '#13131a'
  on-background: '#e4e1ec'
  surface-variant: '#34343c'
typography:
  headline-xl:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Newsreader
    fontSize: 30px
    fontWeight: '400'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Newsreader
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  code-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an intimate, elevated editorial atmosphere paired with developer-grade technical rigor. Designed for deep contemplation and private cognitive exchange, the visual language balances the solemnity of classical literature with the sharp, unambiguous clarity of modern developer environments.

The mood is calm, nocturnal, and intellectually intimate. It deliberately rejects noisy cyberpunk neon tropes, sterile corporate chat interfaces, and playful consumer bubbles. Instead, the design system employs deliberate serif headlines, pristine sans-serif body prose, hairline containment borders, and understated lavender phosphorescence to create a focused sanctuary for reflection and thought-branching.

## Colors

The chromatic structure is built upon an obsidian night canvas, layered with calibrated obsidian-violet surfaces to create depth without relying on stark elevation:

- **Canvas & Surfaces:**
  - Background Canvas: `#0B0B12` (Void Black)
  - Primary Surface: `#12121B` (Deep Abyssal Violet)
  - Secondary Surface: `#181722` (Structured Container)
  - Elevated Surface: `#242230` (Contextual Overlays & Popovers)
- **Structural Lines:**
  - Structural Border: `#343044` (Hairline delineation with 1px precision)
  - Subtle Border: `rgba(196, 181, 253, 0.08)` (Subtle trace elements and nested branches)
- **Text & Editorial Hierarchy:**
  - Primary Text: `#F3F0FA` (High-legibility alabaster with violet undertones)
  - Secondary Text: `#A9A4BB` (Calm reflective slate)
  - Muted Text: `#777187` (Metadata, timestamps, and node linkages)
- **Accents:**
  - Primary Accent: `#C4B5FD` (Soft luminous lavender)
  - Secondary Accent: `#9D8BFF` (Deep electric iris for active states and focused cursors)

## Typography

The typographic hierarchy intentionally contrasts the literary cadence of Newsreader with the functional clarity of Geist. 

- **Headlines & Conversational Titles:** Newsreader evokes the gravitas of a classic leather-bound volume or private journal. It handles conversational prompts, introspective queries, and thought branch roots.
- **Body Discourse & Responses:** Geist provides neutral, distraction-free reading comfort over long cognitive exchanges. It optimizes legibility across dark surfaces with slightly expanded line-height.
- **System States & Monospace Code:** Inline code snippets, metadata, thought-chain coordinates, and encryption indicators use monospaced weights of Geist or standard system monospaces, styled with lower contrast and tightened tracking.

## Layout & Spacing

The layout model balances focused reading columns with an asymmetric branching structure for non-linear thoughts:

- **Desktop (>= 1200px):** A three-pane architecture featuring a slender session rail (260px), a central reading canvas with a strict maximum reading width of 680px for ergonomic reading, and an optional 380px inspector canvas for the Thought Trails hierarchy.
- **Tablet (768px - 1199px):** Two-pane layout with collapsible side rails and drawer-based Thought Trails.
- **Mobile (< 768px):** Single-column fluid view with pinned bottom input docking and full-screen overlay drawers for trail inspection.

The vertical rhythm adheres to a strict 4px/8px base unit. Generous spacing (`space-xl`) between conversational turns encourages reflective pacing rather than rapid-fire chat behavior.

## Elevation & Depth

Visual hierarchy eschews dramatic drop shadows, instead relying on tonal layering, subtle hairline borders, and ambient lavender glows:

- **Surface Tiers:**
  - Base level (`#0B0B12`): The global backdrop.
  - Recessed level (`#12121B`): Inactive branches, reading areas, message transcript backing.
  - Active level (`#181722`): Elevated cards, active branch nodes, command palettes.
  - Floating level (`#242230`): Context menus, tooltips, popovers.
- **Borders & Outlines:** Surfaces are bounded by crisp 1px borders in `#343044`. Selected or active containers use a 1px border colored `rgba(196, 181, 253, 0.4)`.
- **Atmospheric Glows:** High-priority elements and focused thought nodes project a low-opacity, wide-radius ambient glow: `0 0 32px -8px rgba(157, 139, 255, 0.12)`.

## Shapes

The shape system leverages subtle, disciplined corner radiuses to reinforce a calm, architectural aesthetic:

- **Base Radius (0.25rem / 4px):** Used for micro-chips, code tags, metadata badges, and inner form controls.
- **Container Radius (0.5rem / 8px):** Used for message blocks, input fields, branch forks, and standard cards.
- **Prominent Radius (0.75rem / 12px):** Reserved for floating dialogs, command palettes, and primary reading containment cards.

Pill-shaped containers are strictly avoided to prevent standard consumer messaging aesthetics.

## Components

### Buttons
- **Primary:** Background in `#C4B5FD` with text in `#0B0B12`, weight medium (500). Hover state transitions subtly to `#9D8BFF` with a soft lavender outer bloom.
- **Secondary / Ghost:** Transparent background with a 1px border in `#343044` and text in `#F3F0FA`. On hover, background shifts to `rgba(24, 23, 34, 0.8)` and border brightens to `rgba(196, 181, 253, 0.3)`.
- **Text Action:** Borderless, styled in `#A9A4BB` with an underline reveal on hover.

### Inputs & Prompt Bar
- Fixed dock or inline command input with a subtle `#12121B` background, 1px `#343044` border, and 8px border-radius.
- Focus state brings a 1px `#9D8BFF` border and an ambient `0 0 16px -4px rgba(157, 139, 255, 0.2)` shadow.
- Placeholder text in `#777187` set in Geist with an editorial cadence.

### Cards & Thought Nodes
- Structured containers (`#181722`) with 1px `#343044` framing.
- Internal padding matches `space-lg` (24px) for reading ease.
- AI responses present headers in Newsreader serif and body text in Geist, avoiding chat bubble visual metaphors entirely.

### Thought Trails (Branching Tree System)
- Visual hierarchy lines rendered via 1px hairline connectors in `#343044`.
- Branch nodes use `#12121B` with tiny 4px indicator dots (`#9D8BFF` when active, `#777187` when archived).
- Branch cards display breadcrumbs in label-sm uppercase monospace, giving users a precise, tree-based mental map of bifurcated dialogue.

### Chips & Badges
- Compact height (24px), border-radius 4px, background `rgba(36, 34, 48, 0.6)`, and 1px border in `#343044`.
- Text styled in `label-sm` using `#A9A4BB`.