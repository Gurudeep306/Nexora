# Chapter 1 plan: C foundations: values, control flow and functions

Internal planning file (the build skips it). House style as in `content/gate-notes/_style.md` and the
finished Digital Logic course: the full arc for every concept (intuition → definition → why → how → what
goes wrong), an `:::intuition` before every new idea, at least 4 step-format worked examples per "Worked
examples" section (easy → medium → GATE-level → "Edge case:"), `:::theorem` + `:::proof` or `:::derivation`
for every rule GATE uses, a recap `:::note` after each concept section, an animated viz on every lesson,
every top-level block with an `#id` and a `depth`. Lessons are 7–10k words.

- Folder: `content/gate-notes/pds/01-c-foundations/`; frontmatter `chapter: c-foundations`.
- Conventions (whole course, `_outline.md`): ISO C (C11) on a 64-bit machine: char 1, short 2, int 4,
  long 8, pointers 8 bytes, two's complement, `char` signed. Older PYQs that assume a 2-byte int say so, and
  the lesson points it out. Undefined behaviour (UB), unspecified and implementation-defined behaviour are
  named precisely, never called "compiler dependent".
- Every C statement of fact, every PYQ key, every worked-example number and every practice answer is
  produced by compiling and running real C with the system compiler (`common.run_c`, `cc -std=c11 -O0` in a
  fresh temporary directory; `-fsanitize=undefined` to demonstrate UB). Pascal, FORTRAN and pseudo-code PYQs
  are re-derived in Python from the stated language rules (or translated to C and compiled when the
  semantics coincide). One check per lesson: `l1_NN_<slug>.py`.
- Solutions: `_sol_ch1_lNN.py` (teacher-style v2: "Concept tested: …", steps with code/table scenes,
  optionAnalysis for every option, pitfalls, verification or shortcut); `python3 _sol.py 1` writes
  `src/gate/solutions`; `pyq_ch1.py` checks them; `scripts/gate/validate-solutions.mjs` validates.
- Viz: `_viz_ch1_lNN.py` registering on `chapterlib.REG[1]` (two layouts, captions on every step;
  values computed in the generator and asserted); `python3 _viz.py 1` writes `pds/viz/`; `viz_ch1.py`
  checks.
- Practice: ≥ 8 (we write 10) per lesson in `practice.json`, ids `nx-pds-01-NN-qMM`, MCQ/MSQ/NAT mixed,
  MCQ keys spread over A–D across the chapter; every answer verified by a C run in the lesson check.
- **Live Lab: C Tracer** (`:::lab{lab="c-tracer" tab="trace"}` and `tab="expr"`): the shared C lab
  (`client/src/gate/notes/labs/CLab.tsx`) on the `cLogic.ts` interpreter, whose output is tested against
  cc on every program of `_checks/pds/lab_corpus.py` (chapter-1 presets: integer division, promotion,
  short circuit, increments, bitwise characters, shifts, ternary, unsigned strlen, char wrap, comma, switch,
  dangling else, loops, GCD, fast power, Horner, digit loops, static counters, scope, call by value,
  macros). Lessons 1 (expr), 2 (trace), 4 (trace) and 5 or 6 embed it.
- Sources: our own text; facts checked against the C11 standard (n1570), Kernighan & Ritchie (2nd ed.),
  Sethi *Programming Languages: Concepts and Constructs* and Pratt & Zelkowitz (scope, parameter passing),
  Aho, Lam, Sethi & Ullman (activation records, linkers), Levine *Linkers and Loaders*. Errata used: X4, X5,
  B 233–234, C 260–265, C 282–283, C 299–305, E 543–545 (see `_errata/pds.md`).

| # | Lesson id | Title | PYQs | Time |
|---|---|---|---|---|
| 1 | `pds-01-01-types-operators` | Types, operators and expressions | 11 | 65 min |
| 2 | `pds-01-02-control-flow` | Control flow and loop tracing | 12 | 60 min |
| 3 | `pds-01-03-loop-algorithms` | Loop algorithms, invariants and correctness | 16 | 70 min |
| 4 | `pds-01-04-storage-classes` | Functions, storage classes and lifetime | 13 | 60 min |
| 5 | `pds-01-05-scope-binding` | Scope: blocks, static and dynamic scoping | 7 | 45 min |
| 6 | `pds-01-06-parameter-passing` | Parameter passing: value, reference, value-result, name; macros | 9 | 55 min |
| 7 | `pds-01-07-language-toolchain` | Paradigms, structured programming and the toolchain | 10 | 35 min |

Files `NN-<slug>.md` with frontmatter `id: <slug>`.

## Lesson 1 · `pds-01-01-types-operators` (11 PYQs)
Radar. Where this fits. Sequence:
1. Types as fixed-width boxes `#types-intuition`, `#int-types` (sizes table on the course model, ranges,
   signed/unsigned), `#range-theorem` + `#proof-range` (n-bit two's complement range −2ⁿ⁻¹ … 2ⁿ⁻¹ − 1,
   unsigned 0 … 2ⁿ − 1), `#char-is-int` (char is a 1-byte integer; ASCII anchors 48/65/97; `'A'` has type int
   in C), `#constants` (decimal, octal, hex, char, suffixes; trap `#trap-octal` 011 = 9, 098 is an error),
   recap.
2. Integer arithmetic `#division-intuition`, `#int-division` (truncation toward zero, % takes the sign of
   the dividend) + `#division-identity` theorem/proof ((a/b)·b + a%b = a), `#unsigned-wrap` (modulo 2ⁿ,
   defined) vs `#signed-overflow` (UB), `#overflow-order` (keep intermediates small, exact early division:
   2014 nC3), recap. Worked examples (4).
3. Conversions `#conversion-intuition`, `#promotion` (integer promotion), `#usual-conversions` (common
   type; the signed→unsigned trap `#trap-signed-unsigned`: −1 < 1u is false; size_t from strlen: 2017),
   `#float-int` (truncation; 7/2 vs 7/2.0), recap. Worked examples (4).
4. Operators `#operators-intuition`, `#precedence-table` (full table; reading strategy: unary > * / % > + − >
   shifts > relational > equality > & > ^ > | > && > || > ?: > assignment > comma), `#relational-logical`
   (results are int 0/1; chained comparisons; `x & 1 == 0` trap), `#incdec` (pre/post: 2017),
   `#assignment-expr` (assignment is an expression; compound assignment; right-to-left grouping),
   `#ternary` (2008, nesting, right associativity), `#bitwise` (& | ^ ~, masks, shifts as ×/÷ 2ᵏ; the
   bit-length theorem `#bit-length` + proof: the shift loop runs ⌊log₂ n⌋ + 1 times: 2014; 2022 ASCII),
   `#comma-op`, `#sizeof-op` (does not evaluate its operand), recap. Worked examples (4+4).
5. Evaluation order and side effects `#order-intuition`, `#short-circuit` (&&, ||, ?: evaluate left
   first and may skip; 2021) with theorem `#sc-theorem` (the right operand is evaluated iff …), 
   `#sequence-points` (sequence points; unsequenced modification is UB: `i = i++`; argument order is
   unspecified: 2024 states right-to-left) `#ub-catalogue` (table: UB vs unspecified vs implementation-
   defined), `#trap-compiler-dependent`, recap. Worked examples (4).
6. Booleans across languages `#pascal-boolean` (1991: `y := x > 5`; FORTRAN 1993: `**` before unary minus,
   integer division).
7. Lab `#lab-expr` (c-tracer, tab expr). PYQs. Practice (10). Summary.
Viz: `expr-tree-eval` (animate: parse tree of a mixed expression built by precedence, then evaluated
bottom-up with promotions), `unsigned-wheel` (animate: the 3-bit unsigned/signed number circle; 3 − 5
wrapping), `short-circuit-loop` (animate: the 2021 loop, iteration by iteration), `shift-halving`
(animate: 435 shifting right with the count).
PYQ → blocks: cse-1991-a-4-i → pascal-boolean, relational-logical; cse-1993-a-2-5 → precedence-table,
pascal-boolean, int-division; it-2004-it-15 → int-division, ub-catalogue; cse-2008-cs-18 → ternary;
cse-2014-2-cs-10 → bitwise, bit-length; cse-2014-2-cs-11 → unsigned-wrap, overflow-order; cse-2017-1-cs-53 →
usual-conversions, trap-signed-unsigned; cse-2017-2-cs-54 → incdec; cse-2021-1-cs-37 → short-circuit,
sc-theorem, incdec; cse-2022-cs-34 → char-is-int, bitwise; cse-2024-2-cs-3 → sequence-points.

**Key audit (lesson 1, all compiled):** every key confirmed. Notes: it-2004-it-15 option D computes `1 % 0`
for x = 0, which is UB (arm64 quietly yields 1, x86-64 traps); the lesson says so. cse-2017-1-cs-53 says
size_t is `unsigned int`; on 64-bit it is `unsigned long`, same answer (3). cse-2024-2-cs-3: cc on the
build machine evaluates arguments left to right (10201020); the question's stated right-to-left order
gives the key 20101020. cse-1993-a-2-5 keeps its review flag explanation (linear statement → 11).

## Lesson 2 · `pds-01-02-control-flow` (12 PYQs)
Radar. Intuition (a road map with junctions and roundabouts). Sequence: `#if-else` (any non-zero is
true; braces; `#dangling-else` theorem: an else binds to the nearest unmatched if, 1995 Pascal), `#switch`
(integral controlling expression, constant case labels, fall-through, default anywhere, break; 2012,
2015-3-48 with the integer arithmetic of `j = 2*3/4 + 2.0/5 + 8/5`), loops `#while`, `#do-while`,
`#for` (equivalence of for and while; comma in for; empty bodies), `#repeat-until` (Pascal `repeat S until
B` ≡ `S; while not B do S`: 1991), `#break-continue`, `#goto` (aside). Counting iterations:
`#count-arith` (arithmetic progressions: ⌊(b − a)/s⌋ + 1), `#count-halving` theorem + proof (halving and
doubling loops: ⌊log₂ n⌋ + 1; 2018 unsigned long nested logs: log log), `#nested-loops` (sums of the
inner counts; 2013 closed form k = (n/2 + 1)·⌊log₂ n⌋·⌊n/2⌋; 2006 j = sum of halvings), `#float-loops`
(2019: the loop on floats, exact because powers of two), `#infinite-loops` (2024-1-8: a never reaches 10),
`#loop-tracing` method (trace tables; 2014-1-41 maximum subarray brute force; IT 2007 run-sum variant;
2003-88 sieve-like marking: prints the primes? derive). Worked examples ≥ 4 per section.
Lab: `#lab-trace` (c-tracer, trace). Viz: `switch-fallthrough` (animate), `halving-loop-count`
(animate), `nested-loop-grid` (animate). Practice 10.

## Lesson 3 · `pds-01-03-loop-algorithms` (16 PYQs)
Radar. Intuition (a promise that every lap keeps). `#invariant-def` (invariant, initialisation,
maintenance, termination; postcondition), `#invariant-theorem` + proof (the loop-correctness theorem: an
invariant that holds initially and is preserved, plus the exit condition, implies the postcondition),
`#termination` (a variant that decreases and is bounded). Classic loops each with invariant + proof:
`#gcd-subtraction` (1995, 2004-41, 2025-2-23: gcd(x, y) unchanged by x − y), `#gcd-remainder` (aside),
`#fast-power` (2016-2-35 invariant res·aᵇ = Xʸ; 2020-48 binary exponentiation pp(3,4) = 81; 1994 is in
Ch 3), `#horner` (2021-1-48: 2¹⁰ − 1 = 1023), `#digit-loops` (2004-32 reverse digits invariant; 2025-1-53
alternate digits), `#division-loop` (2015-1-33, 2017-2-37: x = q·y + r ∧ r < y; unsigned and y > 0
conditions), `#sqrt-loops` (1991-3-viii: smallest i with i² > N, ⌊√N⌋ + 1; 2004-42 Newton/Heron
square root), `#series-loops` (2003-1: eˣ), `#swap-arith` (1993 a := a + b …: swaps; fails for aliases and
overflow), `#closed-forms` (2024-1-38: x after y iterations of x = 2x + y: closed form (x + y)·2ʸ − y),
`#loop-invariant-1991` (i mod 2 = 0 invariant). Worked examples ≥ 4 per section. Viz: `gcd-staircase`
(animate), `fast-power-trace` (animate), `horner-chain` (animate). Practice 10.

## Lesson 4 · `pds-01-04-storage-classes` (13 PYQs)
Radar. Intuition (a hotel: rooms per guest (stack) vs the permanent lobby (data segment)).
`#functions` (definition, declaration, prototype; `#implicit-decl` C89 implicit int and why 2005 errors;
2016-1-12 type checking of arguments: `f(i, *p)` is fine), `#activation-records` (what a call pushes;
returning a value; 2019 jumble, 2025-2-53 g(f(n))), `#storage-classes` (auto, static, extern, register;
table scope × lifetime × storage × initial value), `#static-local` theorem (initialised once, before the
program runs; value persists: 2000-2-20, 2012-48/49, 2015-3-54, 2017-1-55, 2019-27, 2023-25, IT 2004-59),
`#memory-segments` (text, data, bss, heap, stack), `#static-stack` (2015-2-38 stkFunc: the static
stkTop shadows the global one). Worked examples ≥ 4. Lab `#lab-static` (c-tracer, trace on
static-vs-auto). Viz: `static-vs-auto-frames` (animate), `memory-segments` (animate). Practice 10.

## Lesson 5 · `pds-01-05-scope-binding` (7 PYQs)
Radar. Intuition (looking a word up: the nearest dictionary first). `#scope-def` (scope vs lifetime),
`#block-scope` (shadowing; 2026-1-24 prints 9; IT 2008-51 inner i), `#redeclaration` (2026-2-9: P1 ok
(global + local), P2 and P3 errors), `#static-scoping` (lexical: resolve in the defining environment),
`#dynamic-scoping` (resolve in the most recent caller; 1991-b-9-b; 2001-a-44 with reference parameters;
1993 PARAM scope of m), `#static-vs-dynamic` theorem + proof (they agree when no non-local names are
redeclared on the call path), C uses static scope (2003-89 with pointers). Worked examples ≥ 4. Viz:
`scope-lookup` (animate: the same call resolved statically and dynamically). Practice 10.

## Lesson 6 · `pds-01-06-parameter-passing` (9 PYQs)
Radar. Intuition (a photocopy, the original, a sticky note telling you where to look again).
`#by-value`, `#by-reference`, `#by-value-result`, `#by-name` (thunks), `#aliasing` (2000-1-16),
`#mechanisms-compared` theorem (they differ only with aliasing or non-local side effects) + proof by the
four memory panels, Pascal programs 1991-b-9-a (value / reference / name), 1993 PARAM (7.1, 7.2), 1995
FIND (value parameter of type real), 1998 side effect f(x)·f(x) = 42 (with reference: 6 × 7), 2001-a-42
call by reference with aliasing; `#swap-c` (2004-2: a swap by value cannot work); `#macros` (textual
substitution; IT 2008-50 swap1 macro; parenthesisation). Worked examples ≥ 4 per section. Lab
`#lab-macros` (c-tracer trace: macro-swap). Viz: `four-mechanisms` (animate). Practice 10.

## Lesson 7 · `pds-01-07-language-toolchain` (10 PYQs)
Radar. Intuition (a book's journey: draft → typeset → bound → shelved). `#paradigms` (2004-90 matching),
`#structured-programming` (2004-1), `#type-systems` (2003-24), `#preprocessor` (macros, conditional
expansion 1997-9), `#assembler` (two passes; first pass builds the symbol table and assigns addresses:
1993-7-6; location counter), `#linker-loader` (object modules, relocation, external symbols: 1994-40-b
false; 1995-14), `#macro-vs-subroutine` (1994-40-a true; 1995-11 x and y are formal parameters),
`#coroutines` (1994-39-a false). Worked examples ≥ 4. Viz: `toolchain-pipeline` (animate). Practice 10.
