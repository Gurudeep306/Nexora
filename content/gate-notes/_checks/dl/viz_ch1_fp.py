"""Check: every floating-point viz file (lessons 5–7) equals what _viz_ch1_fp.py generates (so every
number in a caption was computed by fplib), every scene has a narrow (phone) canvas, and every
animated scene has a caption for each step."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import _viz_ch1_fp as gen  # noqa: E402

specs = gen.build_all()
for name, s in specs.items():
    f = gen.VIZ_DIR / f"{name}.json"
    assert f.exists(), f"missing viz/{name}.json: run python3 {gen.__file__}"
    assert f.read_text() == gen.dump(s), f"viz/{name}.json is stale: run python3 content/gate-notes/_checks/dl/_viz_ch1_fp.py"
    assert s["intro"].strip(), name
    assert s.get("narrow") and s["narrow"]["width"] <= 400, f"{name}: needs a phone-width narrow canvas"
    for st in s["steps"]:
        assert st["caption"].strip(), name
print(f"viz_ch1_fp: {len(specs)} scenes match the generator ({sum(1 for s in specs.values() if s['steps'])} animated, all with a narrow layout)")
