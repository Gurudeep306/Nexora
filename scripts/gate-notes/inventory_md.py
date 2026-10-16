#!/usr/bin/env python3
"""Render content/gate-notes/_inventory.md from _inventory.json + _quality.json.

    python3 scripts/gate-notes/inventory_md.py
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DIR = os.path.join(ROOT, "content", "gate-notes")

NAMES = {
    "algo": "Algorithms", "coa": "Computer Organisation & Architecture", "calc": "Calculus",
    "cd": "Compiler Design", "cn": "Computer Networks", "db": "Databases (DBMS)",
    "dl": "Digital Logic", "dm": "Discrete Mathematics", "la": "Linear Algebra",
    "os": "Operating Systems", "prob": "Probability & Statistics",
    "pds": "Programming & Data Structures", "toc": "Theory of Computation",
}


def topic_list(topics):
    # Top-level topics only, with page ranges; nested headings are folded in.
    top = [t for t in topics if t["depth"] == min((x["depth"] for x in topics), default=1)]
    return "; ".join(f"{t['title']} (pp. {t['start']}–{t['end']})" for t in top) or "—"


def main():
    inv = json.load(open(os.path.join(DIR, "_inventory.json")))
    quality = json.load(open(os.path.join(DIR, "_quality.json")))
    legend = quality.pop("_legend")
    total = sum(s["pages"] for s in inv)

    out = [
        "# GATE notes inventory (internal)",
        "",
        "Reference material only. Sets are labelled A, B, C… in file order; author names, institutes",
        "and watermarks are deliberately not recorded. Nothing from these files is published: lessons",
        "are written in Nexora's own words with our own diagrams (see the build prompt, §1.2).",
        "",
        f"**{len(inv)} files · {total:,} pages.** Each file is one subject with several independent note",
        "sets marked by bookmarks. Pages 1–3 of every file are a cover, a list of sets and a topic finder.",
        "",
        "**Not covered by any notes:** General Aptitude, and the DA-only subjects (to be written from the",
        "official syllabus, standard textbooks and our PYQ bank).",
        "",
        "## Scan quality key",
        "",
        "| Rating | Meaning |",
        "|---|---|",
    ]
    out += [f"| {k} | {v} |" for k, v in legend.items()]
    out += ["", "## Files and sets", ""]
    for s in inv:
        key = s["subject"]
        out += [
            f"### {NAMES.get(key, key)} (`{key}`)",
            "",
            f"`{s['file']}` · {s['pages']} pages · {len(s['sets'])} sets",
            "",
            "| Subject folder | File | Set | Pages | Scan quality | Topics covered (page ranges) |",
            "|---|---|---|---|---|---|",
        ]
        for x in s["sets"]:
            out.append(
                f"| `{key}` | `{s['file']}` | {x['label']} | {x['start']}–{x['end']} ({x['pages']}) "
                f"| {quality.get(key, {}).get(x['label'], '?')} | {topic_list(x['topics'])} |"
            )
        out.append("")
    with open(os.path.join(DIR, "_inventory.md"), "w") as f:
        f.write("\n".join(out))
    print(f"wrote _inventory.md ({len(inv)} subjects, {total} pages)")


if __name__ == "__main__":
    main()
