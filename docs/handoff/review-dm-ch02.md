# Review request: DM Chapter 2 (predicate logic) — branch `notes/dm-ch02`

Requested 2026-11-18 after job C2. Independent second-pass review (README §4 N7.2) before the
lessons flip to `status: published` (N8). Reviewer: please check every item below as a strict
GATE examiner and report findings; nothing here is copied from any reference notes — every
number, key and answer is recomputed by the check scripts named below.

## Lessons to review (both `status: review`, `needs_review: true`)

1. `content/gate-notes/dm/02-predicate-logic/01-predicates-quantifiers.md`
   (id `predicates-quantifiers`) — 7,446 words, 42 worked examples, 9 animated scenes, 1 lab
   embed (`quantifier-lab` tab `evaluate`), 19 PYQs, 12 practice. Checks:
   `l2_01_predicates.py`, `viz_ch2.py`, `pyq_ch2.py`, `lessons_ch2.py`.
2. `content/gate-notes/dm/02-predicate-logic/02-quantifier-laws-validity.md`
   (id `quantifier-laws-validity`) — 7,430 words, 54 worked examples, 8 animated scenes, 1 lab
   embed (`quantifier-lab` tab `models`), 16 PYQs, 12 practice. Checks: `l2_02_validity.py`.

Preview with `node scripts/build-gate-notes.js --drafts`, then
`node client/scripts/check-page.cjs /gate/notes/dm/predicates-quantifiers <name> light,dark,phone`
and the same for `/gate/notes/dm/quantifier-laws-validity`: axe 0, no sideways scroll at 360 px,
every viz plays, the lab loads. Please attach light/dark/phone screenshots to the PR.

## Every PYQ embedded in chapter 2 (35) — verify the key and the v2 solution

Lesson 1 (19): `cse-2004-cs-23`, `it-2004-it-3`, `cse-2005-cs-41`, `cse-2006-cs-26`,
`cse-2007-cs-22`, `cse-2008-cs-30` (B-note: loose ∃y brackets in option A — see `_errata/dm.md` §3),
`it-2008-it-22`, `cse-2009-cs-23`, `cse-2009-cs-26`, `cse-2010-cs-30`, `cse-2011-cs-30`,
`cse-2012-cs-13`, `cse-2013-cs-27`, `cse-2014-1-cs-1`, `cse-2014-3-cs-53`, `cse-2019-cs-35`,
`cse-2023-cs-16`, `cse-2025-1-cs-38`, `cse-2026-2-cs-1`.

Lesson 2 (16): `cse-1991-b-15-b` (descriptive), `cse-1992-a-2-xv` (MSQ), `cse-2003-cs-32`,
`cse-2003-cs-33`, `cse-2003-cs-71` (B-note: options B and D printed identically),
`it-2005-cs-36`, `it-2006-cs-21`, `it-2007-cs-21`, `it-2008-it-21`, `cse-2013-cs-47` (B-note:
as printed A and D both non-equivalent, GATE 2013 marks-to-all, intended key D kept),
`cse-2015-2-cs-55` (B-note: propositional vs FOL "tautology", key C), `cse-2016-2-cs-27`,
`cse-2017-1-cs-2`, `cse-2018-cs-28`, `cse-2020-cs-39`, `cse-2025-2-cs-5`.

All 35 keys are re-derived by finite-domain evaluation / equivalence search in
`l2_01_predicates.py` + `l2_02_validity.py` (seed 20261118 for sampling); all 35 have v2
solutions in `src/gate/solutions/*.json` written by `_sol_ch2_l01.py` / `_sol_ch2_l02.py`
(structure enforced by `pyq_ch2.py`).

## Every practice question (24) — verify the answer

`nx-dm-02-01-q01` … `nx-dm-02-01-q12` and `nx-dm-02-02-q01` … `nx-dm-02-02-q12` in
`content/gate-notes/dm/02-predicate-logic/practice.json`; answers re-derived in the two
`l2_0*_*.py` checks.

## Every scene (17, all animated) — check each step's caption matches the frame

Lesson 1 (`_viz_ch2_l01.py`): `forall-big-and`, `exists-big-or`, `scope-bracket-grow`,
`all-vs-wrong-conj`, `some-vs-wrong-imp`, `translate-phrase-by-phrase`,
`order-grid-forall-exists`, `negation-push-ladder`, `unique-exists-unique`.

Lesson 2 (`_viz_ch2_l02.py`): `law-checked-on-world`, `one-way-law-countermodel`,
`exists-forall-implies-grid`, `quantifier-past-free-formula`, `prenex-ladder`,
`countermodel-search`, `infinite-models-chain`, `horn-forward-chain`.

Files in `content/gate-notes/dm/viz/*.json` must equal the generators (`viz_ch2.py`).

## What to check (N7.2)

- Correctness of every PYQ key and every worked-example answer (re-derive a few by hand;
  the scripts re-derive all).
- Misleading statements: scope/precedence of quantifiers, the non-empty-domain convention
  (errata A 28/31, A 42, D 677/681), wide-scope readings of `∀x, φ → ψ` in GATE options.
- Missing syllabus topics vs `dm/_outline.md` chapter 2 (sets A 37–43, B 172–177 halves,
  C 311–318, D 679–681; GAP: Bernays–Schönfinkel + infinite-only models, from Enderton).
- Nothing copied from the reference sets (digests live in gitignored
  `content/gate-notes/_digest/`).
- Accessibility: axe 0, no sideways scroll at 360 px, reduced-motion still, labels readable
  in light and dark; scenes play in the VizPlayer.

## When done

Record findings; after all are fixed and re-checked, set both lessons to
`status: published`, `needs_review: false`, run `npm run notes:build && npm run notes:check`,
commit the regenerated `src/gate/notes/`, and merge when CI is green (N8). Update
`_progress.json` (ch2 `review` line) accordingly.
