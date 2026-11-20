# Chapter 2 plan: First-order logic

Internal planning file (the build skips it). Same house rules as Chapter 1 (`_style.md`; ≥4 step
examples per concept with an edge case; theorem + proof or derivation for every rule GATE uses; recap
per section; animation where motion teaches; `#id` + `depth` on every block). Lessons at Digital Logic
depth (7–10k words).

- Folder: `content/gate-notes/dm/02-predicate-logic/`; `chapter: predicate-logic`; `pyq_topics`:
  `dm/logic`. 35 PYQs: 19 + 16.
- Conventions (stated in Lesson 1 and used everywhere): domains are non-empty; a quantifier binds as
  tightly as ¬ unless brackets say otherwise (GATE options always bracket the scope); "all A are B" is
  ∀x(A(x) → B(x)) and "some A are B" is ∃x(A(x) ∧ B(x)); ∃!x φ is "exactly one".
- Check scripts: **`predlib.py`** (parser for Unicode/ASCII/LaTeX with predicates of any arity and
  equality; finite-domain evaluation; exhaustive interpretations on domains of size 1..k;
  counter-model and model search; negation normal form). Lesson checks `l2_01_quantifiers.py`,
  `l2_02_validity.py` re-derive every translation (by comparing candidate formulas with the intended one
  on all interpretations over small domains, plus hand-built interpretations for the English meaning),
  every PYQ key and practice answer. Validity claims that the finite search cannot prove are proved in
  the lesson and checked on all domains up to size 3 (with a note).
- Viz: `_viz_ch2_l01.py`, `_viz_ch2_l02.py` (domain strips with ∀ as a big AND and ∃ as a big OR; the
  ∀∃ / ∃∀ grid; negation push-through ladder; counter-model diagrams for each one-way law).
- Live Lab: **Quantifier Lab** (`quantifier-lab`, tabs `evaluate` and `models`), `QuantifierLab.tsx`
  with `predLogic.ts` (twin of predlib; vectors `lab_vectors_ch2.json`).
- Errata: A 28/31 (empty domains), A 34 ("only A are B" gloss), A 38 (typo), D 677 (closed QBF vs FOL).

| # | Lesson id | Title | PYQs | Est. study time |
|---|---|---|---|---|
| 1 | `dm-02-01-predicates-quantifiers` | Predicates, quantifiers and translation | 19 | 70 min |
| 2 | `dm-02-02-quantifier-laws-validity` | Quantifier laws, validity and models | 16 | 70 min |

## As built (2026-11-20)

### Lesson 1 · `predicates-quantifiers` (19 PYQs)
- Sections: from propositions to predicates; the two quantifiers (bound/free, scope); worked examples:
  evaluating; the four basic forms (pairing theorem, "and" subjects, phrasebook); worked examples:
  translation; nested quantifiers (game intuition, ∃∀ ⇒ ∀∃, grid reading); worked examples: nested;
  negation (De Morgan, push-through derivation, symbol-count trick); worked examples: negation;
  uniqueness and counting with equality; worked examples: uniqueness; number theory in logic; writing
  mathematics with quantifiers (definitions table, "any", restricted quantifiers); Lab (`evaluate`).
- Scenes (all animated): `forall-big-and`, `exists-big-or`, `scope-bracket`, `all-are-wrong`,
  `some-are-wrong`, `forall-exists-grid`, `translate-steps`, `negation-ladder`, `exists-unique`.
- PYQ → blocks: see the `tests="…"` of each `:::pyq` (pairing rule: 2004, 2005, 2008, 2012, 2013, 2014×2;
  "and" subjects: 2006, 2009; negation: IT 2004, 2007, IT 2008, 2009, 2010; number theory: 2011, 2019;
  order: 2023, 2026; uniqueness: 2025).
- Practice themes: all/some/only translations, composite numbers by formula, negation, grid counting,
  exactly one, ℤ vs ℕ orders, "always a bigger one" on a finite domain.

### Lesson 2 · `quantifier-laws-validity` (16 PYQs)
- Sections: worlds, models and validity (duality, counter-model trick, finite-search trap); worked
  examples: classifying; the quantifier laws (two-way, one-way with counter-models, method table);
  worked examples: valid or not; moving quantifiers past W (pull-out laws, prenex form); worked
  examples: pulling; worked examples: proving laws and converting forms; controlling the size of a
  model; open formulas, closures and capture; sentences with special models (barber, infinite-only,
  small models, induction, Horn clauses); worked examples: special sentences; Lab (`models`).
- Scenes (all animated): `model-search`, `forall-or-counter`, `exists-and-counter`, `law-map`,
  `pull-past-w`, `prenex-steps`, `infinite-chain`, `small-model`, `horn-chain`.
- Practice themes: valid laws, classification, counting counter-models, pull-outs, prenex, model sizes,
  infinite-only sentences, implied sentences, the converse trap, five-way validity count (drinker).
