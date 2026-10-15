"""Outline the "NexoraGuru" wordmark from Geist (SIL OFL, already shipped via
@fontsource-variable/geist) into SVG path data, so the lockup SVGs need no font.

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
WEIGHT = 600
TRACK = -0.012  # em; a touch tighter than default for a display setting

font = instantiateVariableFont(TTFont(SRC), {'wght': WEIGHT})
font.flavor = None
buf = io.BytesIO()
font.save(buf)
font = TTFont(io.BytesIO(buf.getvalue()))
upm = font['head'].unitsPerEm
cmap = font.getBestCmap()
gs = font.getGlyphSet()
hmtx = font['hmtx']


def outline(text, x0):
    pen = SVGPathPen(gs)
    x = x0
    for ch in text:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))  # baseline at y=0, up is negative
        x += hmtx[g][0] + TRACK * upm
    return pen.getCommands(), x


nexora, x = outline('Nexora', 0)
guru, end = outline('Guru', x)
os2 = font['OS/2']
with open(os.path.join(HERE, 'wordmark-paths.json'), 'w') as f:
    json.dump({
        'font': 'Geist %d (SIL OFL 1.1)' % WEIGHT,
        'unitsPerEm': upm,
        'capHeight': os2.sCapHeight,
        'advance': end - TRACK * upm,
        'guruX': x,
        'nexora': nexora,
        'guru': guru,
    }, f)
print('ok', upm, os2.sCapHeight, end)
