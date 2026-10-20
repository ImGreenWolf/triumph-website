"""Build native Allura contours for whole-phrase SVG paths. Requires fonttools."""

import json
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

folder = Path(__file__).resolve().parents[1] / "src/heros/VideoHero/font"
font = TTFont(folder / "Allura-Regular.ttf")
glyph_set = font.getGlyphSet()
cmap = font.getBestCmap()
characters = set(range(32, 127)) | set(range(160, 256)) | {ord(c) for c in "ŒœŠšŸŽž€ăĂșȘțȚşŞţŢ"}
glyphs = {}

for codepoint in sorted(characters & cmap.keys()):
    glyph = glyph_set[cmap[codepoint]]
    path = SVGPathPen(glyph_set, ntos=lambda n: f"{n:.3f}".rstrip("0").rstrip("."))
    bounds = BoundsPen(glyph_set)
    glyph.draw(path)
    glyph.draw(bounds)
    glyphs[chr(codepoint)] = {
        "advance": glyph.width,
        "outline": path.getCommands(),
        "bounds": [round(n, 3) for n in (bounds.bounds or (0, 0, 0, 0))],
    }

(folder / "glyphs.json").write_text(
    json.dumps(glyphs, ensure_ascii=False, separators=(",", ":")) + "\n"
)
print(f"Generated {len(glyphs)} native Allura glyphs for whole-phrase composition")
