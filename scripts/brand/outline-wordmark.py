"""Outline the "NexoraGuru" wordmark from Geist (SIL OFL, already shipped via
@fontsource-variable/geist) into SVG path data, so the lockup SVGs need no font:
"Nexora" in Geist 400, "Guru" in Geist 500.

One-off:  python3 -m pip install fonttools brotli
          python3 scripts/brand/outline-wordmark.py
Writes scripts/brand/wordmark-paths.json, which build-brand.mjs reads.
"""
import io
import json
import os

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, 'client/node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2')
TRACK = -0.025  # em, matches the in-app wordmark (tracking-[-0.025em])


def instance(weight):
    font = instantiateVariableFont(TTFont(SRC), {'wght': weight})
    font.flavor = None
    buf = io.BytesIO()
    font.save(buf)
    return TTFont(io.BytesIO(buf.getvalue()))


def outline(font, text, x0):
    upm = font['head'].unitsPerEm
    cmap, gs, hmtx = font.getBestCmap(), font.getGlyphSet(), font['hmtx']
    pen = SVGPathPen(gs)
    x = x0
    for ch in text:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))  # baseline at y=0, up is negative
        x += hmtx[g][0] + TRACK * upm
    return pen.getCommands(), x


regular, medium = instance(400), instance(500)
upm = regular['head'].unitsPerEm
nexora, x = outline(regular, 'Nexora', 0)
guru, end = outline(medium, 'Guru', x)
with open(os.path.join(HERE, 'wordmark-paths.json'), 'w') as f:
    json.dump({
        'font': 'Geist 400 + 500 (SIL OFL 1.1)',
        'unitsPerEm': upm,
        'capHeight': regular['OS/2'].sCapHeight,
        'advance': end - TRACK * upm,
        'guruX': x,
        'nexora': nexora,
        'guru': guru,
    }, f)
print('ok', upm, end)
