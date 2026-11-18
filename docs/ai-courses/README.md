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
- Keep them in a private place: the owner's Google Drive folder "Nexora AI
  papers", or locally in `docs/ai-courses/private/` (git-ignored).
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
- **Waiting on the owner:** download the 30 paywalled papers (links in
  `sources/DOWNLOAD.md`) into `docs/ai-courses/private/papers/<id>.pdf` or the
  Drive folder; open the 11 "check by hand" links once in a browser.
- **Next (P1):** build the AI Lab engine (PIPELINE.md section 4.1, 4.2, 4.4 and
  the golden tests), then the pilot (P2): Foundations and Deep Learning
  chapter 1, for the owner to approve before anything else is written.

## Commands

```bash
node scripts/ai-courses/check-curriculum.mjs                         # ladder check + regenerate CURRICULUM.md
NODE_USE_ENV_PROXY=1 node scripts/ai-courses/verify-sources.mjs       # check every paper, book and course
NODE_USE_ENV_PROXY=1 node scripts/ai-courses/fetch-open.mjs           # download open papers (private folder)
```
