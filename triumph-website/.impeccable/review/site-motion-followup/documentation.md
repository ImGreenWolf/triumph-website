# Site motion followup documentation

Documented: 2026-10-22. Independent finish-review disposition: **ship**. All six followup captures are valid; no material fixes or unmet direction-contract promises were found.

## Scope and source of truth

This ordinary refinement implements immediate page-top arrival and independent CMS block entrances in the existing visual world. `PRODUCT.md`, the global styles, local fonts and incumbent components retain authority. No global `DESIGN.md`, sidecar, palette, typography, layout or imagery change is introduced. The surface contract remains at the repository root in `.impeccable/surfaces/site-motion.md`.

The source checked was `src/components/SiteMotion/BlindsTransition.tsx`, `ScrollEntrances.tsx`, `useMotionPreference.ts`, the block marker in `src/blocks/RenderBlocks.tsx`, and root scroll behavior in `src/app/(frontend)/globals.css`. The original motion documentation remains in `../site-motion/documentation.md`; its original test counts and ten captures are historical evidence.

## Current rules

- Non-anchor pathname changes reset scroll instantly to zero in a layout effect, before horizontal blinds uncover. This includes history and programmatic arrivals. Intercepted links disable Next automatic scrolling; history restoration is manual while the motion controller is mounted and restores on cleanup. Explicit anchors retain their destination.
- Root scroll behavior is auto. The separate back-to-top button still explicitly requests smooth scrolling.
- Every CMS block has `data-scroll-block` and its own once-per-visit observer, including tall blocks, nested blocks and forms. Surrounding sections do not duplicate their block children's entrance. Member operational routes skip content entrances.
- Standard blocks fade and settle from 24px over 500ms. Compact media fades with an 8% lower inset over 550ms. Existing team, text/logo loop and scrolling-gallery blocks fade without changing their coordinate system. The shared settling ease is `[0.16, 1, 0.3, 1]`.
- Below-fold blocks become transparent only after observer and focus recovery are installed. Content is visible before enhancement and without JavaScript. Focus, animation completion and cleanup remove temporary styles. A reactive media-query subscription handles live reduced-motion changes, restoring waiting content and bypassing route effects.

These values describe this motion surface; they are not new global design tokens. The existing eight slats, route failure recovery, header/menu choreography and footer blur/focus behavior retain their established roles.

## Evidence and limits

The full browser run passed 30 other regression checks. One synthetic below-fold setup initially failed; after the setup waited for page enhancement and guaranteed offscreen placement, the focused block-reveal check passed twice (8.4s and 9s; 23.6s for both repeats). Together these validate 31 distinct checked scenarios across the run and followup. This report does not claim a fresh all-31 suite run. No application code changed after the independent ship review. Direct ESLint is clean. TypeScript retains only the two known unrelated test errors in `admin.e2e.spec.ts` and `memberPasswordReset.int.spec.ts`.

The supplied capture report records desktop/mobile arrivals at scrollY zero, selected-events opacity changing from zero to one, and no runtime page errors. The independent reviewer inspected all six captures. This documentation pass sampled the desktop settled block and mobile destination arrival against the source. The original page's video/handwriting loop remains incidental to capture timing.

No production build, deployment, authenticated member workflow audit, CMS save/live-preview interaction or exhaustive device coverage is claimed. No dependency, schema, CMS content or new shipping raster was added.

## Capture provenance

All six PNGs beside this file are local application screenshots captured for the followup review on 2026-10-22. They show existing authored content and media and are review artifacts, not shipping image assets.

| Files | State |
| --- | --- |
| `desktop.png`, `mobile.png` | Homepage at document top with existing hero loop. |
| `desktop-block.png`, `mobile-block.png` | Settled selected-events block after its own entrance. |
| `desktop-arrival.png`, `mobile-arrival.png` | Events destination at document top after navigation from the footer. |

## Not canonized or repaired

The two pre-existing TypeScript test errors remain outside this motion refinement. Existing copy, typography and hero animation frames are context, not newly declared design rules. No unrelated global design drift was repaired.
