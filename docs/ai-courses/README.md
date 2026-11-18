# AI courses — the plan and the sources

This folder is everything needed to build NexoraGuru's AI courses: Math for
AI, Machine Learning, Deep Learning, Generative Models, Computer Vision, NLP,
Large Language Models and Reinforcement Learning. **No course content is
written yet.** This is the plan, the rules and the verified sources, so that
any agent can build a topic to the same standard.

## Read in this order

| File | What it is |
|---|---|
| [STYLE.md](STYLE.md) | How we explain: every lesson is a story, code is built up step by step, no student stays stuck. |
| [UPDATING.md](UPDATING.md) | How new models and papers join the web as they come out. |
| [MODELS.md](MODELS.md) | The models timeline (LeNet to today), each linked to the lessons that explain it. Generated. |
| [PIPELINE.md](PIPELINE.md) | How a topic goes from papers to a finished lesson, the new tools to build first (3D, live training in the browser, derivation stepper, paper walks, labs), and the phases. |
| [AGENT_RULES.md](AGENT_RULES.md) | The rules every agent follows. Give this file to any agent. |
| [TOPIC_TEMPLATE.md](TOPIC_TEMPLATE.md) | The exact shape of one topic: every section, block and check. |
| [NOTATION.md](NOTATION.md) | One notation for every course (symbols, shapes, indices). |
| [CURRICULUM.md](CURRICULUM.md) | The web of courses: 10 courses, 225 topics in teaching order, each with what it builds on, what uses it, related topics, papers, models and its signature visual. Generated from `curriculum.json` (with `web.json`, the data the site will draw). |
| [sources/](sources/) | `papers.json` (248 papers), `books.json` (24 books), `courses.json` (26 courses, guides and code references), `models.json` (22 models), **`DOWNLOAD.md` (a link for every paper)** and `CHECK.md` (the check report). |

## The sources are checked, not typed from memory

`node scripts/ai-courses/verify-sources.mjs` (on this cloud machine prefix
`NODE_USE_ENV_PROXY=1`) checks every paper against the real record:

- arXiv papers against the arXiv API (the title must match);
- DOIs against Crossref (the title must match), and OpenAlex for whether a free legal copy exists;
- books, courses and other links must answer.

Last run: **248 of 248 papers verified; 218 have a free legal copy; 30 are
paywalled** (listed first in `sources/DOWNLOAD.md`). 11 book, course and code
sites could not be reached from the cloud machine or refuse automated checks,
so they need one manual check in a browser (listed in `sources/CHECK.md`). A lesson may cite only a source
that is in these files and passes the check.

## Paywalled papers (the owner's IEEE / Elsevier access)

- The 30 paywalled papers are listed first in `sources/DOWNLOAD.md`, with links. The owner
  downloads them with institutional access.
- **They are never committed and never published.** Publisher licences
  (IEEE, Elsevier, Springer, Wiley, Nature) allow personal and institutional
  reading, not redistribution.
- **The paper library** is `docs/ai-courses/private/library/<NN>-<course>/<paper-id>.pdf`
  (git-ignored), for example `03-deep-learning/rumelhart-1986.pdf`. What we hold
  is listed in `sources/LIBRARY.md` (committed; no PDFs).
  - Owner's papers: `node scripts/ai-courses/library.mjs import <folder>` reads
    each PDF's text, recognises the paper and files it under its id.
  - Free papers: `NODE_USE_ENV_PROXY=1 node scripts/ai-courses/fetch-open.mjs`.
  - **Cloud sessions are temporary**, so the library disappears with the
    machine. The free papers can be fetched again in about 15 minutes. The
    owner's papers are kept as one zip, `Nexora-AI-papers-owner.zip` (made by
    `library.mjs pack`), in the owner's Google Drive; a new session unzips it
    and runs `library.mjs import` on it.
- An agent reads them to write **our own** explanation and derivation, cites
  them (authors, year, DOI), and links to the publisher's page. No copied
  paragraphs, tables or figures. A quote is at most one sentence, in quotes,
  with the page number.
- Open papers (arXiv, JMLR, PMLR, NeurIPS proceedings) are linked, not
  re-hosted: arXiv's default licence does not allow re-hosting either.
  `scripts/ai-courses/fetch-open.mjs` downloads the open ones into the private
  folder for agents to read.

## What is honest to say

- Every number shown in a lesson is computed (by the in-browser tensor engine,
  checked against NumPy/PyTorch in CI), never typed in.
- Books marked CC BY-SA (Dive into Deep Learning) or CC BY (Distill articles)
  may be adapted with attribution. Everything else is read and cited, not
  copied. `books.json` notes each licence as the publisher states it: re-read
  the licence before adapting.
- Training big models in the browser is not possible. The labs train small
  models live (thousands to a few million parameters) and use small
  pre-trained models (trained by us, offline, on openly licensed data) for
  demos. Each lab says which it is.

## Status and next step (2026-11-18)

- **Done (P0):** this plan; 248 verified papers, 24 books, 26 courses and
  guides, 22 models; the web of 10 courses and 225 topics in strict teaching
  order with 400 links (144 between courses), every paper used; the story
  style; the update process; the checkers and the open-paper downloader.
- **Library (complete, 2026-11-18):** all 248 papers (47 from the owner, the
  rest free copies), all 68 books, courses, sites and code repos, about 7.7 GB;
  6,295 files indexed into 51,152 searchable passages (scans read by OCR); the
  topic map for all 225 topics is in `sources/TOPIC-MAP.md`.
  - The owner's papers are kept as `Nexora-AI-papers-owner.zip`, and seven
    books are in the owner's Drive folder "Books" (Boyd; Elements of
    Statistical Learning; Kochenderfer, 2nd ed.; Nielsen; Jurafsky & Martin;
    Sutton & Barto, final 2nd edition, 2018; Szeliski, 2nd ed.). A
    new session downloads that folder by its share link, then runs
    `library.mjs import` on the zip.
- **Next (P1):** build the AI Lab engine (PIPELINE.md section 4.1, 4.2, 4.4 and
  the golden tests), then the pilot (P2): Foundations and Deep Learning
  chapter 1, for the owner to approve before anything else is written.

## The library: collect once, search forever

Everything is collected once into a private library and made searchable, so
no session ever has to hunt for material again.

| What | Where | Command |
|---|---|---|
| Papers (248) | `private/library/<NN>-<course>/<id>.pdf` | `fetch-open.mjs` (free) and `library.mjs import <folder>` (owner's) |
| Books, courses, sites, code repos (68, in `sources/library.json`) | `private/library/{books,courses,sites,repos}/<id>/` | `NODE_USE_ENV_PROXY=1 node scripts/ai-courses/ingest.mjs` |
| Full-text search over all of it, to the page or line | `private/index.sqlite` | `node scripts/ai-courses/search.mjs --build`, then `search.mjs "words"` |
| Where each of the 225 topics is covered (pointers only, committed) | `sources/TOPIC-MAP.md`, `topic-map.json` | `search.mjs --map` |
| What the library holds (committed, no content) | `sources/LIBRARY.md`, `sources/INGEST.md` | written by the commands above |

Everything under `private/` is git-ignored: the material is for our own
reading, never published. A new session rebuilds it with the commands below
(about 30–40 minutes), plus the owner's zip for the paywalled papers. To add a
source, add it to `sources/library.json` (books, courses, sites, repos) or
`sources/papers.json`, then run the commands.

## Commands

```bash
node scripts/ai-courses/check-curriculum.mjs                         # ladder check + regenerate CURRICULUM.md
NODE_USE_ENV_PROXY=1 node scripts/ai-courses/verify-sources.mjs       # check every paper, book and course
NODE_USE_ENV_PROXY=1 node scripts/ai-courses/fetch-open.mjs           # download free papers into the library
node scripts/ai-courses/library.mjs import <folder>                   # file the owner's papers (from the zip)
NODE_USE_ENV_PROXY=1 node scripts/ai-courses/ingest.mjs               # books, courses, sites and code repos
node scripts/ai-courses/search.mjs --build && node scripts/ai-courses/search.mjs --map   # search index + topic map
node scripts/ai-courses/search.mjs "lstm forget gate derivation" --kind book            # find it, to the page
```
