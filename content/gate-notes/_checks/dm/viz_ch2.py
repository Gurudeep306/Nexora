"""Check: every Chapter 2 viz file equals its generator (_viz_ch2_lNN.py), every step has a caption,
and every element of every frame stays inside both the wide and the phone canvas."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib  # noqa: E402
from _viz_ch2 import SPECS  # noqa: E402

n = dmlib.check_viz(SPECS)
print(f"viz_ch2: {n} scenes match the generator ({sum(1 for s in SPECS.values() if s['steps'])} animated)")
