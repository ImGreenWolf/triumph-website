# Public CMS block polish

Implemented across the public page-builder and embedded block set, preserving content fields, club identity, CMS placement, and publication control. No schema/data migration or live CMS changes.

Changes: consistent section rhythm and inherited rich-text typography/colors; focus, selection and reduced-motion styles; responsive content/split layouts; contrasting buttons and small text; media captions; semantic download rows; populated scrolling gallery; valid media filtering; keyboard-accessible team and masonry cards; accordion focus movement/inert closed answers; native-dialog slideshow with focus return and Escape; form field/focus/status readability; timeline title/layout options wired through; quieter text-ribbon spacing and correct logo fades. Blanket initially-hidden block reveals removed so server-rendered content is visible immediately. Existing inner motion remains where appropriate.

Verification:
- Application-source TypeScript passed; `git diff --check` passed.
- 188 isolated Chromium layout/content cases passed: 32 block variants at 320, 390, 768, 1024, 1440px plus 28 long/missing-content cases. No document overflow, malformed links, duplicate IDs, broken images, or browser errors in those checks.
- Eight interaction cases passed: FAQ keyboard/inert state, team keyboard flip, slideshow navigation/dialog/Escape/focus return, scrolling-gallery keyboard navigation, accordion focus movement, download semantics, clipboard copying, and required-field validation followed by one mocked successful form submission.
- Desktop/mobile captures reviewed across all 32 variants; a final targeted correction batch resolved the full-width panel theme conflict and four small-text contrast misses. Final computed contrast check across 11 representative block surfaces reported no misses. Contrast sampling covers CSS foreground/background layers; it does not measure every photograph, authored rich-text color, or translucent decorative pixel.
- Source-only checking passed after final color corrections. Full-project TypeScript retains the two existing test errors in admin.e2e.spec.ts (missing seedUser) and memberPasswordReset.int.spec.ts (BasePayload mock).
- Repository ESLint configuration retains its circular-config crash. Installed Next native flat presets were used for a before/after comparison across the 36 changed TS/TSX/JSX files: zero new error files, errors reduced from 11 to 6. Remaining hook-rule errors predate this change; see lint-baseline.json. Design hook reported no deterministic issues on the new shared CSS; no duplicate manual detector run.

Evidence boundaries: the fixture uses real block components, shared Media/NextImage, rich text, Poppins, CSS, and interaction implementations. Next navigation and Payload queries are isolated local adapters with illustrative content. No production API, authenticated CMS saving/live preview, deployment, or full live-site integration was exercised. The local photograph is test-only; no new raster ships.

Temporary preview scripts, screenshots, and detailed JSON are retained outside the repository under `/private/tmp/triumph-block-polish-2026-10-21` after cleanup. The preview server was stopped.
