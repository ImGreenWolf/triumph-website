# Website improvements

Implemented the approved public-site and member-dashboard plan. Existing blocks remain available in Payload; published CMS content is preserved, with the editorial changes saved as drafts.

## CMS drafts

- **Home:** introduction → impact → one events section → joining → FAQ. The impact label is **Mandatul 2026–2027**, based on the confirmed current-mandate timeframe. Values were preserved.
- **Events section:** four existing highlighted events retain their order. Editors can select one published upcoming event; it disappears when its start time passes. It is excluded from the highlight grid while featured. The archive button always remains available. No eligible upcoming event is currently configured.
- **Header:** Despre club / Participă / Membri. Header and footer now support draft versions and preview reads.
- **Footer:** Romanian control and legal-link labels.
- **Istoria clubului / Familia Rotary:** longer homepage material was moved to reviewable detail-page drafts; existing detail-page material was retained.
- **FAQ:** the recruitment answer uses live schedule information instead of a hardcoded deadline; other answers remain editable.

Publish the information-page drafts before the header that links to them. Review the homepage, header, and footer drafts together. No deployment or CMS publication was performed.

## Behavior

- Public event statistics use server-side counts of non-cancelled registrations, labeled `înscrieri`. Counts for unpublished events are withheld; failed counts are omitted rather than shown as zero. Private registration records remain private.
- `/inscrie-te` stays on the application page instead of following the old waitlist redirect. The separate waitlist page is preserved. Recruitment dates use Bucharest day boundaries; the form fails closed while status is unknown or unavailable and supports retry. The server checks the same schedule before accepting applications.
- The menu uses a native button, Enter/Space, Escape with focus return, expanded-state announcements, and closing on navigation/outside interaction. Member access remains visible on mobile.
- Login, password recovery, form controls, theme selection, footer controls, and document language use Romanian. Member routes have page titles and noindex metadata. The events sitemap is advertised; Payload Twitter attribution was removed.
- Essential content and hero actions are immediately available. Removed blanket block blur reveals, animated impact counters, and footer text blur. Hero handwriting and reduced-motion support remain.
- The next meeting is first in the dashboard, with check-in offered during its existing valid window. Existing announcements and role-specific actions remain. Streamed meeting text reserves its space. Attendance, dues, permissions, and independent loading remain intact.
- Draft preview now checks the authenticated user inside the authentication result and rejects off-site redirects.

## Validation

- **78 focused Vitest checks passed**, covering schedule boundaries including DST, counts and public access, form availability/idempotency, events selection/migration, preview access, handwriting, attendance, dues, and streaming.
- **57 browser checks passed:** 28 dashboard fixture checks, 20 hero checks, and 9 public-site/event-section checks. Event layouts were checked at 320, 390, 768, and 1440 pixels, including keyboard interaction, reduced motion, absent upcoming events, duplicates, and empty selections.
- Real anonymous pages verified: Romanian login/title, archive registration counts, and the closed application page without a submit action.
- CMS Local API saves and read-back verified the drafts and preserved published homepage/navigation content. Generated Payload types and import map are current.
- An isolated Next production build passed, including compilation, Next type checking, static page generation, and build traces. It ran in `/tmp` without disturbing the development server.
- Standalone repository `tsc` still reports its two pre-existing test errors: missing `tests/helpers/seedUser` and the incomplete Payload mock in `memberPasswordReset.int.spec.ts`.
- The repository ESLint launcher still fails on its pre-existing FlatCompat circular-config error. Direct Next flat-config linting of the new modules and navigation passed with zero warnings/errors. Older touched components still have existing React lint findings.
- The Impeccable detector found no issues in changed TSX targets. Screenshots in this folder are review artifacts; the upcoming-event screenshots use a clearly labeled synthetic test scenario. No new raster assets ship with the product.

Live authenticated member and CMS browser-preview verification remains pending. Automatic approval review rejected the proposed extraction of existing session data and secrets to mint review tokens; no such tokens were created. Member role/loading behavior was verified with isolated fixtures instead.

## Repeatable commands

From `triumph-website/`:

```sh
# Read-only preparation is the default. Explicitly saves drafts, never publishes.
node --import tsx scripts/prepare-site-improvements.ts --save-drafts --reporting-period 'Mandatul 2026–2027'
node --import tsx scripts/export-site-improvements-preview.ts
node node_modules/@playwright/test/cli.js test --config=playwright.site-improvements.config.ts
node node_modules/@playwright/test/cli.js test --config=playwright.dashboard.config.ts
node node_modules/@playwright/test/cli.js test --config=playwright.hero.config.ts
```

The browser suite uses a self-contained event fixture; the final test also requires the real app on localhost:3000. Local fixture servers are managed and stopped by Playwright.

## Events-section integration follow-up

The public homepage now adapts its legacy event gallery into the consolidated section in code; it no longer requires publishing the wider homepage draft to show this section. The existing gallery artwork, custom labels, links, order, and intro are preserved. Highlights appear first, followed by a featured upcoming event and the archive button. The former embedded event list is suppressed on the homepage only. Other page content is unchanged by this adapter.

A CMS-selected future event takes priority; otherwise the next published future event is featured automatically. Past and unpublished events cannot fill that slot. When no future event exists, the gallery and archive button remain. Publishing, unpublishing, or deleting an event invalidates the homepage and event archive.

The homepage draft was updated with all four original artwork overrides and the gallery presentation. `scripts/prepare-homepage-events.ts --save-draft` repeats this event-only preparation while preserving other draft edits. Stored published CMS records remain unchanged.

Follow-up validation: 11 focused event-selection/integration/freshness tests and 11 browser checks, including the real homepage at 390 and 1440 pixels. All four preserved public image URLs were confirmed loaded; the first image endpoint returned HTTP 200. Standalone tsc retains only the two previously documented test errors. The earlier production build predates this follow-up; no new full production build was run for it.
