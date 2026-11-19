# Chapter 2 plan: First-order logic

Internal planning file (the build skips it). Same house rules as Chapter 1 (`_style.md`; ≥4 step
examples per concept with an edge case; theorem + proof or derivation for every rule GATE uses; recap
per section; animation where motion teaches; `#id` + `depth` on every block). Lessons at Digital Logic
depth. Bar per lesson (dm.md §3): ≥ 7,000 words, ≥ 25 worked examples, ≥ 8 scenes (≥ 7 animated),
≥ 1 lab embed, ≥ 10 practice, exactly the outline's PYQs each with `tests=`.

- Folder: `content/gate-notes/dm/02-predicate-logic/`; `chapter: predicate-logic`; `pyq_topics`:
  `dm/logic`. 35 PYQs: 19 + 16.
- Conventions (stated in Lesson 1 and used everywhere): domains are non-empty; a quantifier binds as
  tightly as ¬ unless brackets say otherwise (GATE options always bracket the scope); "all A are B" is
  ∀x(A(x) → B(x)) and "some A are B" is ∃x(A(x) ∧ B(x)); ∃!x φ is "exactly one".
- Check scripts: **`predlib.py`** (parser for Unicode/ASCII/LaTeX with predicates of any arity and
  equality; finite-domain evaluation; exhaustive interpretations on domains of size 1..k;
  counter-model and model search; negation normal form). Lesson checks `l2_01_predicates.py`,
  `l2_02_validity.py` re-derive every translation (by comparing candidate formulas with the intended one
  on all interpretations over small domains, plus hand-built interpretations for the English meaning),
  every PYQ key and practice answer. Validity claims that the finite search cannot prove are proved in
  the lesson and checked on all domains up to size 3 (with a note).
- Viz: `_viz_ch2_l01.py`, `_viz_ch2_l02.py` (domain strips with ∀ as a big AND and ∃ as a big OR; the
  ∀∃ / ∃∀ grid; negation push-through ladder; counter-model diagrams for each one-way law).
- Live Lab: **Quantifier Lab** (`quantifier-lab`, tabs `evaluate` and `models`), `QuantifierLab.tsx`
  with `predLogic.ts` (twin of predlib; vectors `lab_vectors_ch2.json`). Built already; Lesson 1 embeds
  tab `evaluate`, Lesson 2 embeds tab `models`.
- Errata: A 28/31 (empty domains), A 34 ("only A are B" gloss), A 38 (typo), A 42 (∀→∃ needs non-empty
  domain), D 677/D 681 (closed QBF vs FOL). All already in `_errata/dm.md`.
- Lesson digests (gitignored) written 2026-11-18 from the set pages: A 26–43, B 168–177 (halves),
  C 296–318, D 676–681 → `content/gate-notes/_digest/dm/lessons/dm-02-0{1,2}-*.md`.

| # | Lesson id | Title | PYQs | Est. study time |
|---|---|---|---|---|
| 1 | `dm-02-01-predicates-quantifiers` | Predicates, quantifiers and translation | 19 | 70 min |
| 2 | `dm-02-02-quantifier-laws-validity` | Quantifier laws, validity and models | 16 | 70 min |

---

## Lesson 1 · `dm-02-01-predicates-quantifiers` · Predicates, quantifiers and translation

**Prerequisites:** `equivalence-normal-forms` (ch 1 lesson 2).
**Covered by sets:** A 26–37, B 168–173 (halves), C 296–311, D 676–679.

### Teaching sequence (block ids)
1. **Intuition** `#world-of-objects`: propositional logic cannot say "all men are mortal, Socrates is a
   man, therefore…" — we need objects, properties and relations.
2. **Definition** `#predicate-def`: a predicate (propositional function) P(x₁…xₙ) becomes a proposition
   when every variable is replaced by an element of its **domain** `#domain-def` (non-empty by
   convention — errata A 28/31). **Trap** `#trap-open-sentence`: an open sentence is not yet a
   proposition.
3. **∀ as a big AND** `#forall-def`: definition + **theorem** finite expansion ∀xP(x) ≡ P(a)∧…∧P(d) with
   **proof** (both directions by evaluating on the domain). Scene `forall-big-and`.
4. **∃ as a big OR that stops at the first witness** `#exists-def` + theorem ∃xP(x) ≡ P(a)∨…∨P(d) +
   proof. **Trick** `#trick-first-witness`. Scene `exists-big-or`.
5. **Free vs bound, scope** `#free-bound-def`, `#scope-def`; **trap** `#trap-null-quantifier` (∀xA ≡ A when
   x not free in A). Scene `scope-bracket-grow`.
6. **Translating English** `#translation-table` (**theorem**): all A are B = ∀x(A→B); some A are B =
   ∃x(A∧B); no A is B = ∀x(A→¬B) ≡ ¬∃x(A∧B); only A are B = ∀x(B→A) (errata A 34); not all A are B =
   ∃x(A∧¬B); all and only = ∀x(A↔B). **Trap** `#trap-wrong-pairing`: ∀x(A∧B) claims every object is A∧B;
   ∃x(A→B) is made true by any non-A. Scenes `all-vs-wrong-conj`, `some-vs-wrong-imp`,
   `translate-phrase-by-phrase` (a GATE sentence phrase by phrase).
7. **Nested quantifiers** `#nested-def`; **theorem** `#same-quantifiers-commute` (∀∀, ∃∃ commute) + proof;
   **one-way** `#one-way-exists-forall`: ∃y∀xP(x,y) → ∀x∃yP(x,y), with a counter-model for the converse;
   **trap** `#trap-order-matters`. Scene `order-grid-forall-exists` (rows x, columns y: every row marked
   vs one full column).
8. **Uniqueness and counting** `#unique-def`: ∃!xP(x) ≡ ∃x(P(x) ∧ ∀y(P(y) → y=x)) ≡ ∃x∀y(P(y)↔y=x);
   **theorem** `#counting-def`: at least n, at most n, exactly n forms (with ≠ / pairwise-equal). Scene
   `unique-exists-unique` (∃! unpacked into "exists" + "at most one").
9. **Negation** `#negation-laws`: **theorem** ¬∀xP ≡ ∃x¬P, ¬∃xP ≡ ∀x¬P + proof (counterexample ↔ witness);
   pushing ¬ inward through nested quantifiers. Scene `negation-push-ladder` (one quantifier per step).
10. **Number-theory predicates** `#number-predicates`: divides a|b as ∃k(b = a·k) or as a binary predicate;
    prime(x) ≡ x>1 ∧ ∀y(y|x → y=1 ∨ y=x). Worked example with x = 2, 4, 9.
11. **Lab**: `:::lab{#lab-quant-eval lab="quantifier-lab" tab="evaluate"}` in "Try it".
12. Recaps (`:::note` "Recap") after each section; 4+ examples per concept (easy/medium/gate/edge).

### PYQ → block map (19)
| PYQ | tests |
|---|---|
| cse-2004-cs-23 | translation-table,trap-wrong-pairing,nested-def |
| it-2004-it-3 | negation-laws,nested-def |
| cse-2005-cs-41 | translation-table,nested-def |
| cse-2006-cs-26 | translation-table |
| cse-2007-cs-22 | translation-table,negation-laws |
| cse-2008-cs-30 | translation-table,nested-def |
| it-2008-it-22 | negation-laws |
| cse-2009-cs-23 | translation-table |
| cse-2009-cs-26 | negation-laws |
| cse-2010-cs-30 | negation-laws,nested-def |
| cse-2011-cs-30 | number-predicates,nested-def |
| cse-2012-cs-13 | translation-table |
| cse-2013-cs-27 | translation-table,negation-laws |
| cse-2014-1-cs-1 | translation-table,negation-laws |
| cse-2014-3-cs-53 | translation-table |
| cse-2019-cs-35 | number-predicates,nested-def |
| cse-2023-cs-16 | nested-def,one-way-exists-forall |
| cse-2025-1-cs-38 | unique-def,counting-def |
| cse-2026-2-cs-1 | translation-table,nested-def |

### Scenes (`_viz_ch2_l01.py`; all animated; names unique across dm/viz)
- `forall-big-and`: domain strip {a,b,c,d}; step per element: P(a) lights T, AND chip updates; final:
  ∀xP(x) = T∧T∧F∧T = F with the F element in danger.
- `exists-big-or`: same strip; ∃xP(x) ORs P(a)… and stops at the first T (witness in success), final value T.
- `scope-bracket-grow`: formula ∀x(P(x)∧Q(x,y))∨R(y); bracket grows over P(x)∧Q(x,y); x marked bound,
  y free, underlined.
- `all-vs-wrong-conj`: 4-element world (a,b,c,d) with A = {a,b}, B = {b,c}; ∀x(A→B) evaluates T per
  element; the wrong ∀x(A∧B) fails on c (non-A) — danger flash, final verdict.
- `some-vs-wrong-imp`: same world; ∃x(A∧B) true at a (witness success); wrong ∃x(A→B) true at c (non-A
  makes A→B vacuously true) — warning; verdict.
- `order-grid-forall-exists`: 3×3 grid, rows x, columns y, marks of R; ∀x∃y = every row has a mark;
  ∃y∀x = one full column; both marked, then the converse fails on a second grid.
- `negation-push-ladder`: ¬∀x∃y(P(x)→Q(y)) → ∃x¬∃y(...) → ∃x∀y¬(...) → ∃x∀y(P(x)∧¬Q(y)), one line per
  step, each pushed quantifier highlighted.
- `translate-phrase-by-phrase`: "Some boys in the class are taller than all the girls" → ∃x(boy(x) ∧
  ∀y(girl(y) → taller(x,y))), phrase chips light in order; the wrong pairing shown struck through.
- `unique-exists-unique`: ∃!xP(x) unpacked: exists chip + "at most one" chip ∀x∀y(P(x)∧P(y)→x=y) on a
  3-element world with two P's turning danger.

### Practice themes (≥ 10; ids nx-dm-02-01-qNN)
translation both ways; wrong-pairing traps; ∀/∃ evaluation on small domains; free vs bound; nested
order; ∃! and at-least/at-most n; negation push-through; number predicates (prime/divides); MCQ keys
spread over A–D, mix of MCQ/MSQ/NAT.

---

## Lesson 2 · `dm-02-02-quantifier-laws-validity` · Quantifier laws, validity and models

**Prerequisites:** `predicates-quantifiers`.
**Covered by sets:** A 37–43, B 172–177 (halves), C 311–318, D 679–681. GAP (no set covers it):
Bernays–Schönfinkel small-model property and infinite-only models — from Enderton, *A Mathematical
Introduction to Logic*.

### Teaching sequence (block ids)
1. **Interpretations, models, validity** `#interpretation-def` (domain + meaning of every predicate),
   `#model-def` (interpretations making φ true), `#satisfiable-valid-unsat` (some / all / no
   interpretation). **Trap** `#trap-nonempty-domain`: ∀xP→∃xP needs a non-empty domain (errata A 28/31,
   A 42, B 172). A formula with no free variables is a **sentence** (closed); its truth depends only on
   the interpretation.
2. **Equivalence laws** `#law-forall-and` (∀x(P∧Q) ≡ ∀xP ∧ ∀xQ), `#law-exists-or` (∃x(P∨Q) ≡ ∃xP ∨ ∃xQ) —
   theorems + proofs on a 3-element world. Scene `law-checked-on-world` (each law checked cell by cell on
   D = {a,b,c}). **Not laws** `#not-law-forall-or`, `#not-law-exists-and`: ∀(P∨Q) ≠ ∀P∨∀Q,
   ∃(P∧Q) ≠ ∃P∧∃Q with the counter-model on U = {1,2} (P(1)=Q(2)=T). Scene `one-way-law-countermodel`
   (counter-model built element by element until the failing assignment appears).
3. **The five one-way laws** `#one-way-laws` (theorem): ∀xP→∃xP (non-empty domain); (∀xP∨∀xQ)→∀x(P∨Q);
   ∃x(P∧Q)→∃xP∧∃xQ; ∀x(P→Q)→(∀xP→∀xQ); ∃y∀xP(x,y)→∀x∃yP(x,y) — each with a one-line proof and a
   counter-model for the converse. Scene `exists-forall-implies-grid` (grid: one full column ⇒ every row
   marked; converse fails). Trap: reading → as equivalence.
4. **Moving quantifiers past a formula without the variable** `#null-quantification` (the 8 laws, both
   directions for ∧/∨, the → one-ways). Scene `quantifier-past-free-formula`.
5. **Prenex form** `#prenex-def`: pull quantifiers to the front, renaming to avoid capture; derivation.
   Scene `prenex-ladder`.
6. **Counter-model search** `#countermodel-search`: on domains of size 1, 2, 3 enumerate interpretations
   until one falsifies φ — how GATE "which is valid" is decided. Scene `countermodel-search` (table
   filling over all 2-element interpretations until the falsifying row).
7. **Infinite models** `#infinite-models`: a sentence with only infinite models (the 1991 PYQ: a serial,
   antisymmetric, transitive, irreflexive relation forces an infinite chain); satisfiable e.g. (ℕ, <).
   Scene `infinite-models-chain` (growing chain a₁→a₂→a₃→… with no repeat possible).
8. **Bernays–Schönfinkel** `#bs-class`: ∃*∀* quantifier-free sentences have the small-model property
   (model of size ≤ 3 if any model of size 7 exists) — the 2018 PYQ. Proof sketch via picking witnesses.
9. **Horn clauses / logic programs** `#horn-def`: A(x) ← B(x,y), C(y) means ∀x∀y((B(x,y)∧C(y))→A(x));
   ¬B(x,x) is a negative fact. Scene `horn-forward-chain` (forward chaining derives A(d) from B(d,c),
   C(c)).
10. **Induction as a first-order axiom** `#induction-axiom`: (P(0) ∧ ∀x(P(x)→P(x+1))) → ∀xP(x) over ℕ —
    valid; the wrong-direction variants are not (2025 PYQ). Note: finite-domain search cannot prove it;
    proved in the lesson, checked on all domains up to size 3 with the boundary convention noted.
11. **Rules of inference for quantifiers** `#quantifier-inference`: UI, UG, EI, EG + the order restriction
    (instantiate existentials before generalising) — used in FOL syllogisms.
12. **Lab**: `:::lab{#lab-quant-models lab="quantifier-lab" tab="models"}` in "Try it".
13. Recaps per section; 4+ examples per concept.

### PYQ → block map (16)
| PYQ | tests |
|---|---|
| cse-1991-b-15-b | infinite-models,satisfiable-valid-unsat |
| cse-1992-a-2-xv | one-way-laws,not-law-forall-or |
| cse-2003-cs-32 | one-way-laws |
| cse-2003-cs-33 | interpretation-def,model-def |
| cse-2003-cs-71 | horn-def |
| it-2005-cs-36 | one-way-laws |
| it-2006-cs-21 | satisfiable-valid-unsat |
| it-2007-cs-21 | one-way-laws,order laws |
| it-2008-it-21 | null-quantification |
| cse-2013-cs-47 | negation-laws,null-quantification |
| cse-2015-2-cs-55 | law-equivalence-inside-quantifiers |
| cse-2016-2-cs-27 | not-law-forall-or |
| cse-2017-1-cs-2 | one-way-exists-forall,order laws |
| cse-2018-cs-28 | bs-class |
| cse-2020-cs-39 | null-quantification |
| cse-2025-2-cs-5 | induction-axiom |

### Scenes (`_viz_ch2_l02.py`)
- `law-checked-on-world`: D = {a,b,c}; ∀x(P∧Q) vs ∀xP∧∀xQ checked per element (success cells), equal.
- `one-way-law-countermodel`: U = {1,2}; assignments of P(1),P(2),Q(1),Q(2) fill a table until
  P(1)=Q(2)=T, P(2)=Q(1)=F falsifies ∀(P∨Q) ≡ ∀P∨∀Q (danger).
- `exists-forall-implies-grid`: grid where one full column (y=b) gives ∃y∀x; then a grid where every row
  has a mark but no full column — converse fails.
- `quantifier-past-free-formula`: ∀x(P(x)∨A) ≡ ∀xP(x)∨A shown step by step with A quantifier-free.
- `prenex-ladder`: ∃x∀y(P(x)∨Q(y)) → ... → prenex, renaming step highlighted.
- `countermodel-search`: all interpretations of P over a 2-element domain tabulated until the falsifying
  one for a sample non-valid formula.
- `infinite-models-chain`: R-chain a₁→a₂→a₃→… built step by step; antisymmetry + irreflexivity + seriality
  force all distinct.
- `horn-forward-chain`: facts B(d,c), C(c), ¬B(x,x); rule A(x)←B(x,y),C(y); derive A(d) in steps.

### Practice themes (≥ 10; ids nx-dm-02-02-qNN)
valid vs not (counter-models on 2-element domains); equivalence laws vs one-ways; moving quantifiers
past quantifier-free parts; prenex; models/satisfiable on named interpretations; Horn programs; induction
axiom direction; MCQ keys spread A–D, mix of MCQ/MSQ/NAT.
