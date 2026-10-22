"""Update the Chapter 7 entry of content/gate-notes/_progress.json.

    python3 content/gate-notes/_checks/dl/_progress_ch7.py <slug>=<status> ... [status=<chapter status>] [review=<text>]
"""
import json
import pathlib
import sys

P = pathlib.Path(__file__).resolve().parents[2] / "_progress.json"
d = json.loads(P.read_text())
ch = next(c for c in d["subjects"]["dl"]["chapters"] if c["id"] == "07-beyond-syllabus")
ch.setdefault("lessons_status", {})
ch["live_lab"] = "Converter Bench (:::lab converter-bench: sar, dac)"
for arg in sys.argv[1:]:
    k, v = arg.split("=", 1)
    if k == "status":
        ch["status"] = v
    elif k == "review":
        ch["review"] = v
    else:
        ch["lessons_status"][k] = v
P.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
print(json.dumps(ch, indent=1, ensure_ascii=False))
