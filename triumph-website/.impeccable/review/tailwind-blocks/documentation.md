# Tailwind and block motion: finish documentation

Disposition: **ship**. The independent reviewer inspected all ten current captures and reported no material fixes or unmet direction-contract promises. This is a scoped refinement within the existing Triumph world. The six literal direction-contract blocks, including FINISH, remain in the root surface records. Global design files and sidecar are preserved; no new visual identity was established.

## Shipped ownership

- `src/blocks/RenderBlocks.tsx` wraps server block output in `BlockReveal.client.tsx`. Each instance owns observation, waiting, entrance and cleanup; server children, including async StatsBlock reads, remain on the server. The site-wide entrance registry and MutationObserver were removed.
- `BlockReveal.client.tsx` keeps standard 24px/500ms entrances, compact-media 8%/550ms masks, and opacity-only entrances for looping/team/scrolling-gallery/stats blocks. Waiting begins only after observer/focus recovery registration. Default content visibility, member-route bypass, focus restoration and live reduced-motion recovery remain intact.
- `src/blocks/StatsBlock/StaggeredStats.client.tsx` owns one independent observer for direct stat articles. Each fades and rises 16px over 450ms; the interval is at most 80ms, with the final item's delay capped at 240ms. The sequence runs once and clears temporary opacity/transform on focus, reduced motion and cleanup.
- `src/components/SiteMotion/index.tsx` owns shared Motion configuration and blinds. `BlindsTransition.tsx` retains route/history, page-top and anchor behavior, failure recovery and eight-slat runtime transforms. Tailwind utilities and data/group variants own its static appearance and phase states.
- `src/Header/Nav/CardNav.tsx` owns header Tailwind styling, with existing runtime CMS variables/colors retained. Its 360ms opening, 220ms closing, 300ms menu morph, responsive directory, keyboard/focus behavior and current-page markers remain intact. Dedicated header/motion stylesheets were removed; incumbent base styles remain.

## Ground truth checked

Read the shipped RenderBlocks, BlockReveal, StatsBlock, StaggeredStats, SiteMotion, BlindsTransition and CardNav sources, the root PRODUCT.md, both existing surface records, and the implementation report. Inspected representative current captures directly: `mobile-menu.png`, `desktop-stagger.png` and `mobile-blinds.png`. These show the retained readable directory, sequential stats and plain horizontal slats in the incumbent palette. The reviewer separately validated all ten captures.

Palette remains deep teal, card teal, light foreground and restrained gold through existing tokens. Poppins typography, authored imagery, component shapes, content, block spacing and footer blur retain their existing authority. New rules are local ownership and enhancement rules; this pass does not promote observed authored copy or incidental styling into global design guidance.

## Validation and limits

Reported final verification: 33 browser scenarios and 20 focused navigation/server-rendering tests passed; direct ESLint is clean. Server-rendering test mocks were refreshed for already-existing recruitment/count APIs. TypeScript retains two known unrelated test errors. No production build, deployment or authenticated CMS save/live-preview interaction was performed. Earlier validation counts in the site-motion/header surface records are explicitly historical.

Capture set at 1440×900 and 390×900: `desktop.png`, `mobile.png`, `desktop-menu.png`, `mobile-menu.png`, `desktop-stagger.png`, `mobile-stagger.png`, `desktop-stats.png`, `mobile-stats.png`, `desktop-blinds.png`, `mobile-blinds.png`. These local application screenshots are review evidence, not newly shipped raster assets. Stagger/blinds captures intentionally show intermediate animation states; hero handwriting/video captures may show the incumbent loop in progress. Existing assets retain their provenance. No generated image, external raster, new asset, dependency, CMS schema/content write or identity change was introduced.

## Recorded scope

Updated only the root site-motion/header surface records and this scoped finish document. Preserved all six direction-contract blocks and literal FINISH text. No global DESIGN.md, sidecar, code or memory write was part of this documentation pass. Existing authored content and broader styling are outside this refactor's finish scope and were neither canonized as new rules nor repaired.
