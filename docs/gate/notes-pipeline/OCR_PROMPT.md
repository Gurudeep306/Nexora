# Prompt: turn the reference-notes PDFs into text and pictures (OCR)

Give this whole file to the agent that does the conversion. It works in the **private**
repository `Gurudeep306/Materials`, never in the public Nexora repository.

---

## Your job, in one paragraph

The Materials repository holds 13 PDFs of handwritten and typed GATE CSE notes, one PDF per
subject. Each PDF contains several separate note sets (A, B, C…), written by different people.
Your job is to turn **every page** into clean, faithful text (Markdown with LaTeX for maths),
and to save pictures of the diagrams that text cannot capture. Another agent will later read
your output to write lessons, so **accuracy and completeness matter more than speed**. You do
not summarise, improve, correct or merge anything. You copy exactly what is on the page.

## Order of work

Do one subject completely before starting the next, in this order:

1. `dm`: Discrete Mathematics
2. `coa`: Computer Organisation & Architecture
3. `toc`: Theory of Computation
4. `cd`: Compiler Design
5. then the rest, in this order: `algo`, `os`, `db`, `cn`, `ds`, `pds`, `dl`, `calc`, `la`
   (check the real folder names against `_inventory.md`; skip any subject the owner says is done)

After each subject: commit, push, open a pull request, and **tell the owner the subject is
finished**, with the numbers from Step 9.

## Rules you never break

1. **Copy, do not create.** Write only what is on the page. Never add explanations, never fix a
   mistake you notice, never fill a gap from your own knowledge. If the page is wrong, copy it
   wrong and add a note (Step 6).
2. **Every page is accounted for.** Every PDF page gets a file, even blank pages, covers and
   pages you cannot read.
3. **Never guess silently.** Anything you are not sure of is marked (Step 6).
4. **No personal data.** Do not copy names, phone numbers, e-mail addresses, social-media
   handles, coaching-institute names, roll numbers or signatures. Replace them with
   `[name removed]`, `[contact removed]` or `[institute removed]`. Watermarks and page
   headers or footers with such details are left out.
5. **This repository only.** Nothing from the notes is ever copied into the public Nexora
   repository.
6. **Keep the page numbers of the PDF** (1, 2, 3… as a PDF viewer counts them), not the
   numbers written on the paper.

## Step 0: set up (once)

```bash
git clone https://github.com/Gurudeep306/Materials.git
cd Materials
git checkout -b ocr-<subject>            # one branch per subject, e.g. ocr-dm
sudo apt-get install -y poppler-utils    # gives pdftoppm, pdftotext, pdfinfo
pip install pillow pypdf
```

Find the subject's PDF and its sets. The sets, their page ranges and their scan quality are
listed in the Nexora file `content/gate-notes/_inventory.md` (and `_quality.json`). Copy the
relevant table into your notes before you start. Check the page count:

```bash
pdfinfo <file>.pdf | grep Pages
```

It must equal the count in `_inventory.md`. If it does not, stop and tell the owner.

## Step 1: the folder layout (exactly this)

```
ocr/<subject>/
  README.md                  # the subject summary (Step 9)
  manifest.json              # one entry per PDF page (Step 8)
  <SET>/                     # A, B, C, … one folder per set
    index.md                 # the set's table of contents (Step 7)
    p0004.md                 # one file per PDF page, 4-digit page number
    p0005.md
    …
    img/
      p0012-fig1.webp        # pictures (Step 5)
      p0012-fig2.webp
  _front/                    # pages 1–3 of the PDF (cover, list of sets, topic finder)
    p0001.md …
```

A page that belongs to no set (front matter, a separator) goes in `_front/`.

## Step 2: render each page as an image

Use the resolution that matches the set's scan quality:

| Quality | Resolution (`-r`) | Notes |
|---|---|---|
| good | 200 | one page per scan |
| faint, noisy | 250 | increase contrast if needed (Step 2b) |
| spreads | 250–300 | two paper pages per PDF page: read the **left half, then the right half** |
| dense | 300 | small writing: read in two halves, top then bottom |
| typed, reference | 200 | try the text layer first (Step 3b) |

```bash
pdftoppm -r 200 -f 120 -l 129 -png <file>.pdf /tmp/<subject>-<SET>
```

Work in batches of about 10 pages. Delete the renders in `/tmp` after each batch.

**Step 2b, faint pages:** if a page is hard to read, make a high-contrast copy and read that:

```python
from PIL import Image, ImageOps, ImageEnhance
im = ImageOps.grayscale(Image.open(path))
im = ImageEnhance.Contrast(ImageOps.autocontrast(im, cutoff=2)).enhance(1.8)
im.save(path.replace('.png', '-hc.png'))
```

## Step 3: read the page

**3a, handwritten pages.** Look at the image and read it yourself, line by line. Text
extraction (`pdftotext`) gives nothing useful for handwriting, so do not rely on it. For
spreads and dense pages, crop and read each half separately, so the writing is large enough:

```python
from PIL import Image
im = Image.open(path); w, h = im.size
im.crop((0, 0, w // 2, h)).save(left); im.crop((w // 2, 0, w, h)).save(right)
```

**3b, typed pages.** Run `pdftotext -f N -l N -layout <file>.pdf -`. If the output is clean,
use it, but **compare it with the image** and fix anything the text layer got wrong
(maths symbols, subscripts and tables are often broken). If the output is garbage, read the
image as in 3a.

## Step 4: write the page file

Every `pNNNN.md` has exactly this shape:

```markdown
---
page: 123              # PDF page number
set: C                 # set letter, or "front"
topic: "Cache mapping" # the topic from _inventory.md (or what the page heading says)
kind: notes            # notes | questions | solutions | mixed | blank | cover | index
legibility: good       # good | partial | poor
halves: false          # true for spreads/dense pages read as two halves
figures: 2             # number of pictures saved in img/ for this page
---

## Cache mapping

(the transcription, in reading order)
```

How to write the transcription:

- **Reading order:** top to bottom, left column before right column. For a spread, write
  `### Left half` then `### Right half`.
- **Headings:** a title written large or underlined becomes `##` or `###`.
- **Maths:** always LaTeX. Inline `$x^2 + 1$`, display `$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$`.
  Logic symbols: `\forall \exists \neg \wedge \vee \to \leftrightarrow \oplus`. Sets:
  `\cup \cap \subseteq \in \emptyset`. Write subscripts and superscripts exactly as on the page.
- **Lists:** bullets and numbered lists as Markdown lists, keeping the writer's numbering.
- **Tables** (truth tables, K-maps written as tables, timing tables, parse tables, cache
  traces): Markdown tables, every cell copied. Empty cell = leave it empty.
- **Boxed, starred or highlighted text** ("important", "trick", "GATE 2015"): keep it, as
  `> **Boxed:** …` or `**(starred)** …`. Keep every year tag such as "GATE 2014" exactly.
- **Arrows and margin notes:** write margin notes where they belong, as
  `> *Margin note:* …`.
- **Crossed-out text:** leave it out, unless it is a correction the writer made (then write the
  final version only).
- **Questions and solutions:** keep the question, its options, and the writer's answer and
  working, in order. Mark the answer exactly as the writer did (`Ans: (c)`).
- **Do not** add your own headings, explanations, corrections or "cleaned up" maths.

## Step 5: pictures

Text cannot capture some things: circuit diagrams, automata (state diagrams), parse trees,
graphs, Hasse diagrams, Venn diagrams, timing diagrams, pipeline charts, memory and cache
layouts, K-maps drawn as grids.

For **each** such figure:

1. Crop it from the rendered page (Pillow, as in Step 3a), with a small margin.
2. Save it as WebP, at most 1200 px wide, quality 75:
   `im.save('img/p0123-fig1.webp', 'WEBP', quality=75)`. Number the figures in reading order.
3. In the page file, at the place where the figure appears, write:

```markdown
![fig1](img/p0123-fig1.webp)

> **Figure 1, described:** A DFA with states q0 (start), q1, q2 (final). q0 —a→ q1,
> q0 —b→ q0, q1 —a→ q2, q1 —b→ q0, q2 —a,b→ q2. Caption on the page: "strings with aa".
```

The description must contain **every** label, number, edge, arrow and value in the figure, so
that someone who cannot see the picture could redraw it. For a graph, list every vertex and
every edge. For a tree, list it level by level. For a table drawn as a figure, also copy it as
a Markdown table.

Do **not** save pictures of plain handwriting; transcribe it instead. Do not save full-page
images unless the whole page is one figure.

## Step 6: marking anything uncertain

| Situation | Write |
|---|---|
| a word you cannot read | `[?]` |
| a word you are fairly but not fully sure of | `[word?]` |
| a symbol you are unsure of | `[$\le$?]` |
| a whole line you cannot read | `[illegible line]` |
| the margin is cut off | `[cut off]` |
| the page looks wrong to you (a wrong formula, a wrong answer) | copy it as written, then add `> [check: the writer has 2^n here; 2^{n-1} may be meant]` |
| a page is blank | `kind: blank`, and the body says `(blank page)` |

Set `legibility: partial` if a page has a few `[?]`, and `poor` if more than about a fifth of
it is unreadable. Never leave a page with no file.

## Step 7: the set's `index.md`

Write it after finishing the set:

```markdown
# Set C (PDF pages 279–669)

| Pages | Topic | Kind | Notes |
|---|---|---|---|
| 280–292 | Propositional logic | notes | |
| 293–295 | Logic: solved GATE questions | questions | GATE 2014, 2016 tagged |
| 301 | Quantifiers | notes | partial: right margin cut off |
```

One row per run of pages on the same topic.

## Step 8: `manifest.json`

One entry per PDF page, in page order:

```json
{
  "subject": "dm",
  "file": "GATE_CSE_Discrete_Mathematics_5_Notes.pdf",
  "pages": 919,
  "entries": [
    {"page": 1, "set": "front", "file": "_front/p0001.md", "kind": "cover", "legibility": "good", "figures": 0},
    {"page": 4, "set": "A", "file": "A/p0004.md", "kind": "notes", "legibility": "good", "figures": 1}
  ]
}
```

## Step 9: check, then hand over

Run this check from the repository root. It must print `OK` before you open the pull request:

```python
import json, pathlib, re, sys
subj = sys.argv[1]
root = pathlib.Path("ocr") / subj
m = json.loads((root / "manifest.json").read_text())
pages = [e["page"] for e in m["entries"]]
assert pages == list(range(1, m["pages"] + 1)), "every PDF page must have exactly one entry, in order"
for e in m["entries"]:
    f = root / e["file"]
    assert f.exists(), f"missing {f}"
    t = f.read_text()
    assert re.search(rf"^page: {e['page']}$", t, re.M), f"{f}: wrong page number"
    figs = re.findall(r"!\[fig\d+\]\((img/[^)]+)\)", t)
    assert len(figs) == e["figures"], f"{f}: figures count"
    for g in figs:
        assert (f.parent / g).exists(), f"{f}: missing picture {g}"
        assert "**Figure" in t, f"{f}: picture without a description"
    assert e["kind"] == "blank" or len(t.split("---", 2)[-1].strip()) > 0, f"{f}: empty body"
    assert not re.search(r"\b\d{10}\b|@\w+\.\w+", t), f"{f}: looks like a phone number or e-mail"
print("OK", subj, len(pages), "pages")
```

Then write `ocr/<subject>/README.md` with:

- the PDF file name and page count;
- one line per set: pages, scan quality, number of pages read, number of pictures;
- the count of pages marked `partial` and `poor`, with their page numbers;
- every `[check: …]` note, with its page number (these are places the writers may be wrong).

Commit in small pieces as you go (`git add ocr/<subject>/<SET>` after every 25–50 pages,
message `OCR <subject> set <SET>: pages a–b`), push the branch, open a pull request named
`OCR <subject>: <N> pages, <M> pictures`, and tell the owner, in one short message:
the subject is done, the number of pages, pictures, partial and poor pages.

## Common mistakes to avoid

- Skipping "unimportant" pages such as question lists, revision sheets and index pages. Copy them too.
- Summarising a long derivation instead of copying every line of it.
- Losing subscripts and superscripts (`x_1`, `2^n`, `a_{n-1}`), primes (`A'`) and overbars
  (`\overline{A}`). They change the meaning.
- Reading a spread as one page instead of left half, then right half.
- Mixing up similar symbols: `\to` vs `\geq`, `\vee` vs `v`, `\in` vs `\epsilon`, `0` vs `O`,
  `1` vs `l`. If unsure, mark it `[…?]`.
- Saving a figure without a full description.
- Using the page number written on the paper instead of the PDF page number.
- Working on several subjects at once. Finish one, check it, hand it over, then start the next.
