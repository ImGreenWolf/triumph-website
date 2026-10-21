# Footer documentation handoff — 2026-10-21

## Scope and disposition

The shared frontend footer is a local extension of the incumbent visual system. The supplied finish-review verdict is **ship**: persistence, fidelity, and ceiling pass; material fixes: none.

`PRODUCT.md`, the repository-root `.impeccable/surfaces/footer.md`, the footer implementation, existing global typography/color definitions, `validation.md`, `results.json`, and all six review screenshots were checked for this handoff. No previous `DESIGN.md` exists and no new global identity was approved. Global design files remain unchanged; this document records the scoped footer decisions without establishing site-wide visual rules.

## Layout and token reuse

The existing container holds club identity, the saved description and social links, navigation, a return-to-top control, a solid typographic wordmark, and the copyright/legal/theme row. Below 48rem the main regions stack in reading order. At 48rem and above, identity and navigation form a 1.2:0.8 grid. Wrapping bottom-row content, zero minimum grid widths, fluid spacing, and breakable text prevent horizontal overflow. The wordmark scales with container width and authored character count; lower padding respects the device safe area.

Poppins is inherited from the existing frontend font setup. All footer styling uses Tailwind utilities, including sidebar/sidebar-foreground tokens, opacity variants, gold accent states, responsive layout, safe-area padding, and focus rings. The footer stylesheet has been removed. The only dynamic values are the authored wordmark length and Motion's blur/stretch values. Theme selection remains available. Circular controls and ruled navigation preserve the local form language.

## Scroll occlusion and accessibility

Tailwind sticky/bottom-0 positioning places the footer beneath an opaque page/header wrapper. The wrapper preserves the incumbent background pattern and header/content stacking relationships while covering the footer until the page scrolls away. Position follows native browser scrolling; no animation-frame transform loop positions the footer. ResizeObserver checks whether the footer fits inside the viewport.

A document-flow marker tracks entry independently of the sticky footer. The existing Motion package maps that progress from blur(16px) to blur(0px), clearing early in the reveal. Motion's damped spring scales the contents vertically from a bottom origin when wheel or upward touch gestures continue at the document bottom. Increasing resistance caps the stretch below 8%; release returns it to rest. Transforming upwards preserves document height. Native root overscroll bounce is disabled using Tailwind to avoid doubling the effect. See [Motion scroll values](https://motion.dev/docs/react-use-scroll).

Reduced-motion preference disables sticky positioning, blur, stretch, and supporting transitions, and makes return-to-top immediate. A footer whose height is at least the viewport height minus 32px uses normal flow so every link remains reachable; bottom-edge stretch remains available. Focus restores normal positioning, removes blur/stretch, and scrolls the focused element into view. Without the client effect, the markup remains in normal flow. Nested scrollable controls, horizontal wheel gestures, pinch gestures, and portalled menus do not trigger stretch.

Links and buttons have visible accent focus outlines. Social controls have authored accessible names, the footer navigation has a Romanian landmark label, and decorative icons and the repeated wordmark are hidden from assistive technology. The measured controls are at least 44px high. External links retain safe new-tab attributes. Return-to-top uses a native button.

## Content and assets

The existing Payload footer global still supplies description, navigation, socials, wordmark, return label, legal links, and copyright. Nullish fallback behavior preserves deliberately empty authored values. Current CMS labels and link counts remain editor-controlled. No CMS schema, saved data, or publication state changed.

The actual existing club logo is reused. Icons come from the incumbent Lucide package and the wordmark is text. No new shipping raster assets were created, so no new raster provenance is required. Review PNGs are verification artifacts.

## Evidence and verification boundaries

The latest implementation passed eight viewport/motion cases and a separate emulated touch test; see the current section of validation.md. Earlier measurements below describe the previous implementation. Latest desktop/mobile/small captures were updated; tablet, landscape, reveal, and results.json retain earlier evidence. Physical Safari/iOS overscroll and authenticated member routes have not been exercised.

- [Desktop](desktop.png), [tablet](tablet.png), and [mobile](mobile.png) show the final composition at document end. [Small](small.png) and [landscape](landscape.png) show the naturally scrollable lower portion of viewport-tall footers. [Reveal](reveal.png) shows partial occlusion.
- [Raw measurements](results.json) cover Chromium at 1440×1000, 768×1024, 390×844, 320×568, and 844×390 with both normal and reduced motion: ten passing cases. They record no horizontal overflow, cleared end transforms, visible focused links, and minimum control heights. Normal-motion desktop/tablet/mobile panels align to the viewport bottom during partial reveal; the small and landscape cases use normal flow.
- [Validation report](validation.md) additionally records alignment after another 50px scroll, working return-to-top, preserved live link counts, and no browser exceptions. Its reproducible browser script was kept temporarily at `/private/tmp/triumph-footer-review/check.cjs`.
- The recorded source-only TypeScript check, focused ESLint using the existing native Next flat configuration, Prettier, and `git diff --check` passed. Repository-wide TypeScript still has the unrelated missing `tests/helpers/seedUser` and incomplete `BasePayload` test-mock errors; default ESLint still has its existing circular-structure failure. The active design hook reported no deterministic finding.

This handoff inspected existing implementation and evidence; it did not rerun runtime or source checks. CMS editing/save, production build, physical devices, and browser engines beyond Chromium were not exercised. The browser matrix does not establish a separate full light-theme, screen-reader, or arbitrary long-content audit.
