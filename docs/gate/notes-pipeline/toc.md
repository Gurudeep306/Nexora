# Theory of Computation (`toc`): build plan

**State today:** nothing written. Start at N0. PYQs: **306** (`toc/regular` 143,
`toc/cfg` 93, `toc/tm` 55, `toc/pumping` 13, `toc/turing` 2; 27 flagged
`needsReview`, 42 with figures). Note `toc/turing` (2) vs `toc/tm` (55): treat
both as Turing machines in the outline; do **not** rename bank topics.

**Official GATE CSE syllabus (verify against the current PDF):** regular
expressions and finite automata; context-free grammars and push-down automata;
regular and context-free languages, pumping lemma; Turing machines and
undecidability.

**Prerequisites from other subjects:** `dm` sets, relations, functions,
countability (diagonal argument), proof by induction and contradiction.
**Feeds into:** `cd` (lexical analysis = regular languages; parsing = CFGs).
Link both ways.

## Suggested chapter structure (confirm or improve in N1 from the PYQs and sets)

| # | Chapter | Main topics |
|---|---|---|
| 1 | Foundations | Alphabets, strings, languages, operations on languages, Kleene star; countable vs uncountable; how GATE asks TOC |
| 2 | Finite automata | DFA, NFA, ε-NFA; subset construction; ε-closure; minimisation (table-filling and partition refinement); Mealy/Moore; product construction (union, intersection, difference); counting states for "divisible by n", "k-th symbol from the end", substring conditions |
| 3 | Regular expressions and regular languages | Regex ↔ ε-NFA (Thompson), DFA → regex (state elimination, Arden's theorem); regular grammars; closure properties; decision properties; identities of regular expressions |
| 4 | Non-regular languages | Pumping lemma (as an adversary game), Myhill–Nerode (equivalence classes = states), common non-regular languages |
| 5 | Context-free grammars | Derivations, parse trees, ambiguity; simplification (useless, ε, unit productions); CNF and GNF; CYK membership |
| 6 | Pushdown automata and CFLs | PDA (by final state and empty stack), CFG ↔ PDA, DPDA vs NPDA, DCFLs; CFL pumping lemma; closure and decision properties of CFLs and DCFLs |
| 7 | Turing machines | TM definition and design (unary/binary arithmetic, copy, palindromes), variants (multi-tape, nondeterministic) and their equivalence, recursive and RE languages, enumerators, Chomsky hierarchy, LBA and CSLs |
| 8 | Decidability | Universal TM, halting problem by diagonalisation, reductions, Rice's theorem, decidable/undecidable problems about regular, CF and RE languages (the GATE "table"), closure of recursive/RE under operations, Post correspondence problem |

## Live Labs (build in N3; register in `index.ts` and `LAB_TABS`)

| Lab id | Chapter | Tabs | What the reader does |
|---|---|---|---|
| `automaton-lab` | 2 | `dfa`, `nfa`, `product` | Draw or type a DFA/NFA (states, transitions, start, accept); run a string step by step (current state highlighted, ε-closures shown); product of two DFAs for ∪/∩/− |
| `subset-lab` | 2 | `subset`, `minimise` | NFA → DFA subset construction one subset at a time; DFA minimisation by table filling with the reason for each mark, then merged states |
| `regex-lab` | 3 | `thompson`, `eliminate`, `test` | Regex → ε-NFA (Thompson) piece by piece; DFA → regex by state elimination; test strings against a regex with the matching path |
| `pumping-game` | 4 | `regular`, `cfl` | Play the pumping-lemma adversary game: you pick the string, the "opponent" picks the split, you pick i, and the lab shows the pumped string leaving the language |
| `grammar-lab` | 5 | `derive`, `cnf`, `cyk` | Leftmost/rightmost derivation and parse tree side by side; two parse trees for an ambiguous string; CNF conversion steps; CYK table filled cell by cell |
| `pda-lab` | 6 | `run`, `cfg-to-pda` | Run a PDA on input with the stack animating (push/pop per move), nondeterministic branches listed; CFG → PDA |
| `tm-lab` | 7 | `run`, `library` | Run a TM on a tape (head moves, writes, state changes), step/back/play; a library of the classic machines (a^n b^n, palindromes, unary add/multiply, binary increment) |

Viz engine upgrades needed first (see `animations.md` §3): **`state`, `loop`,
`tape`, `stack`**, and `tree` (or node+arrow) for parse trees.

## Animations every lesson set must include (≥ 6 per lesson; this list is the floor)
- A DFA consuming a string symbol by symbol, the tape head moving and the
  current state lit; acceptance/rejection at the end.
- An NFA run as a *set* of current states; ε-closure expanding.
- Subset construction: the table of subsets growing row by row, with the new DFA
  drawn alongside.
- Minimisation: the pair table marked round by round (with the distinguishing
  string shown for each mark), then states merging.
- Product construction for union/intersection.
- "Divisible by n" DFA: remainder states, transitions computed as (2r + b) mod n.
- Thompson's construction building an ε-NFA from a regex, operator by operator.
- State elimination removing one state at a time with the new regex labels.
- Arden's theorem solving equations step by step.
- Pumping lemma: the string split into x y z, y pumped, and the count breaking.
- Myhill–Nerode: strings sorted into classes by a distinguishing suffix.
- Leftmost and rightmost derivations side by side; the parse tree growing.
- Ambiguity: two different parse trees for the same string, highlighted.
- CNF conversion stage by stage (ε, unit, useless, then binarisation).
- CYK table fill (diagonal by diagonal), with the cell's derivation shown.
- PDA run: the stack pushing/popping, input consumed, configuration (q, w, γ).
- CFG → PDA and the correspondence of steps.
- Turing machine runs: a^n b^n c^n marking, binary increment, palindromes.
- Multi-tape → single-tape simulation (tracks and head markers).
- Diagonalisation table for the halting problem; reduction arrows between
  problems; Rice's theorem's two-property picture.
- The Chomsky hierarchy as nested regions, languages dropped into the right
  region one at a time; closure-property tables filled in.

## Verification (`_checks/toc/`)
Write a small automata library `toclib.py`: DFA/NFA/ε-NFA, run, subset
construction, minimisation (Hopcroft), product, regex parser and Thompson,
state elimination, CFG utilities (nullable, unit, useless, CNF, CYK), PDA
simulator (bounded), TM simulator (bounded steps). Every DFA/regex/grammar in a
lesson is checked by **enumerating all strings up to length 8–10** and comparing
languages. Every minimal-DFA state count in a PYQ is recomputed. Decidability
"tables" are checked against a single source of truth in the script.

## Textbooks and free sources (fact-checking only)
Hopcroft–Motwani–Ullman, *Introduction to Automata Theory, Languages and
Computation*; Sipser, *Introduction to the Theory of Computation*; Linz, *An
Introduction to Formal Languages and Automata*; Kozen, *Automata and
Computability*; NPTEL Theory of Computation; Jeff Erickson's *Models of
Computation* notes (free); Stanford CS103 notes (free).

## Traps the PYQs keep testing (make each a `:::trap`)
Minimal DFA counts the dead state; "k-th from the end" needs 2^k states in a DFA
but k+1 in an NFA; regular ∩ CFL is CFL but CFL ∩ CFL may not be; complement of
a CFL may not be CFL, of a DCFL is DCFL; every finite language is regular;
a subset of a regular language need not be regular; pumping lemma only proves
non-regularity, never regularity; ambiguity is a property of the grammar,
inherent ambiguity of the language; L = {a^n b^n} needs a stack, {a^n b^n c^n}
is not CF; recursive vs RE (complement of RE that is not recursive is not
RE); Rice's theorem is about non-trivial properties *of the language*, not the
machine; emptiness is decidable for CFGs but equivalence is not.
