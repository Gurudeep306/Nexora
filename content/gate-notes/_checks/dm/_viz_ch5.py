"""Viz scenes of Discrete Mathematics Chapter 5: merges the per-lesson generators _viz_ch5_lNN.py
(each a SPECS dict of scene builders' outputs) and writes content/gate-notes/dm/viz/<name>.json.

    python3 content/gate-notes/_checks/dm/_viz_ch5.py      # write
    python3 content/gate-notes/_checks/dm/viz_ch5.py       # check (files == generator)
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib  # noqa: E402

SPECS = dmlib.parts("_viz_ch5_l", "SPECS")

if __name__ == "__main__":
    dmlib.write_viz(SPECS)
