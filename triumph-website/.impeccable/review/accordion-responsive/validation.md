# Automatic accordion-gallery orientation

The public Payload accordion gallery now chooses its orientation automatically: vertical below 48rem (768px with the standard browser font), horizontal at and above it. CSS controls the initial layout; GSAP reads the computed flex direction so sizing, photo positioning, and animation use the same axis. Resize measurements update without replacing the component or resetting selection/focus, including inside fixed-width parents. Obsolete rotation on the previous axis is cleared.

Compact galleries have a defined expandable height and at least 44px panel targets, with additional height for longer item sets. Photos cover both dimensions, including single-photo galleries. Empty item sets do not render an empty gallery frame. Reduced-motion changes and resize updates finish without the interaction stagger. Ordinary panel selection retains its animation.

The CMS block always requests automatic orientation. The legacy misspelled `oreintation` field remains stored for compatibility and is hidden from editors; existing records require no migration or resaving. Only admin visibility changed, so generated field types did not change. No page records, published content, or other ongoing page edits were modified.

Validation:
- 39 Chromium checks passed with no browser exceptions. Sizes included 320, 390, 520, 639, 640, 767, 768, 1024, and 1440px in normal and reduced-motion modes.
- Checked active-panel expansion, media coverage, horizontal overflow, live breakpoint crossing, preserved selection/focus, rotation and image-axis reset, fixed-width parent resizing, keyboard arrows, and touch selection.
- Covered legacy horizontal/vertical CMS values, one/nine images, hidden labels, repeated instances with independent selection, and missing images. A static-markup/no-JavaScript check confirmed CSS still switches orientation.
- Desktop and mobile captures were reviewed together, followed by one finish batch for instant reduced-motion/resize state and one confirmation round.
- Application-source TypeScript, targeted lint with the existing native Next flat configuration, and git diff whitespace checks passed. The pre-existing raw-image lint warning remains.
- The active Impeccable hook reported no deterministic issues in the edited block, CSS, and client component it scanned. No duplicate manual detector scan was added.

The final preview renders the actual AccordionGallery Payload component, actual client gallery/GSAP/CSS, rich text, local Poppins, and illustrative local photographs. It isolates the accordion from concurrent renderer edits. Next navigation and server rich-text boundaries are adapted for the fixture. This was browser/device emulation, not physical-device or cross-engine testing. Full Next production build and authenticated CMS save/live preview were not exercised.

Temporary scripts, screenshots, and results are under `/private/tmp/triumph-accordion-responsive-2026-10-21`; pre-pass source evidence is under `/private/tmp/triumph-accordion-responsive-baseline-2026-10-21`. The local preview was stopped after verification.
