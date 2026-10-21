# Footer

Scope: public/shared frontend footer; Persuade and wayfinding. Code-first local redesign within the existing site identity. Preserve CMS-authored description, navigation, socials, wordmark, legal links, copyright, and theme selection. No schema or content migration.

## Direction contract

THESIS: A calm close to the page, revealed as the page scrolls away from it. The scroll itself controls the reveal.

OWN-WORLD: Existing Poppins, deep teal sidebar ground, light text, gold interaction accents, thin rules, and the actual club logo.

STORY: Recognize the club, find a destination or social channel, read legal information, or return to the top.

FIRST VIEWPORT: On desktop, compact logo/description/socials on the left and ruled navigation with a return-to-top control on the right. A solid, fluid wordmark anchors the lower portion. Copyright, legal links, and theme selection form the last row. Mobile stacks in reading order with 44px controls.

FORM: Scoped extension; no concept seed or global identity change. All footer styling uses Tailwind; there is no footer stylesheet. A native sticky footer sits behind the opaque page/header layer. A document-flow marker drives a 16px-to-zero blur with the existing Motion library. Wheel or upward touch gestures at the document bottom pull the contents into a resisted vertical stretch capped below 8%, followed by a damped spring return. The page does not gain extra scroll distance. Reduced motion and keyboard focus disable blur/stretch; viewport-tall footers retain normal flow for reachability. No new dependency.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

No DESIGN.md existed; this local change preserves the incumbent system and does not establish a new global identity. No new shipping raster assets.
