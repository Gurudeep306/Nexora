# Chapter 1 plan: Propositional logic

Internal planning file (the build skips it). It follows `_style.md`: the full arc for every concept
(intuition → definition → why → how → what goes wrong), at least 4 step-format worked examples per
concept (easy → medium → GATE → edge case; the edge case uses `level="gate"` and a title starting
"Edge case:"), a `:::derivation` or `:::theorem` + `:::proof` for every rule GATE uses, a recap note
at the end of each section, animation wherever motion teaches, and every block carrying an `#id` and
a `depth`. Lessons are written to Digital Logic depth (5–9k words each).

- Folder: `content/gate-notes/dm/01-propositional-logic/`; `chapter: propositional-logic`.
- `pyq_topics`: `dm/logic` (all three lessons). 43 PYQs: 12 + 23 + 8.
- Link to Digital Logic where the same algebra appears ([Boolean laws](subject:dl) in prose: the DL
  lessons `boolean-laws`, `canonical-forms`, `universal-gates` teach the circuit view; we teach the
  logic view and do not re-teach K-maps).
- Conventions fixed here and used in every later chapter: truth-table rows start with all-True (T
  before F), the first variable is the most significant bit for minterm/maxterm numbers (minterm i is
  true exactly on row with binary value i when T = 1), → is right-associative, precedence
  ¬ > ∧ > ∨ > → > ↔.
- Check scripts (`content/gate-notes/_checks/dm/`): **`logiclib.py`** (parser for Unicode, ASCII and
  LaTeX spellings so PYQ options are parsed verbatim; evaluator; truth tables; classification;
  equivalence with counterexample rows; argument validity; consistency; minterm/maxterm lists;
  canonical DNF/CNF; Post's five classes and functional completeness; resolution saturation).
  `l1_01_connectives.py`, `l1_02_equivalence.py`, `l1_03_inference.py` re-derive every worked value,
  viz caption, PYQ key and practice answer; `lessons_ch1.py`, `pyq_ch1.py`, `viz_ch1.py` are the shared
  structure, solution and scene checks; `l1_lab_vectors.py` writes `lab_vectors_ch1.json` for the lab
  test.
- Viz: our own scenes from `_viz_ch1_l01.py` … `_viz_ch1_l03.py` (truth tables as `table` elements
  revealed column by column; the implication "promise" as four boxes; the converse/inverse/
  contrapositive square as boxes + arrows; law-by-law rewrite ladders; falsification trees as nodes
  and arrows; resolution trees). Tones: success = true, muted = false, danger = the falsifying row /
  broken promise, accent = the column or step in focus.
- Live Lab: **Truth Table Lab** (`truth-table`, tabs `table` and `compare`), `TruthTable.tsx` with
  the logic in `logicLogic.ts` (a TypeScript twin of logiclib, tested against the vectors).
- Errata touching this chapter (`_errata/dm.md`): A 23 (∧ does not distribute over →), B 163
  (right-associative →), C 313/326 (maxterm numbering: Π(1, 4, 6)), E 783.

| # | Lesson id | Title | PYQs | Est. study time |
|---|---|---|---|---|
| 1 | `dm-01-01-propositions-connectives` | Propositions, connectives and truth tables | 12 | 60 min |
| 2 | `dm-01-02-equivalence-normal-forms` | Tautologies, laws of equivalence and normal forms | 23 | 75 min |
| 3 | `dm-01-03-inference-resolution` | Arguments, rules of inference and resolution | 8 | 55 min |

## Lesson 1 · Propositions, connectives and truth tables
Sections: propositions (what is and is not one; truth values; atomic vs compound) → the five
connectives (one section each for ¬/∧/∨, implication, biconditional and ⊕) → truth tables (2ⁿ rows,
building column by column, evaluating from facts) → implication's relatives (converse, inverse,
contrapositive; the equivalent pairs, proved by table) → English to logic (only if, if, unless,
necessary/sufficient, but, neither–nor, "when"; the 2002/2017/2024 traps) → operators defined by a
table (rewriting ⊙/□ with ¬ and ∨; the 2006 and 2009 PYQs; "exactly two true", 2014) → PYQs →
practice → summary. Viz: `truth-table-build` (animated), `implication-promise` (animated),
`implication-square` (animated), `unless-decoder` (animated), `custom-operator` (animated). Lab:
`truth-table` tab `table`.

## Lesson 2 · Tautologies, laws of equivalence and normal forms
Sections: tautology/contradiction/contingency/satisfiable/valid → logical equivalence vs ↔ → the laws
(with proofs by table and the duality principle) → proving equivalences by laws (rewrite ladders) →
fast tautology tests (falsification: assume F, propagate) → DNF/CNF and canonical forms (minterm and
maxterm numbering, PDNF/PCNF, converting) → satisfiability of CNF (k-CNF facts, 2007) → functional
completeness (Post's classes stated, the standard complete sets, why {∧, ∨, →, ↔} is not complete;
counting functions 2^{2ⁿ}) → PYQs → practice → summary. Viz: `law-ladder`, `falsify-tree`,
`canonical-table`, `completeness-map`. Lab: `truth-table` tab `compare`.

## Lesson 3 · Arguments, rules of inference and resolution
Sections: arguments and validity (the critical rows) → logical consequence and consistency → the
rules of inference (each with its tautology and a proof) → fallacies → chained proofs → resolution
(clauses, the rule, refutation, the empty clause; soundness and completeness stated) → axiom systems
(sound, complete, consistent) → truth-tellers and liars → PYQs → practice → summary. Viz:
`critical-rows`, `resolution-tree`, `knights-grid`. Lab: `truth-table` tab `compare` (argument mode).
