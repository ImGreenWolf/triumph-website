The visible letters are the original filled outlines of Allura, designed by
Rob Leuschke (TypeSETit). Allura-Regular.ttf is bundled under the SIL Open Font
License; see OFL.txt.

Font source: https://github.com/google/fonts/tree/main/ofl/allura

The original font is unchanged. glyphs.json contains Allura's actual filled
contours, advances, and bounds. The renderer combines the complete word or
phrase into one SVG path and joins its contours into one continuous reveal
route. One stroke-dashoffset tween reveals the entire entry. Romanian accents
are part of the font's native contours.

To rebuild, install the development-only Python dependency with
`python3 -m pip install fonttools`, then run `python3 scripts/generate-hero-font.py`
from the application directory. Neither Python nor fonttools is needed at runtime.
