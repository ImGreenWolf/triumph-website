# Stats and Form blocks in rich text

Stats and Form are available through the existing Lexical block menus in Content, Full Width, Posts, and Events. Their server renderer avoids nested page gutters and prose styles on controls. Saved form relationship IDs resolve with public read permissions; missing forms render no broken controls. Existing client form submission, recruitment, and draft behavior is preserved.

The Stats checkbox, “Show events list,” defaults on. Missing and null legacy values preserve the existing list. An explicit false value skips Payload initialization and the event query. Empty results render no event panel. Metrics use flex with growing items and natural wrapping, filling the available width instead of fixed grid columns. Media and form layout respond to the actual container width, including narrow rich-text columns.

## Verification

- Payload type generation passed; only the checkbox and its select type changed. Import-map generation passed with no new imports. Both commands printed the existing nonfatal mail.interact-triumph.org DNS verification warning.
- Eight targeted Vitest tests passed: seven streaming server-render cases plus the existing form submission idempotency test. Coverage includes serialized block order, no nested gutters, event-query suppression, legacy checkbox values, empty events, and populated, ID-only, and missing form relationships.
- 57 Chromium cases passed with no browser exceptions. Widths: 320, 390, 768, 1024, and 1440px. Contexts: standalone, rich text, 420px column, Content half columns, and Full Width. Events on/off, one/two/five metrics, required form validation, and a successful mocked submission were checked. No horizontal overflow; metrics fill their row; embedded forms adapt to the container; wide gallery and event panel heights match. A separate missing-checkbox browser assertion also passed.
- A bounded desktop/mobile screenshot review found no further finish defects. Existing card design, typography, gallery controls, and motion were preserved.
- Full TypeScript checking reports only two existing test issues: missing tests/helpers/seedUser in admin.e2e.spec.ts and an incomplete BasePayload mock in memberPasswordReset.int.spec.ts. Application source and the new test have no TypeScript diagnostics.
- Targeted lint reports only the two existing Form/Component.tsx hook errors (set-state-in-effect and refs), confirmed against the pre-change snapshot. New component and test files have no lint errors. The repository ESLint FlatCompat setup fails with the installed Next config; verification used Next's native flat configs with the repository's warning severities. Existing warnings remain.
- git diff --check passed. No content records, homepage insertion, migration, save, or publication were changed.

The browser preview rendered actual source components with isolated Next/Payload adapters. Real async rendering and query behavior were covered separately by streaming server tests. Authenticated CMS insertion/save, a full Next production build, physical devices, and other browser engines were not exercised.

The active design hook was used where available; CSS edit hints reached the session rate limit. No duplicate manual detector scan or ignore configuration was added. No new design finding was suppressed or left unresolved by this change. The previously reported gallery width-animation finding was already fixed with a scaleX transform, as recorded in ../gallery-progress/validation.md.

Temporary preview scripts, screenshots, lint output, and browser results are under /private/tmp/triumph-richtext-stats-2026-10-21. The preview server was stopped. Existing uncommitted work was preserved.
