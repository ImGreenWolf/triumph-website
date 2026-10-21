# Bolder public CMS blocks

Amplifies the existing teal/gold/Poppins identity within the public block set. No new palette, font, radius, shadow system, effects, claims, content fields, dependencies, or CMS data changes. Previous polish changes remain intact.

The decisive moves are larger editorial headings, full gold CTA fields, a gold contact introduction, open ruled metrics, a stronger first feature, larger process markers and quotes, more photographic area, larger partner marks, open download rows, and clear gold form headings/actions. Banners and code remain supporting material. The already expressive text ribbon keeps its existing treatment. Body text and secondary controls retain a quieter hierarchy.

Type-specific wrapper classes scope the amplification to CMS blocks. Shared Card, EventCard, and TimelineComponent sources were compared byte-for-byte with the pre-pass snapshot and preserved; their larger headings are applied through scoped selectors. Header, footer, hero system, member pages, schemas, page order, and publication were not changed by this pass.

Verification:
- 188 Chromium layout/content scenarios passed: 32 variants at 320, 390, 768, 1024, and 1440px, plus 28 long/missing-content cases. No document overflow, broken images, malformed links, duplicate IDs, or browser exceptions in this fixture matrix.
- Eight interaction checks passed, including keyboard FAQ/team cards/galleries, native lightbox Escape and focus return, download semantics, clipboard copy, required form validation and a mocked successful submission.
- CSS text/background contrast measured across 11 representative block surfaces: no misses. Sampling does not certify arbitrary CMS-authored colors or every image/decorative pixel.
- Desktop and mobile captures for all 32 variants were reviewed. One targeted finish batch added heading/body spacing; representative sections were recaptured at both widths and opened. A combined 28-block page also had no overlap or horizontal overflow at 390 and 1440px.
- Application-source TypeScript and git diff whitespace checks passed. Lint comparison against this turn's source snapshot across 29 TSX files found no new error files; existing project configuration and hook-rule issues were preserved. The existing full-project test TypeScript failures remain outside this visual change.
- Design hook reported no deterministic issues on the wrapper edit; no duplicate manual detector pass.

The fixture uses real block markup, Media/NextImage, rich text, local Poppins, CSS, and interactive components, with isolated Next navigation/Payload-query adapters and illustrative content. No production form submission, authenticated CMS save/live preview, deployment, or full Next production build was exercised. No new raster ships.

Temporary scripts, screenshots, and detailed results are retained under `/private/tmp/triumph-block-bolder-2026-10-21`; the local preview server was stopped. Pre-pass source evidence is separately retained in `/private/tmp/triumph-block-bolder-baseline-2026-10-21`.
