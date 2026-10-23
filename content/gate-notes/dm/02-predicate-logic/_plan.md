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
