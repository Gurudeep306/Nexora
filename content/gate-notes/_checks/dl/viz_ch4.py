"""Check: every Chapter 4 (arithmetic circuits) viz file equals what _viz_ch4.py generates (so every select value,
residue, lit output and caption number was computed by arithlib), every scene is animated with a
caption on every step (the captions are the text alternative) and has a phone (narrow) canvas."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import _viz_ch4 as gen  # noqa: E402

specs = gen.build_all()
for name, s in specs.items():
    f = gen.VIZ_DIR / f"{name}.json"
    assert f.exists(), f"missing viz/{name}.json: run python3 {gen.__file__}"
    assert f.read_text() == gen.dump(s), f"viz/{name}.json is stale: run python3 content/gate-notes/_checks/dl/_viz_ch4.py"
    assert s["intro"].strip(), name
    assert s.get("narrow"), f"{name}: needs a narrow (phone) canvas"
    assert s["steps"], f"{name}: must be animated"
    for st in s["steps"]:
        assert st["caption"].strip(), name
print(f"viz_ch4: {len(specs)} scenes match the generator, all animated with captions and a phone layout")
