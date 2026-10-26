---
version: 1
slug: "triumph-website-src-header-nav-cardnav-tsx"
primary_target: "triumph-website/src/Header/Nav/CardNav.tsx"
related_targets: ["triumph-website/src/Header/Component.client.tsx"]
---

# Header

Scope: shared public header; Operate / wayfinding. Code-first local redesign within the established teal-and-gold identity. Preserve CMS-authored groups, labels, destinations, logo, and member access. No CMS schema or content changes.

## Direction contract

THESIS: A compact club masthead unfolds into a readable directory, giving public discovery and member access equal clarity.

OWN-WORLD: Existing Poppins, teal card masthead, deep teal directory, light type, restrained gold controls, thin separators, actual club logo. Replace individual navigation cards with open columns.

STORY: Recognize the club, choose a primary destination directly on wide screens, open the complete directory, or enter the member area.

FIRST VIEWPORT: Logo left, CMS category shortcuts in the center from 1200px, gold account link and labeled menu control right. A maximum 1200px floating masthead has 16px outer gutters, reduced to 12px below 768px. The mobile menu retains its accessible label while displaying only its icon. Opening reveals columns that fit the number of groups; mobile stacks groups in a scrollable panel with generous touch targets.

FORM: Scoped component extension, no global identity change or concept seed. Signature interaction: one continuous panel reveal, 360ms ease-out opening and 220ms closing, with a 300ms two-line menu morph. Hover arrows move only on actionable links. Reduced motion settles immediately. Closed content is inert and hidden to assistive technology; Escape returns focus, outside clicks, focus leaving the navigation, and navigation dismiss. CSS owns interruptible transitions without a new dependency.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Scoped finish completed: the reviewer scored the single current-page-marker fix resolved and returned `disposition: ship` for that fix. The ordinary component extension is documented at `triumph-website/.impeccable/review/header/documentation.md`; incumbent source tokens and global design files are preserved.

No new shipping raster assets. Existing logo is reused. Confirmed user answer: show desktop shortcuts and an expandable full menu.

## Implemented decisions

- Reuse the application's Poppins family, card teal, background teal, light foreground, and gold accent through existing CSS variables. No new global tokens or identity assets.
- Keep the masthead and directory in one rounded surface. Use thin group separators and open columns instead of separate category cards. The directory uses one to four columns for up to four groups, three columns for larger sets, and a single column below 768px.
- Keep the account link visible at every size. Preserve CMS labels, destinations, ordering, logo configuration, and authorization boundaries.
- Current-page shortcuts use a gold pseudo-element on the link container, outside the text's ellipsis clipping area. The 1280px and 1440px recaptures show the marker; directory links retain their gold underline.
- These are header decisions, not global rules for typography, composition, motion, or other components. The checked code, screenshot evidence, and validation limits are recorded in the scoped documentation.

## Current styling refinement — 2026-10-22

The independent Tailwind/block-motion finish review returned **ship** with no fixes, after checking all ten current desktop/mobile captures. Header layout, navigation behavior, CMS configuration and incumbent identity remain as described above. The original header completion and review records remain historical evidence.

`triumph-website/src/Header/Nav/CardNav.tsx` now owns its styling through Tailwind utilities and data/group variants. The dedicated header stylesheet was removed. Preserve the existing CSS custom properties for runtime CMS surface color and group count, plus the runtime menu color. Preserve the 360ms opening, 220ms closing, 300ms menu morph and immediate reduced-motion state; the direction contract's CSS-owned transitions are implemented through Tailwind-generated CSS. Keep closed directory content inert and hidden to assistive technology, and preserve focus/Escape, outside click, link dismissal and current-page markers.

Current finish documentation: `triumph-website/.impeccable/review/tailwind-blocks/documentation.md`. The 1440px and 390px menu captures show the retained directory and account access. The overall refinement passed 33 browser scenarios and 20 navigation/server-rendering tests; direct ESLint is clean. TypeScript retains two known unrelated test errors. No production build, deployment, authenticated CMS interaction, CMS write, new dependency or new shipping raster was introduced.
