"""Check: every Chapter 1 viz file equals what _viz_ch1.py generates (so every number in a
caption was computed by numlib), and every animated scene has captions for each step."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import _viz_ch1 as gen  # noqa: E402

specs = gen.build_all()
for name, s in specs.items():
    f = gen.VIZ_DIR / f"{name}.json"
    assert f.exists(), f"missing viz/{name}.json: run python3 {gen.__file__}"
    assert f.read_text() == gen.dump(s), f"viz/{name}.json is stale: run python3 content/gate-notes/_checks/dl/_viz_ch1.py"
    assert s["intro"].strip(), name
    for st in s["steps"]:
        assert st["caption"].strip(), name
print(f"viz_ch1: {len(specs)} scenes match the generator ({sum(1 for s in specs.values() if s['steps'])} animated)")
