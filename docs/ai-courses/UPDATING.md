# Keeping the courses current

AI changes every month. The courses are built so that new models and papers
slot into the web without rewriting it.

## When a new model comes out

1. **Find what was published.** A paper or technical report (arXiv), a model
   card, or nothing. Never describe what wasn't published; say "not
   published" (see the Claude and GPT-4 entries in `sources/models.json`).
2. **Add its papers** to `sources/papers.json` and run
   `NODE_USE_ENV_PROXY=1 node scripts/ai-courses/verify-sources.mjs --papers`.
3. **Add the model** to `sources/models.json`: name, maker, year, how much was
   published, one line on what is new, its papers, and the topics that explain
   its parts.
4. **Ask: is anything in it not taught yet?**
   - If every part is already a topic, you're done: it appears in the models
     timeline and on those topics' "In models" lists.
   - If it brings a new idea (a new attention type, a new training method),
     add a **new topic** to `curriculum.json` with its `needs` (it slots into
     the ladder after them) and its papers, then build it through the normal
     pipeline.
   - If it changes the best practice for an existing topic (for example a new
     default optimiser), add a short "What changed in <year>" section to that
     topic; don't rewrite the history.
5. Run `node scripts/ai-courses/check-curriculum.mjs` (rebuilds the web,
   `CURRICULUM.md` and `MODELS.md`) and open one PR.

## Every month (a scheduled Hive job can do steps 1–2)

1. Scan arXiv cs.LG, cs.CL, cs.CV and cs.AI, and the major labs' research
   pages, for papers that many people are citing or that come with a major
   model.
2. Propose additions (papers, models, new topics) as a PR, with the reason for
   each. The owner approves.
3. Re-run `verify-sources.mjs`: fix moved links; retire nothing silently.
4. Read student questions and errata; fix the lessons they point to.

## What never changes

- The ladder: a new topic still needs only what comes before it.
- Honesty: published facts only, each with its source.
- Old topics stay: the history (perceptron → transformer) is part of the
  story, even when a method is no longer used.
