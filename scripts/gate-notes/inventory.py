#!/usr/bin/env python3
"""Inventory of the reference notes in GATE_NOTES/ (step N0).

Each subject is one merged PDF holding several independent note sets, marked
by top-level "Set N: ..." bookmarks. This reads the bookmarks only (no OCR),
labels the sets A, B, C... (author names are never recorded), and writes:

  content/gate-notes/_inventory.md   the table for review
  content/gate-notes/_inventory.json the same data for later stages

With --sheets DIR it also renders one contact sheet per subject (two sample
pages per set) for judging scan quality. Sheets are never committed.

    python3 scripts/gate-notes/inventory.py --notes /path/to/GATE_NOTES [--sheets DIR]
"""
import argparse
import json
import os
import re
import subprocess
import tempfile

import pypdf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# PDF file name -> subject key used by src/gate/questions.json.
SUBJECTS = {
    "Algorithms": "algo",
    "COA": "coa",
    "Calculus": "calc",
    "Compiler_Design": "cd",
    "Computer_Networks": "cn",
    "DBMS": "db",
    "Digital_Logic": "dl",
    "Discrete_Mathematics": "dm",
    "Linear_Algebra": "la",
    "Operating_Systems": "os",
    "Probability_Statistics": "prob",
    "Programming_Data_Structures": "pds",
    "TOC": "toc",
}
SET_RE = re.compile(r"^\s*Set\s+(\d+)\b", re.I)


def outline(reader):
    """Flatten bookmarks to (depth, title, 1-based page)."""
    out = []

    def walk(items, depth):
        for it in items:
            if isinstance(it, list):
                walk(it, depth + 1)
            else:
                out.append((depth, it.title.strip(), reader.get_destination_page_number(it) + 1))

    walk(reader.outline, 0)
    return out


def subject_of(name):
    for k, v in SUBJECTS.items():
        if f"_{k}_" in name:
            return v, k.replace("_", " ")
    return None, name


def parse(path):
    reader = pypdf.PdfReader(path)
    pages = len(reader.pages)
    marks = outline(reader)
    sets = []
    for i, (depth, title, page) in enumerate(marks):
        m = SET_RE.match(title)
        if depth == 0 and m:
            sets.append({"label": chr(ord("A") + len(sets)), "start": page, "topics": [], "_i": i})
    for n, s in enumerate(sets):
        nxt = sets[n + 1]["start"] if n + 1 < len(sets) else pages + 1
        s["end"] = nxt - 1
        s["pages"] = s["end"] - s["start"] + 1
        stop = sets[n + 1]["_i"] if n + 1 < len(sets) else len(marks)
        topics = [(d, t, p) for d, t, p in marks[s["_i"] + 1 : stop] if d >= 1]
        # Ranges per topic: until the next topic at the same or a shallower depth.
        for j, (d, t, p) in enumerate(topics):
            end = s["end"]
            for d2, _, p2 in topics[j + 1 :]:
                if d2 <= d:
                    end = max(p, p2 - 1)
                    break
            s["topics"].append({"depth": d, "title": t, "start": p, "end": end})
        del s["_i"]
    return pages, sets


def render(path, page, dpi, out):
    subprocess.run(["pdftoppm", "-r", str(dpi), "-png", "-f", str(page), "-l", str(page), "-singlefile", path, out], check=True)
    return out + ".png"


def contact_sheet(path, sets, dest):
    from PIL import Image, ImageDraw

    tiles = []
    with tempfile.TemporaryDirectory() as tmp:
        for s in sets:
            # A page a little into the set and one from its middle (skips title pages).
            picks = sorted({min(s["end"], s["start"] + 3), (s["start"] + s["end"]) // 2})
            for p in picks:
                img = Image.open(render(path, p, 60, os.path.join(tmp, f"{s['label']}{p}"))).convert("RGB")
                img.thumbnail((420, 560))
                canvas = Image.new("RGB", (420, 590), "white")
                canvas.paste(img, (0, 30))
                ImageDraw.Draw(canvas).text((8, 8), f"Set {s['label']}  p{p}", fill="black")
                tiles.append(canvas)
    cols = 4
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 420, rows * 590), "#ddd")
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * 420, (i // cols) * 590))
    sheet.save(dest)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--notes", default=os.path.join(ROOT, "GATE_NOTES"))
    ap.add_argument("--sheets")
    args = ap.parse_args()

    inv = []
    for name in sorted(os.listdir(args.notes)):
        if not name.lower().endswith(".pdf"):
            continue
        key, label = subject_of(name)
        path = os.path.join(args.notes, name)
        pages, sets = parse(path)
        inv.append({"file": name, "subject": key, "subjectName": label, "pages": pages, "sets": sets})
        if args.sheets:
            os.makedirs(args.sheets, exist_ok=True)
            contact_sheet(path, sets, os.path.join(args.sheets, f"{key}.png"))

    out_dir = os.path.join(ROOT, "content", "gate-notes")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "_inventory.json"), "w") as f:
        json.dump(inv, f, indent=2)
        f.write("\n")
    print(json.dumps([[s["subject"], s["pages"], len(s["sets"])] for s in inv]))


if __name__ == "__main__":
    main()
