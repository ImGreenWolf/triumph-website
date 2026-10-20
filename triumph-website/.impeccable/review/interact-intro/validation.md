# Interact introduction validation

- New schema registered in Pages and RenderBlocks; generated InteractIntroBlock and selection types verified.
- `npm run generate:types` completed with exit 0. Existing Nodemailer transport verification emitted a mail DNS warning during config initialization.
- Application-source TypeScript check passed using the source-only config in this directory.
- Full TypeScript check still reports two unrelated test errors: missing tests/helpers/seedUser and the BasePayload mock in tests/int/memberPasswordReset.int.spec.ts.
- Repository ESLint config crashes with a circular-structure error before linting. Using the installed Next native flat presets, targeted lint completed with no errors. Five warnings are in pre-existing registration-file code; neither new block file has warnings.
- 36 isolated browser scenarios passed: widths 320, 390, 768, 1440; photo, no photo, unpopulated relationship, non-image, missing URL, empty alt, minimal optional fields, long content, repeated instances. Checks include effective visibility, overflow, image loading/alt, reading order, headings, captions, and duplicate IDs.
- Screenshots: desktop.png, mobile.png, small.png, tablet.png, no-photo.png, long-mobile.png, repeated-small.png. All opened and visually verified after correcting the fixture's missing data-theme attribute.
- Real CSS, local Poppins, actual block config/component, actual Media/NextImage used; photo served by isolated fixture from an existing local club image. The production block has no default photo.
- Text contrast minimum 7.56:1 against the site's teal base and darker background-dot shade.
- Impeccable detector run once on the new block targets; returned [].
- `git diff --check` passed. Prior uncommitted changes preserved.

Boundaries: no homepage content, publication, database, hero, or existing block edits. Authenticated Payload insertion/save/live preview and full-page animated-wrapper integration were not exercised. Screenshots show the block in an isolated wrapper using the incumbent my-16 spacing.
