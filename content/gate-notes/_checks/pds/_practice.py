"""Put one lesson's practice questions into its chapter's practice.json (the only source of truth):
python3 content/gate-notes/_checks/pds/_practice.py <questions.json>"""
import json
import pathlib
import sys

import chapterlib as L

L.put_practice(json.loads(pathlib.Path(sys.argv[1]).read_text()))
