# Page-top navigation and independent block entrances

Request: changing pages must arrive at the top without a smooth climb from the bottom; animate each block independently as it enters the viewport.

Implemented:
- Root scroll behavior is native/instant; the back-to-top button still explicitly requests smooth scrolling.
- Non-anchor page changes reset the window to zero in a layout effect, before blinds reopen. Intercepted links disable Next's competing automatic reset. Explicit cross-page anchors keep their destination.
- Browser history uses manual scroll restoration while the frontend motion controller is mounted, so returning to a page also starts at its top.
- Every CMS block has an explicit `data-scroll-block` marker. Each block, including tall blocks, forms and blocks with existing animation, gets its own once-per-visit observer. Surrounding sections do not duplicate their children's entrances.
- Offscreen blocks become transparent only after observer/focus recovery is installed. Standard blocks fade and settle from 24px; compact media uses a mask; looping/team/scroll-oriented blocks fade without changing their coordinate system. Focus immediately restores a block, including before it has entered.
- A reactive media-query subscription handles reduced-motion changes at runtime; the installed Motion preference hook only snapshots its initial value. Preference changes restore all waiting blocks and bypass route effects.

Validation: 30 regression checks passed in the full run. The remaining synthetic block-reveal check initially had an unreliable below-fold setup; after waiting for page enhancement and giving its injected content an explicit offscreen margin, it passed twice. All 31 distinct browser scenarios are validated across the run and focused followup. No application code changed after the independent reviewer returned `disposition: ship` with no material fixes. Direct ESLint clean. TypeScript retains only the two known unrelated test errors. No schema, CMS content, dependency or deployment changes.

Captures: desktop/mobile homepage at document top; `*-block.png` shows the settled selected-events block after its independent reveal; `*-arrival.png` shows the events page after navigation from the footer. Both captured arrivals had scrollY=0, selected-events opacity moved from0 to1, and no runtime errors were recorded. Hero handwriting/video remains its existing loop.

Final documentation: `documentation.md`; current rules also recorded in the root site-motion surface brief. No production build or deployment performed.
