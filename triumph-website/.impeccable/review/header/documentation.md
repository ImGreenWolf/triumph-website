# Header documentation handoff

This is a component extension of the existing Interact București Triumph interface. It records the implemented header without establishing a global design system. `PRODUCT.md`, global styles, and any global DESIGN.md or design sidecar are unchanged by this handoff.

## Evidence checked

- Read the root product brief and header surface contract; inspected `src/Header/Nav/CardNav.tsx`, `src/Header/Nav/header.css`, and `src/Header/Component.client.tsx`.
- Compared the header to the incumbent tokens in `src/app/(frontend)/globals.css`, the local Poppins setup in the frontend layout, and the existing Logo component's configured assets.
- Visually inspected `desktop.png`, `mobile.png`, `open-1440.png`, `open-390.png`, and `closed-1280.png` in this directory. The desktop samples show the corrected gold current-page marker; the mobile samples show the persistent account action and stacked directory.
- Read `implementation.md` and sampled the header Playwright assertions. The recorded implementation validation is 19 passing Playwright tests, direct ESLint, responsive captures from 320px to 1440px, and no detector findings. This documentation pass did not rerun those commands or independently verify all recorded scenarios.

## Colors

The header references the source tokens rather than copying a parallel palette: masthead `--card` (`#2a5360`), directory and gold-button text `--background` (`#102a31`), text `--foreground` (`oklch(98.5% 0 0deg)`), and account action, current-page marker, focus outline, and category arrows `--accent` (`#d4b55d`). Secondary directory text mixes the existing foreground with background; separators mix the existing foreground with transparency. These assignments apply to this header only.

## Typography

The header inherits the existing Poppins sans family. Controls and desktop shortcuts use 13px at weight 600; the mobile account label uses 12px. Category links use a responsive 18–24px size at weight 600 and line-height 1.35, switching to 22px on mobile. Directory links use 14px with line-height 1.5. CMS labels remain authored content; long shortcuts truncate while their title retains the full label, and directory labels wrap.

## Layout

The fixed wrapper contains a masthead with a maximum width of 1200px, 16px outer gutters, and an 80px minimum bar height. Below 768px, gutters become 12px and the bar's minimum height becomes 68px. Desktop category shortcuts appear from 1200px. The account action remains visible; the mobile toggle hides only its visible text while retaining an accessible name.

The directory uses one to four columns according to group count, or three columns above four groups. Below 768px it stacks all groups. The desktop directory has 32px padding and gaps; mobile uses 8px 20px 24px padding and 16px gaps. Its scrollable height is bounded by the viewport. Actions and directory links have a minimum height of 44px. Empty navigation removes the menu toggle while retaining home and account access.

## Elevation & Depth

The masthead and revealed directory share one container with a 16px radius and `0 8px 28px rgb(0 0 0 / 0.18)` shadow. Card teal above deeper teal communicates the two navigation levels. Thin separators define groups; category cards are absent. The account and menu controls use 8px radii. These component values are scoped details rather than additions to the global radius or shadow vocabulary.

## Components

The menu reveals its intrinsic height through a CSS grid transition: 360ms opening and 220ms closing with `cubic-bezier(0.16, 1, 0.3, 1)`. Its two-line icon morph lasts 300ms; link arrows move 2px up and right on pointer hover. Reduced-motion rules remove the header's transitions.

Closed content is inert and hidden from assistive technology. The menu exposes its expanded state and control relationship. Escape closes it and restores toggle focus; outside pointer input, focus leaving the navigation, and link activation close it. The wrapper remounts the navigation when the pathname changes. Focus uses a gold 2px outline with a 4px offset.

Current destinations have `aria-current="page"`. Directory and account links use an underline. Desktop shortcuts draw the gold marker using a pseudo-element on the link container so text overflow cannot clip it. The reviewer scored the current-page-marker correction resolved and returned `disposition: ship` for that scored fix, with no introduced regression observed.

## Scope and validation limits

No new raster ships with this change. The existing configured club logo is reused; these review screenshots are local evidence, not product imagery. No production build, deployment, CMS save, or publication is asserted. The implementation record identifies two pre-existing TypeScript test errors, outside this header's scope.

Pre-existing drift is preserved: globals contain the active teal/gold palette alongside commented older palette definitions and blue-oriented dashboard property defaults. Those unrelated values were not promoted into header rules or repaired. CMS spelling remains authored content; this handoff does not turn the sample labels into product copy standards. The initial header review's current-page marker issue was corrected and confirmed in the same 1280px and 1440px screenshot paths; the followup verdict scored the fix resolved.
