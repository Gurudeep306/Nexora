# Rules for every agent building the AI courses

Give this file, with [PIPELINE.md](PIPELINE.md), [STYLE.md](STYLE.md),
[TOPIC_TEMPLATE.md](TOPIC_TEMPLATE.md), [NOTATION.md](NOTATION.md) and the repo's `AGENTS.md`, to any agent working on
an AI topic. These rules are not optional.

## A. Teach from scratch, step by step

1. **Start where the student is.** Before you write, read the topic's `needs`
   in `curriculum.json`. Assume the student knows exactly those topics and
   nothing else.
2. **Nothing before it is taught.** Every term, symbol and result you use must
   come from this topic or from a topic it needs (directly or through the
   chain). If you need something that isn't there, stop: add a prerequisite
   topic or put the idea in this topic, then rerun
   `node scripts/ai-courses/check-curriculum.mjs`.
3. **One idea per topic, one step per page.** Never jump into a big topic.
   Build it: the smallest case first, then the general case, then the real
   one.
4. **Concrete before abstract.** Every page starts with a real example (real
   numbers, a real picture), then names the idea, then gives the symbols.
5. **Say why before how.** Each method opens with the problem it solves, and
   why the previous method wasn't enough.
5a. **Tell it as a story** ([STYLE.md](STYLE.md)): problem → failed attempt →
   key idea → watch it work → full math → what it unlocked. Build code up
   version by version; never dump it. Anyone who followed the order must be
   able to understand every sentence.
5b. **Use the web.** Link every earlier idea you use to the topic that teaches
   it; fill "What you need", "Stuck?" and "Where this goes next" from
   `web.json`. Never hard-code a link the web can generate.
5c. **Read the books first.** Read the matching chapters of the course's
   `reading` books before writing, then explain it better in our own words, and
   name the chapters in "Read more".

## B. Every piece of math, in full

6. **Derive, never assert.** Every formula is derived line by line. Each line
   has its reason (the rule used, or "substitute (3)"). No "it can be shown",
   "it is easy to see", "after some algebra", "left to the reader".
7. **Shapes everywhere.** Every vector and matrix has its shape written the
   first time it appears on a page ($\mathbf{W} \in \mathbb{R}^{m \times n}$),
   and every matrix derivative has its shape checked.
8. **Use [NOTATION.md](NOTATION.md).** Same symbols in every course. When a
   paper uses different symbols, show the paper's form once and map it to ours.
9. **Check every result numerically.** Each derived formula and worked example
   gets a golden test (`scripts/ai-courses/golden/`): NumPy recomputes it, and
   gradients are checked against finite differences. A derivation without a
   passing test does not ship.
10. **The tiny example by hand.** Every algorithm is first run on the smallest
    real case, with every intermediate number shown. Those numbers come from
    the tensor engine, never typed in.

## C. Show it

11. **Every idea gets a scene.** Use 3D where space is the idea (surfaces,
    embeddings, feature maps, linear maps), step-by-step where order is the
    idea (backprop, attention, a diffusion step), plots where change over
    time is the idea. A scene must teach one thing; decoration is not allowed.
12. **Scenes run on real computation.** The tensor engine's tape drives the
    scene. The student can change the inputs and see the numbers change.
13. **Accessible and on-brand.** Design tokens only (no raw colours), clay is
    never text, no glows, gradients or bloom; light and dark; reduced motion
    gives a static, stepped version; keyboard works; every 3D scene has a text
    description and a 2D fallback; no sideways scroll at 360 px; axe 0.

## D. Papers and books: honest, cited, never copied

14. **Cite only what is in `docs/ai-courses/sources/`** and passes
    `verify-sources.mjs`. To cite something new, add it to the right JSON file
    and run the check first. Never write a citation from memory.
15. **Read the paper before you write about it.** The library is
    `docs/ai-courses/private/library/<NN>-<course>/<paper-id>.pdf`. If it is
    empty (a new session): run `fetch-open.mjs` for the free papers, and ask
    the owner for `Nexora-AI-papers-owner.zip` (then `library.mjs import`) for
    the paywalled ones. Never use a pirated copy.
16. **Point to the exact place**: section, equation or table number of the paper.
17. **Write our own words and draw our own figures.** No copied paragraphs,
    figures or tables from papers or books. A quote is at most one sentence, in
    quotation marks, with its page or section. Exception: CC BY / CC BY-SA
    material (Distill, Dive into Deep Learning) may be adapted with
    attribution and, for CC BY-SA, under the same licence; say so on the page.
18. **Never re-host PDFs.** Link to arXiv or the publisher. Paywalled PDFs
    stay in the private folder (`docs/ai-courses/private/`, git-ignored, or
    the owner's Drive). Never commit or upload them anywhere.
19. **No invented facts.** No made-up numbers, benchmark scores, dates or
    quotes. A result from a paper is given with its table number. If you are
    not sure, say "not checked" and leave a TODO for the reviewer.

## E. Practice and labs

20. **Build it from scratch.** Every method has a NumPy lab in the browser
    (Pyodide): the student writes the key part; hidden tests check it and say
    what is wrong in plain words.
21. **Tests for the tests.** The reference solution passes; at least three
    typical wrong solutions (wrong sign, missing transpose, off-by-one) fail
    with a helpful message.
22. **Quizzes test understanding, not recall.** Numeric questions use the
    tiny example; every answer has a derived explanation.

## F. Process

23. **One topic per PR**, on your session's branch. Never commit to `main`,
    never force-push.
24. **Before pushing:** `npm test`; `cd client && npx tsc -b`; oxlint on
    touched files; `npx vite build`; `node scripts/ai-courses/check-curriculum.mjs --check`;
    `NODE_USE_ENV_PROXY=1 node scripts/ai-courses/verify-sources.mjs --papers`
    when sources changed; the golden tests; the page checker in light, dark and
    phone with axe 0.
25. **Review by a different model family** (Hive's policy), checking A–E above.
26. **No model names** in commits, PRs or code comments. No secrets. No
    personal data sent to outside services.
27. **Be honest in the PR**: what is done, what is not, and why.

## G. Definition of done for a topic

- Every section of [TOPIC_TEMPLATE.md](TOPIC_TEMPLATE.md) is present.
- Ladder check, source check, golden tests and lab tests pass.
- Every scene works in light, dark, reduced motion and at 360 px, axe 0.
- The reviewer has signed off on rules A–E.
- The topic's `meta` is set to ready, and `CURRICULUM.md` is regenerated.
