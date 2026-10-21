"""Viz base for Digital Logic Chapter 7 (Beyond the core syllabus): the Chapter 6 drawing helpers
(`_viz_ch6_base`: waveforms, state graphs, flip-flop blocks, the two-layout S class, merge and the
shared geometry check) with a registry of its own, so Chapter 7 scenes never mix with Chapter 6's."""
import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _viz_ch6_base import (S, VIZ_DIR, check_layout, ff_block, graph, light_edge, lv, merge, reveal,  # noqa: E402,F401
                           self_loop, tv, vtext, waveform, wire_pts)

SPECS = {}


def scene(fn):
    name = fn.__name__.replace("_", "-")

    def build():
        s = merge(fn("wide"), fn("narrow"))
        if not os.environ.get("VIZ_PREVIEW"):
            check_layout(name, s)
        return s

    assert name not in SPECS, name
    SPECS[name] = build
    return fn
