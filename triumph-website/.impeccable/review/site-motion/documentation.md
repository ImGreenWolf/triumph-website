# Site motion documentation

Original review completed: 2026-10-22. Independent finish-review disposition: **ship**; no material fixes. Scope: restore footer blur, animate public content with the installed Motion library, and add horizontal blinds during page navigation.

## Incumbent world comparison

The implementation extends the existing visual system. The normative sources remain `src/app/(frontend)/globals.css`, the local font setup in the frontend layout, `tailwind.config.mjs`, and existing components. `PRODUCT.md` supplies the Romanian language, club identity, and equal priority of public discovery and internal operations. No new brand or design-system files are warranted by this extension; `PRODUCT.md`, global styles, and any global design records were not rewritten by this documentation pass. Root `DESIGN.md` and `.impeccable/design.json` were absent when checked and remain absent.

The active background token is deep teal (`#102a31`), the accent is gold (`#d4b55d`), card surfaces use the incumbent teal (`#2a5360`), and the footer uses the darker sidebar token (`#0a1b20`). Slats reference `var(--background)` and use a thin lower edge mixing 24% of `var(--accent)` into that background. They introduce no separate palette. Poppins remains the primary text family with system fallbacks; the incumbent heading scale, local display fonts, imagery, containers, breakpoints and component shapes are unchanged.

## Current implemented decisions

- **Route continuity:** `SiteMotion` surrounds the existing frontend page and footer and provides `MotionConfig` with user reduced-motion preference. Eight decorative fixed slats are hidden and do not receive pointer input at rest. Slats animate only their vertical scale. Each closes over 220ms with 18ms stagger (approximately 346ms overall), then the requested destination is pushed. Each reopens over 360ms with 24ms stagger (approximately 528ms overall). Existing background/accent tokens supply their material.
- **Initial and subsequent arrivals:** initial visits retain immediate content visibility. Non-anchor pathname commits reset scroll to zero instantly before the destination reveal. Back/forward and programmatic pathname changes receive the same top arrival without adding a history entry. Intercepted non-anchor links disable Next automatic scrolling, and history restoration is manual while mounted. Explicit anchors keep their destination. Existing header and menu components retain their own choreography.
- **Native navigation:** external origins/protocols, downloads, file-like routes, admin/API/Next routes, same-path queries/hashes, modified clicks, new-tab targets, explicit external relations and opted-out links do not use the decorative transition.
- **Recovery:** a 4.5-second timeout or Escape clears a stalled cover and the busy state. A reduced-motion preference change during the closing phase removes the effect and continues a pending destination. The overlay is marked decorative and route transition state is reflected through `aria-busy` on the page container.
- **Public content entrances:** every CMS block owns its once-per-visit observer, including nested blocks, tall blocks and forms. Surrounding page sections do not duplicate their block children. Standard blocks settle from 24px over 500ms; compact media reveals an 8% lower inset over 550ms. Below-fold blocks fade from zero opacity; initially visible blocks fade from 0.65. The common settling ease is `[0.16, 1, 0.3, 1]`. Existing team, text/logo loop and scrolling-gallery blocks fade without a transform or mask. Member routes skip entrances. Streamed or inserted sections register through mutation observation. Blocks are hidden only after observer and focus recovery are installed. Focus, completion and cleanup remove temporary styles.
- **Footer depth:** a zero-height flow anchor measures reveal progress independently of transformed geometry. Blur falls from at most 16px to zero as the sticky footer emerges. At the document bottom, keyboard focus, reduced motion, or insufficient viewport space for sticky presentation, the footer is clear. The existing resisted footer stretch remains. Its untransformed height determines sticky eligibility.
- **Progressive behavior:** content is visible before enhancement. A reactive media-query subscription restores waiting blocks when reduced motion changes during a visit. Reduced motion bypasses slats, entrances and footer blur. Root scroll behavior is auto; the independent back-to-top control explicitly retains smooth scrolling. No extra entrance is applied to individual controls.

These durations and distances describe this surface implementation. They are not newly declared global tokens or a replacement motion policy for every existing component.

## Current followup evidence

The current behavior above includes the page-top and independent-block refinement documented in `../site-motion-followup/documentation.md`. A fresh independent review returned **ship**, with all six followup captures valid and no material fixes. The full browser run passed 30 other regression checks. A synthetic below-fold setup initially failed; its corrected focused block-reveal check then passed twice. Together these validate 31 distinct checked scenarios across the run and followup, without claiming a fresh all-31 suite run. No application code changed after the independent ship review. Direct ESLint is clean; the two known unrelated TypeScript test errors remain. No production build, deployment or authenticated CMS validation was performed.

## Historical original evidence and limits

The implementation report records 26 passing browser checks (seven new motion checks and nineteen existing header/public-site checks), 13 passing focused navigation eligibility tests, and clean direct ESLint for the implementation and new tests. An additional once-per-visit entrance/focus regression passed, bringing the checked browser scenarios to 27 across the suite and focused followup. TypeScript reports the two existing errors in `admin.e2e.spec.ts` and `memberPasswordReset.int.spec.ts`; a clean full typecheck is not claimed.

Browser evidence covers internal keyboard navigation, route arrival and history, stalled navigation and Escape recovery, a live reduced-motion preference change, no-JavaScript content visibility, footer focus/readability, and mobile reachability. Review captures use desktop 1440×1000 and mobile 390×1000. The implementation report records approximately 8px blur at the intentional partial-footer state, zero blur at the bottom, no runtime page errors and no horizontal overflow. An automatic design hook reported no deterministic findings on patched UI targets; no further manual craft-floor scan is claimed.

The independent reviewer inspected all ten captures, judged them valid, and matched the implementation to all direction promises. The documentation pass additionally sampled the desktop homepage, desktop in-flight blinds and mobile settled-footer captures against the source. It checked the motion stylesheet, all `SiteMotion` source files, footer reveal, frontend layout, active global tokens, Tailwind typography configuration, `PRODUCT.md`, the direction contract and the implementation report.

This pass does not claim a production build, deployment, authenticated member workflow audit, CMS save/live-preview interaction, or exhaustive browser/device coverage. No dependency, schema, CMS content, or new shipping raster image was added.

## Historical original capture provenance

All PNGs beside this file are locally captured application screenshots supplied by the implementation validation pass on 2026-10-22. They document the existing imagery and text rendered by the application; they are review artifacts, not application media assets. No generated image or newly sourced raster is shipped.

| Files | State and provenance |
| --- | --- |
| `desktop.png`, `mobile.png` | Existing homepage first viewport, with its original looping video/handwriting; partial handwriting is an expected animation frame. |
| `desktop-footer-partial.png`, `mobile-footer-partial.png` | Intentional intermediate scroll-linked footer blur. |
| `desktop-footer-clear.png`, `mobile-footer-clear.png` | Settled footer at the document bottom. |
| `desktop-blinds-closing.png`, `mobile-blinds-closing.png` | Intentional in-flight navigation closing frame. |
| `desktop-arrival.png`, `mobile-arrival.png` | Settled events destination following the transition. |

## Not canonized or repaired

The two pre-existing TypeScript test errors remain outside this animation extension. Existing authored copy, hero handwriting frames, typography and other incumbent styling are recorded as context, not endorsed as newly established design rules. No global design drift was repaired without authorization.
