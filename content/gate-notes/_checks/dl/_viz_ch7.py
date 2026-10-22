"""Generator for the Viz scenes of Digital Logic Chapter 7 (Beyond the core syllabus).

Every value a scene shows or captions (gate outputs gate delay by gate delay, waveforms, sampled
values, violations, state sequences, transient states, state graphs, detector paths, partitions)
is computed with seqlib (and asserted against an independent expectation where cheap), so the
scenes cannot drift from the checked maths. The scenes live in one module per lesson
(`_viz_ch7_l01.py` … `_viz_ch7_l03.py`) and register themselves through `_viz_ch7_base.scene`;
the shared drawing helpers (waveforms, state graphs, flip-flop blocks) and the two-layout merge and
geometry self-check are described in `_viz_ch6_base.py`.

    python3 content/gate-notes/_checks/dl/_viz_ch7.py [scene …]   # write the JSON files
    python3 content/gate-notes/_checks/dl/viz_ch7.py              # (check) files == generator output
"""
import importlib
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _viz_ch7_base import SPECS, VIZ_DIR  # noqa: E402

LESSON_SCENES = {
    1: ["chip-array-expansion"],
    2: ["sar-binary-search", "r2r-ladder-currents"],
    3: ["cmos-inverter-switch", "pass-transistor-paths"],
}
for k in LESSON_SCENES:
    if (pathlib.Path(__file__).parent / f"_viz_ch7_l{k:02d}.py").exists():
        importlib.import_module(f"_viz_ch7_l{k:02d}")

ORDER = [n for k in sorted(LESSON_SCENES) for n in LESSON_SCENES[k] if n in SPECS]


def build_all():
    extra = sorted(set(SPECS) - set(ORDER))
    assert not extra, f"scenes not listed in LESSON_SCENES: {extra}"
    return {name: SPECS[name]() for name in ORDER}


def dump(s):
    return json.dumps(s, ensure_ascii=False, indent=1) + "\n"


if __name__ == "__main__":
    only = sys.argv[1:]
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for name in ORDER:
        if only and name not in only:
            continue
        sp = SPECS[name]()
        (VIZ_DIR / f"{name}.json").write_text(dump(sp))
        print(f"wrote viz/{name}.json ({len(sp['steps'])} steps)")
