# Handoff: finish the Nexora DSA course

Paste everything below the line into a new agent session on the `Gurudeep306/Nexora` repo.

---

You are continuing a large job on the Nexora repo (`Gurudeep306/Nexora`): writing the complete DSA course, the most thorough data-structures-and-algorithms course possible. A student who finishes it should be able to clear the coding rounds at any company.

## Where things stand

Branch `claude/blissful-hawking-9djkzg` holds the finished foundation (commit `6ab427a` and later). Read these files first, in this order:

1. `client/src/learn/AUTHORING.md`: the writing contract. It covers file layout, ids, lesson block types, the animation API, quiz question kinds, the judged-problem pipeline and the "done means" checklist. Follow it exactly.
2. `client/src/learn/content/dsa/syllabus.ts`: the 30 topics in 7 units. Each topic has a folder under `client/src/learn/content/dsa/<topic>/` with a `meta.ts` (`ready`, `pages`).
3. `client/src/learn/engine/examples.ts`: one complete reference animation per view (linked list, tree, graph, hash table, DP grid with arrows, heap tree + array, recursion tree + call stack). Copy these patterns.
4. The existing Arrays and Complexity topics, which set the voice and quality.

Tools already in the repo:
- `node client/scripts/check-learn.mjs <topic>`: content integrity (questions, answer keys, animation steps, problem links).
- `python3 scripts/learn/build.py [--strict] <topic>`: builds `src/learn/problems/<topic>.json` from `scripts/learn/problems/<topic>.py` and `scripts/learn/solutions/<topic>/<slug>/`.
- `python3 scripts/learn/verify.py <topic> -j 3`: compiles and runs every C++/Java/Python/JS/C solution on every test.
- `cd client && npx vite`, then open `/viz-lab?topic=<topic>`: a dev-only animation gallery. Screenshot it with `node scripts/viz-shot.cjs <url> <outdir> <algo-id>@end`.

Work in progress may exist on branches named `learn/<topic>/1-lessons`, `2-problems`, `3-problems` and `4-final`. Each stage branches from the previous one. Run `git fetch origin 'refs/heads/learn/*:refs/remotes/origin/learn/*'` to see whether any were pushed. For each topic, continue from its most advanced branch. If none exists, start the topic from scratch on top of `claude/blissful-hawking-9djkzg`.

A topic is finished when it has:
- 12–18 lesson pages with derivations and proofs, worked examples, and code in all five languages
- 15–30 animations that show the mechanism step by step, every frame with a precise note
- 90+ quiz questions using at least six kinds, every answer key checked
- 46+ judged problems, about 30% easy, 45% medium and 25% hard, including the classic interview problems for the topic
- for every problem: an `editorial.md` (Intuition / Approach / Why it works / Complexity / Pitfalls) and model solutions `main.cpp`, `Main.java`, `main.py`, `main.js` and `main.c`, all passing `verify.py`
- `meta.ts` set to `{ ready: true, pages: <count> }`
- `check-learn.mjs`, `npx tsc -b`, `build.py --strict` and `verify.py` all clean

Arrays and Complexity already have lessons and 26 and 8 judged problems. Deepen them, write editorials and solutions for their existing problems, and bring Arrays to at least 56 problems.

## How to work

- Do one topic at a time, in syllabus order: arrays, complexity, math, recursion, bits, strings, binary-search, sorting-basic, sorting-advanced, hashing, linked-lists, stacks, queues, binary-trees, bst, heaps, tries, segment-trees, graph-basics, shortest-paths, mst-dsu, topo, advanced-graphs, greedy, backtracking, dp-1, dp-2, dp-3, string-algorithms, interview. Skip topics whose `meta.ts` is already ready and whose checks pass.
- Only edit that topic's files. The engine, `syllabus.ts`, `assemble.ts`, `lib.py`, `build.py`, `verify.py` and `check-learn.mjs` are shared and frozen.
- After each topic passes all checks, and the client build (`cd client && npm run build`) and server tests (`npm test`) also pass, commit it to `claude/blissful-hawking-9djkzg` and push. Content then reaches the site progressively.
- Do not push to `main` or `staging`. The owner deploys by fast-forwarding `staging` then `main` from this branch.
- Never weaken tests or checks to make something pass. Fix the content instead.
- Write in your own words. Use CLRS, Sedgewick, Skiena, Kleinberg–Tardos, Laaksonen and cp-algorithms for rigour, but never copy text.
