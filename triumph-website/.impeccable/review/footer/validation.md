# Footer validation — 2026-10-21

## Current Tailwind, sticky, and elastic implementation

Supersedes the positioning/blur implementation described in the older sections below. Footer styling now lives in Tailwind classes, and footer.css is removed. The existing Motion package handles a 16px-to-zero blur and bounded spring stretch. Native sticky positioning leaves movement synchronized with browser scrolling; an opaque page/header wrapper covers the footer until it is revealed. Tailwind overscroll-y-none on the document suppresses the browser's own viewport bounce so it does not double the custom stretch.

Eight cases passed in Chromium: 1440×1000, 768×1024, 390×844, and 320×568 with normal/reduced motion. Checks covered native sticky positioning where the footer fits, page occlusion, 16px initial blur, clear text at the bottom, no horizontal overflow, visible focused links, wheel-induced stretch under the 8% cap, spring release, unchanged document scroll height, and reduced-motion behavior. The last case passed separately after a transient local navigation timeout. Temporary scripts: /private/tmp/triumph-footer-review/sticky.cjs and sticky-last.cjs.

Emulated touch input at 390×844 produced a vertical scale of 1.02301, returning to 1 on release. A separate away-from-bottom gesture check confirmed no stretch during ordinary scrolling. Script: /private/tmp/triumph-footer-review/touch.cjs. Desktop, mobile, and narrow captures were reviewed together. Source TypeScript and formatting passed. Focused lint passed with three existing unused-variable warnings in layout.tsx. The active design hook reported no deterministic issue. No extra manual detector was run.

Footer taller than the viewport: normal flow preserves access to the entire footer; bottom-edge stretch still works. Real iOS/Safari rubber-banding, authenticated member workflows, CMS saving, and production build remain unverified.

The running Next site at localhost:3000 was verified in Chromium at 1440×1000, 768×1024, 390×844, 320×568, and 844×390, each with normal and reduced motion. All 10 cases passed. Screenshots in this directory capture the footer at the document end; small/landscape captures show its naturally scrollable lower portion. `reveal.png` shows partial occlusion.

The checks measured panel alignment to the viewport bottom during reveal and after another 50px scroll, zero transform at the document end, normal-flow reduced-motion and tall-footer fallbacks, focused-link visibility, minimum 44px targets, preservation of current CMS social/navigation links, functioning back-to-top, no horizontal overflow, and no browser exceptions. Raw measurements are in results.json. Temporary reproducible browser script: /private/tmp/triumph-footer-review/check.cjs.

Application-source TypeScript passed using the existing source-only review configuration. Focused ESLint passed using the existing native Next flat configuration. Prettier and git diff --check passed. The repository-wide TypeScript check retains two unrelated test errors: missing tests/helpers/seedUser and the incomplete BasePayload mock in memberPasswordReset.int.spec.ts. The default ESLint configuration fails with its existing circular-structure error. The active design hook reported no deterministic finding; no redundant manual detector pass was run.

CMS schema, saved data, and publication were not changed. CMS editing/save, production build, physical devices, and browser engines other than Chromium were not exercised.

## Fast-scroll and blur correction

Replaced the scroll/rAF transform loop with a viewport-fixed CSS panel clipped to a measured footer region. A Chromium run with 6× CPU throttling and rapid wheel deltas measured a maximum 600px panel-bottom mismatch at scroll-event sampling before the old rAF update. The same nine sampled positions measured 0px mismatch after the change. These are geometry samples, not a device-wide frame-rate benchmark. Temporary comparison script: /private/tmp/triumph-footer-review/performance.cjs.

All 10 viewport/motion cases passed again against the current CMS content. At 390px the current footer is taller than the reveal threshold and correctly scrolls normally. Desktop and mobile blur checks measured about 2.4px at 10% entry, 1.36px at 30%, and 0px by full entry. The blur remained constant while scrolling was paused, proving its native timeline follows scroll progress. Keyboard focus and reduced motion removed blur. `blur-results.json` records these samples. The CSS uses entry 0–55% on the footer view timeline; unsupported browsers have an intersection-triggered 320ms fallback, which was code-reviewed but not tested in an unsupported engine.

Source TypeScript, focused ESLint, formatting, and whitespace checks passed. One mechanical detector pass returned no findings. Desktop/mobile partial-blur and clear captures were inspected together; no layout changes were needed. Existing preceding-block entrance blur appears in the early partial capture and is outside this change.
