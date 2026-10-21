# Gallery progress-bar hook finding

Triaged the reported `layout-transition` at Gallery/component.tsx:176 as a real animation-performance issue. Replaced the animated width with a fixed full-width bar and a left-origin scaleX transform. Timing and slide-position values remain the same. Reduced motion disables the transition.

Fixed: the reported layout-property animation. Suppressed: none. Left standing: none of the reported findings. No Impeccable ignore configuration was changed.

Four isolated Chromium cases passed at 320 and 1440px with normal/reduced motion. Frame samples confirmed changing transforms with constant offsetWidth and parent dimensions; reduced motion used transition-property:none. No browser exceptions. Desktop/mobile captures were reviewed once. Application-source TypeScript, targeted lint (three existing any warnings, zero errors), and git diff whitespace checks passed. The active design hook reported no deterministic issue on the edit; no extra manual scan was run.

Only the progress-bar class and two style declarations changed. Existing gallery behavior and other ongoing work were preserved. Preview timing was shortened in the fixture only. Full Next build, physical devices, other browser engines, and authenticated CMS were not exercised.

Temporary preview artifacts are under `/private/tmp/triumph-gallery-progress-2026-10-21`; the preview server was stopped.
