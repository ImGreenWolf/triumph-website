# Stats block and text-loop spacing

## Compact spacing follow-up

The latest request tightens the Stats and Events blocks. Stats card padding and internal label/description spacing are smaller, metric gaps are 16px on mobile and 20px from sm upward, and the gallery/event row is separated by 16px (24px above sm). Outer margins for these two block types now use 40/48/64px instead of 64/80/96px. Existing text-loop adjacency rules continue to apply.

The embedded event list now uses divided, fully clickable rows instead of nested cards with separate action links. Each live row measures 80–81px while preserving imagery, titles, participants, donation information when present, and destination URLs. The panel keeps its bounded scrolling and the desktop gallery-height relationship. EventsBlock intro spacing and small event-collection grid gaps were also reduced. New styling uses Tailwind utilities; the existing shared stylesheet was not edited.

Current live-site Chromium checks passed at 320, 390, 768, and 1440px: all five event destinations remain present, final-row keyboard focus and list scrolling work, desktop panel/gallery dimensions match, and there is no horizontal overflow or browser exception. Desktop/mobile captures were inspected together. Source TypeScript and focused lint passed (one existing RenderBlocks any warning); whitespace checks passed. Temporary evidence: /private/tmp/triumph-compact-stats. No CMS content/schema/save or production build was changed or exercised.

## Earlier validation

The stats metrics now use their own responsive grid with 48px column gaps, more top padding and separation before the gallery/event row. Figure rows reserve room for intact unit labels at multi-column sizes so supporting labels align. Unit text stays on one line and moves as a whole below the number when the pair needs more room.

CountUp reserves both formatted endpoints using invisible sizing text. The animated value is positioned over that stable slot, with tabular numbers and one static accessible value. Counting therefore changes only the displayed digits. The existing reduced-motion behavior remains.

The gallery and event panel share a separate responsive row. At desktop sizes the gallery determines the row height and the event panel fills it; its list scrolls internally, remains keyboard reachable, and retains all five event links. At smaller widths the panels stack and the event panel uses a bounded scroll region. Invalid gallery relationships do not create an empty photo column.

Text-loop wrappers have no vertical margin. Adjacent block margins are removed only where they touch a text loop. The SVG viewBox fits the built-in path's actual vertical extent, ribbon stroke, and text rather than retaining the unused 520-unit canvas. Custom paths keep their prior viewBox. Pause controls remain accessible.

Validation:
- 37 Chromium cases passed at 320, 390, 768, 1024, and 1440px: four/two stats, long units and six-digit values, missing galleries, absent events, repeated instances, and neighboring text-loop blocks.
- Desktop gallery/event panel tops and heights match within one pixel. For example, both are 347.98px high at 1024px and 479.98px at 1440px in the fixture.
- Two 2.4-second normal-motion recordings at 320 and 1440px captured 145 frames each. Values changed while unit position/size, supporting-label position, and media-row position did not move.
- Units remained single-line and the tested document widths had no horizontal overflow or browser exceptions.
- Neighboring-block gaps and unused ribbon stroke padding measured zero at all five widths.
- Keyboard event-list scrolling and gallery dialog/Escape paths passed. A focused confirmation checked multi-column label alignment, fitted ribbon bounds, live ribbon playback, and keyboard pause. Desktop/mobile captures were reviewed, followed by one finish batch and one confirmation round.
- Application-source TypeScript, targeted lint with the existing native Next flat configuration, and git diff whitespace checks passed. Existing any-type warnings remain. No schema changes required type generation.
- The active Impeccable hook found no deterministic issues on the edited block source it scanned; no duplicate manual detector run was added.

This uses the existing isolated preview with actual block, gallery, Media/NextImage, counter, ribbon, CSS, and Poppins components plus illustrative content and Payload/navigation adapters. No authenticated CMS save/live preview, production-data changes, full Next build, or non-Chromium testing was performed. Prior uncommitted work is preserved.

Detailed scripts, screenshots, frame samples, and results are under `/private/tmp/triumph-stats-spacing-2026-10-21`; the pre-pass source snapshot is under `/private/tmp/triumph-stats-spacing-baseline-2026-10-21`. The preview server was stopped after verification.
