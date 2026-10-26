# Tailwind and RenderBlocks motion

Request: use Tailwind instead of CSS stylesheets, place block animation in RenderBlocks, and stagger individual stats.

Implemented:
- `RenderBlocks` now renders each server block through `BlockReveal.client.tsx`. Animation registration and cleanup belong to that block instance; the site-wide selector registry and MutationObserver were removed.
- Server rendering stays intact, including async StatsBlock data reads and server-rendered children. Below-fold waiting, media masks, fade-only looping blocks, focus recovery, and live reduced motion are preserved.
- `StaggeredStats.client.tsx` wraps the stats row. Its direct stat children rise 16px and fade in sequentially over450ms, at80ms intervals with a240ms maximum delay for the final item. The row owns one viewport observer, runs once, and restores immediate visibility for focus/reduced motion.
- Header and blinds styling now use Tailwind utility/data/group variants. Dedicated `header.css` and `motion.css` were deleted; no replacement stylesheet. The existing base site styles remain the site's incumbent system. Motion owns runtime transforms/opacity; waiting and transition states use Tailwind data variants.
- Page-top navigation, history behavior, explicit anchor destinations, footer blur, CMS content, club identity and published data remain unchanged.

Validation: focused checks for stat order/reduced motion, independent block instances and Tailwind menu reduced motion passed.20 navigation/server rendering tests passed. Server rendering test mocks were refreshed for existing recruitment status/count APIs. Final33-browser suite passed. Independent finish review returned `disposition: ship` with no material fixes and all10 captures valid. Direct ESLint clean; TypeScript only the2 known unrelated test errors.

Captured1440x900 and390x900: homepage, expanded header, intentional in-flight stat stagger, settled stats, and intentional closing blinds. Captured mid-stagger opacity order was approximately[0.97,0.90,0.64,0] desktop and[0.98,0.92,0.70,0] mobile. Both destination scrollY values were0. No runtime page errors or horizontal overflow. Partial handwriting/video is the incumbent hero loop; in-flight captures intentionally show incomplete transitions. Existing authored copy and other styling remain outside the motion refactor scope.

No new dependency, schema/CMS write, raster asset, production build or deployment.
