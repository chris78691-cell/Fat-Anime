# The Sukajan DEMO maps $, digits, etc. to EMPTY glyphs, which blocks the
# browser's per-glyph fallback (it thinks the font has them). Strip those
# empty mappings so those characters fall back to a clean font, while the
# real brush letters stay. Whitespace is kept.
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen

KEEP = {0x20, 0xA0, 0x09, 0x0D, 0x0A}  # whitespace: keep mapped

f = TTFont(r"assets/fonts/sukajan-brush.otf")
gs = f.getGlyphSet()

empty = set()
for name in f.getGlyphOrder():
    pen = BoundsPen(gs)
    try:
        gs[name].draw(pen)
    except Exception:
        pass
    if pen.bounds is None:
        empty.add(name)

removed = []
for table in f["cmap"].tables:
    for code in list(table.cmap.keys()):
        if code in KEEP:
            continue
        if table.cmap[code] in empty:
            removed.append(code)
            del table.cmap[code]

f.save(r"assets/fonts/sukajan-brush.otf")
codes = sorted(set(removed))
print("removed", len(codes), "empty mappings")
print("sample:", " ".join(chr(c) if 33 <= c < 127 else hex(c) for c in codes[:40]))
