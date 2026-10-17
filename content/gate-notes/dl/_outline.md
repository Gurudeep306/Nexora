# Digital Logic: master syllabus map (Checkpoint A, status: review)

Internal planning file (the build skips it). It was produced by Stage 2 of the GATE Notes build.
Reference sets are labelled A–E only. Nothing here is published.

## How this map was built
The map is the union of three sources:
1. **Official GATE CSE syllabus, Digital Logic:** Boolean algebra; combinational and sequential
   circuits; minimisation; number representations and computer arithmetic (fixed and floating
   point). The GATE 2027 revision (IIT Madras) is reported to name the minimisation techniques
   explicitly (algebraic, K-map, tabular) and to list "design of combinational and sequential
   circuits" as its own objective. The official PDF site returned HTTP 503 on 2026-10-16, so this
   was checked only against secondary summaries; **re-verify against the official PDF before
   publishing.** The tabular (Quine–McCluskey) method therefore gets a full lesson (`dl-03-03`).
2. **Everything any reference set covers** (digests in `_digest/dl/`, internal).
3. **Everything the 304 dl PYQs test** (`src/gate/questions.json`, read together with the v2
   solutions' `concepts` and `approach` fields).

**Ids:** planning id `dl-NN-MM-slug` ↔ file `NN-chapter/MM-slug.md`, with frontmatter `id: slug`.
The pipeline requires the frontmatter id to equal the file slug, so slugs are unique across the
subject. **Sets:** A–E (internal). A lesson marked **GAP** is not covered well by any set and is
written from textbooks (Mano, *Digital Design*; Mano, *Computer System Architecture*; Hamacher
for Booth/array multipliers; Goldberg's note for IEEE-754). **`pyq_topics`** use the
questions.json `subject/topic` keys.

## Chapter overview
| # | Chapter | Folder | Lessons | PYQs | Est. time |
|---|---|---|---|---|---|
| 1 | Number systems, codes and floating point | `01-number-systems` | 8 | 65 | 7 h 25 min |
| 2 | Boolean algebra and logic gates | `02-boolean-algebra-gates` | 6 | 64 | 4 h 55 min |
| 3 | Minimisation | `03-minimisation` | 4 | 39 | 3 h 55 min |
| 4 | Combinational circuits | `04-combinational-circuits` | 6 | 38 | 4 h 10 min |
| 5 | Arithmetic circuits | `05-arithmetic-circuits` | 4 | 35 | 3 h 45 min |
| 6 | Latches, flip-flops and sequential analysis | `06-latches-flip-flops` | 3 | 24 | 2 h 45 min |
| 7 | Counters, registers and FSMs | `07-counters-registers-fsms` | 5 | 35 | 4 h 10 min |
| 8 | Beyond the core syllabus | `08-beyond-syllabus` | 3 | 4 | 1 h 20 min |
| | **Total** | | **39** | **304** | **32 h 25 min** |

Foundation-first order: number representations (Ch 1: bases, fixed point, complements, then
floating point and IEEE-754, which need only biased exponents and binary fractions, then codes)
→ gates and algebra (Ch 2) → minimisation (Ch 3) → combinational blocks (Ch 4) → arithmetic
circuits, which use adders, signed numbers and MUX/XOR (Ch 5) → storage elements (Ch 6) →
counters, registers and FSMs, which use flip-flops and K-maps (Ch 7). Ch 8 is optional enrichment
from Set C and older PYQs. (Floating point was Chapter 8 until 2026-10-17; the owner asked for
IEEE-754 early, inside Chapter 1, so it now follows signed numbers and precedes codes.)

---

## Chapter 1 · Number systems, codes and floating point (`01-number-systems`), the pilot
Live Lab: **Number Lab**: a base converter with step replay (any base, fractions, grouping), a
signed-width explorer with the 2's-complement wheel, fixed point, and codes (BCD, excess-3, Gray,
Hamming), plus an IEEE-754 tab (float ↔ hex ↔ bits, special-value badges, ulp). The detailed plan is in
`01-number-systems/_plan.md`.

### dl-01-01-place-value · Place value and changing bases
- Prerequisites: none
- Sub-topics: positional value and the digit limit; base → decimal (expansion, Horner); decimal →
  base (repeated division, uniqueness proof); base → base; digit counts (⌊log_b N⌋ + 1, bits for
  k decimal digits); unknown-radix equations; counting (x, y) solutions under digit limits;
  identities valid in every base
- Sets: A 8–14; B 138–141; C 202–207; D 402 (digit count)
- pyq_topics: dl/number
- PYQs (11; number): `cse-1993-ii-a-6-5`, `cse-1997-a-39`, `cse-2004-cs-19`, `cse-2008-cs-6`, `cse-2014-1-cs-8`, `cse-2014-2-cs-8`, `cse-2015-3-cs-35`, `cse-2017-2-cs-24`, `cse-2021-1-cs-6`, `cse-2023-cs-22`, `cse-2024-2-cs-39`
- Time: 55 min
- Diagrams/animations: place-value strip (animated accumulate, base toggle); odometer roll-over;
  repeated-division ladder; Horner chain; radix-solution grid
- Practice themes: conversions; find the base; count solutions; digit counts
- Gaps: solution counting with digit limits (only by example in the sets)

### dl-01-02-power-of-two-bases · Binary, octal and hex: grouping and arithmetic
- Prerequisites: dl-01-01
- Sub-topics: the grouping theorem (k-bit groups from the point); octal ↔ hex via binary; base 4;
  powers-of-16 sums read as hex; popcount per hex digit; add, subtract and multiply in base b
- Sets: A 8–14; B 138–140; C 203–208 (incl. binary add/sub/mul/div)
- pyq_topics: dl/number
- PYQs (7; number): `cse-1991-a-1-iii`, `cse-1995-a-37`, `it-2004-it-43`, `cse-2005-cs-17`, `it-2005-cs-47`, `cse-2009-cs-5`, `cse-2017-2-cs-1`
- Time: 45 min
- Diagrams/animations: grouping slider (brackets snap from the point, padding fades in);
  octal → binary → hex bridge; hex nibble table; base-8 carry column
- Practice themes: grouping conversions; 1s counting; base-b arithmetic
- Gaps: arithmetic in base 8/16 (thin)

### dl-01-03-fractions-fixed-point · Fractions and fixed-point numbers
- Prerequisites: dl-01-01, dl-01-02
- Sub-topics: fraction → base b by repeated multiplication; mixed numbers; the terminating vs
  recurring theorem; truncation error; unsigned fixed point (range [0, 2ⁱ − 2^{−f}],
  resolution); the representability test; signed Q-format (brief)
- Sets: A 8–14 (fractions), 21–22 (fixed point); B 150; C 203–207 (fractions)
- pyq_topics: dl/number
- PYQs (5; number): `cse-2002-a-14`, `it-2007-cs-42`, `cse-2017-1-cs-7`, `cse-2018-cs-33`, `cse-2021-2-cs-18`
- Time: 45 min
- Diagrams/animations: doubling-peel animation (with a recurrence loop); fixed-point ruler with
  an f slider; fixed-point bit weights
- Practice themes: fraction conversion; representability; fixed-point range
- Gaps: **GAP** fixed-point range and resolution (thin in every set)

### dl-01-04-signed-numbers · Signed numbers and complements
- Prerequisites: dl-01-01 … dl-01-03
- Sub-topics: unsigned; sign-magnitude; 1's complement; 2's complement (−2^{n−1} weight,
  invert + 1, copy-to-first-1); ranges and counts; two zeros; decoding; (r−1)'s and r's
  complement in any base; minimum width; sign extension; arithmetic shifts; excess-K; the
  comparison table
- Sets: A 20–21; B 141–146 (most detailed: radix/diminished-radix complements, sign extension); C 208–214; E 405
- pyq_topics: dl/number
- PYQs (16; number): `cse-1994-a-2-7`, `cse-1995-b-66`, `cse-1998-a-17`, `cse-1999-a-42`, `cse-2000-a-1-6`, `cse-2001-a-35`, `cse-2002-a-15`, `cse-2002-a-16`, `cse-2003-cs-9`, `cse-2005-cs-16`, `cse-2010-cs-8`, `cse-2013-cs-4`, `cse-2016-1-cs-7`, `cse-2016-2-cs-9`, `cse-2019-cs-4`, `cse-2025-1-cs-15`
- Time: 80 min
- Diagrams/animations: **the 2's-complement wheel** (SM/1's/2's ring toggle); invert + 1 ripple;
  sign-extension stretch; MSB-weight bar; arithmetic vs logical shift
- Practice themes: encode/decode at width n; ranges; radix complement; sign extension; shifts
- Gaps: arithmetic-shift rules and minimum width (thin; B covers r's and (r−1)'s complements)

### dl-01-05-floating-point-basics · Floating-point representation: formats, normalisation, range
- Prerequisites: dl-01-03, dl-01-04 (biased)
- Sub-topics: scientific notation in base 2 and 16; mantissa/significand, exponent and bias
  (excess-K); normalisation and the hidden bit; custom formats (sign-magnitude mantissa, 2's
  complement exponent, base-16 exponents); range, precision and ulp (gap between neighbours)
- Sets: A 21–23; B 150–152
- pyq_topics: dl/floating
- PYQs (7; floating): `cse-1996-a-25`, `cse-1997-b-72-a`, `cse-2002-b-57-a`, `cse-2002-b-57-b`, `cse-2003-cs-43`, `cse-2005-cs-85a`, `cse-2005-cs-85b`
- Time: 55 min
- Diagrams/animations: floating-point number line with densities (gaps doubling); normalise
  shift animation
- Practice themes: encode in a custom format; range; ulp

### dl-01-06-ieee-754 · IEEE-754 single and double precision
- Prerequisites: dl-01-05
- Sub-topics: the single and double layouts; bias 127/1023; encode and decode; special values (±0,
  ±∞, NaN); denormals; largest and smallest values; reading hex words quickly
- Sets: A 23; B 152–153; D 402–403
- pyq_topics: dl/floating
- PYQs (10; floating): `cse-2008-cs-4`, `it-2008-it-7`, `cse-2012-cs-7`, `cse-2014-2-cs-45`, `cse-2017-2-cs-12`, `cse-2021-1-cs-24`, `cse-2021-2-cs-4`, `cse-2022-cs-31`, `cse-2024-2-cs-4`, `cse-2026-2-cs-24`
- Time: 55 min
- Diagrams/animations: **IEEE-754 bit layout** (clickable fields); special-value map of the
  exponent/fraction plane
- Practice themes: hex ↔ decimal; special values; extremes

### dl-01-07-floating-point-arithmetic · Floating-point arithmetic, rounding and its pitfalls
- Prerequisites: dl-01-06 (the ripple-carry adder of dl-05-01 is mentioned only as hardware context)
- Sub-topics: add/subtract (align, add, normalise, round); multiply/divide (add/subtract
  exponents); multiplying by powers of two; rounding and absorption; non-associativity;
  relative error
- Sets: B 150–153 (brief); no set works an IEEE add/multiply
- pyq_topics: dl/floating
- PYQs (8; floating): `cse-1997-b-72-b`, `cse-1997-b-72-c`, `cse-2000-a-2-14`, `cse-2004-cs-28`, `cse-2020-cs-29`, `cse-2023-cs-35`, `cse-2025-2-cs-39`, `cse-2026-1-cs-26`
- Time: 50 min
- Diagrams/animations: alignment-shift animation; absorption demo (1e30 + 1)
- Practice themes: IEEE add/multiply; rounding order; error
- Gaps: **GAP** rounding modes and the guard/round/sticky bits (textbook)

### dl-01-08-codes · Binary codes: BCD, excess-3, Gray, parity and Hamming
- Prerequisites: dl-01-01, dl-01-02 (⊕ is defined locally by its truth table)
- Sub-topics: weighted vs unweighted codes (8421, 2421, 84−2−1); BCD validity; self-complementing
  codes; excess-3; reflected Gray (construction, conversions, unit distance); Gray successor
  tables; parity; Hamming distance; Hamming(7,4); ASCII (aside)
- Sets: A 15–19; B 146–150 (codes, Gray, Hamming parity bits); C 214–222 (BCD, double dabble, 2421, XS-3, Gray, parity, Hamming (7,4)); E 409 (Gray)
- pyq_topics: dl/number
- PYQs (1; number): `cse-2006-cs-40`
- Time: 60 min
- Diagrams/animations: Gray reflection build; XOR ladder for binary ↔ Gray; rotary Gray disc;
  Hamming(7,4) Venn with flip-a-bit; BCD vs binary
- Practice themes: code conversion; validity; self-complementing; parity-bit counts; syndrome
- Gaps: the minimum-distance theorem and its proof (B and C state the Hamming procedure only)

---

## Chapter 2 · Boolean algebra and logic gates (`02-boolean-algebra-gates`)
Live Lab: **Gate Bench**: drag gates onto a canvas, toggle the inputs and watch the truth table
fill in; a "NAND-only / NOR-only" challenge mode; a minterm-set calculator (AND = ∩, OR = ∪,
XOR = Δ).

### dl-02-01-logic-gates · Logic gates and truth tables
- Prerequisites: dl-01-08 (bits, XOR as "differ")
- Sub-topics: NOT, AND, OR, NAND, NOR, XOR, XNOR (symbols, truth tables, multi-input forms);
  bubbles and active-low; positive vs negative logic; buffers; gate-level reading of simple
  expressions
- Sets: A 24–29; B 109–113 (incl. positive/negative logic); C 223–229, 254–255; E 407
- pyq_topics: dl/gates
- PYQs (1; gates): `cse-1999-a-7`
- Time: 35 min
- Diagrams/animations: **gate symbols with toggling truth tables**; bubble-pushing animation;
  positive/negative logic duality table
- Practice themes: evaluate gates; identify a gate from its table; negative-logic equivalents

### dl-02-02-boolean-laws · Boolean algebra: postulates, laws and theorems
- Prerequisites: dl-02-01
- Sub-topics: Huntington postulates; identity, complement, idempotence, involution, absorption,
  distributivity (both forms), De Morgan, consensus, duality; Shannon expansion and cofactors;
  solving simultaneous Boolean equations; proving or disproving identities (counterexample method)
- Sets: A 33–35; B 104–106; C 189–192, 238–240, 246 (simultaneous equations); D 400 (consensus)
- pyq_topics: dl/boolean
- PYQs (12; boolean): `cse-1994-a-27-b`, `cse-1995-a-30`, `cse-2000-a-2-10`, `cse-2002-b-55-a`, `cse-2004-cs-17`, `it-2006-cs-6`, `cse-2008-cs-26`, `cse-2017-2-cs-27`, `cse-2019-cs-6`, `cse-2024-2-cs-20`, `cse-2025-2-cs-40`, `cse-2026-2-cs-6`
- Time: 60 min
- Diagrams/animations: law cards with 2-row/4-row truth-table proofs; De Morgan bubble push;
  consensus Venn; Shannon split tree
- Practice themes: simplify; spot the invalid identity; solve equation systems; consensus

### dl-02-03-xor-and-operators · XOR/XNOR algebra and custom operators
- Prerequisites: dl-02-02
- Sub-topics: XOR/XNOR laws (a ⊕ a = 0, a ⊕ 1 = ā, associativity, complementing inputs);
  parity functions; XNOR as equivalence; testing commutativity and associativity of defined
  operators (NAND/NOR not associative); implication-type operators; iterated XOR
- Sets: A 24–29; B 109–112; C 227–229, 247–248, 255–256 (incl. a GATE 2016 XOR item)
- pyq_topics: dl/boolean
- PYQs (16; boolean): `cse-1992-a-2-i`, `cse-1994-a-27-a-i`, `cse-1994-a-27-a-ii`, `cse-1997-a-11`, `cse-1998-a-13`, `cse-1998-a-43`, `cse-2002-a-28`, `it-2005-cs-7`, `cse-2007-cs-33`, `cse-2013-cs-21`, `cse-2014-3-cs-55`, `cse-2015-1-cs-28`, `cse-2016-1-cs-6`, `cse-2016-2-cs-8`, `cse-2018-cs-4`, `cse-2026-1-cs-11`
- Time: 45 min
- Diagrams/animations: XOR parity chain animation; associativity test table for a defined operator
- Practice themes: XOR identities; operator properties; parity
- Gaps: operator-property testing (thin, so we write it ourselves)

### dl-02-04-canonical-forms · Minterms, maxterms and canonical forms
- Prerequisites: dl-02-02
- Sub-topics: minterm/maxterm indices; SOP/POS and canonical SOP/POS; Σ ↔ Π conversion;
  expanding terms over missing variables; counting functions (2^{2ⁿ}); self-dual functions and
  their count (2^{2^{n−1}}); the dual vs the complement; the majority function; operations on
  minterm sets
- Sets: A 36–37, 43 (self-dual count); B 105–108, 112–113; C 192–198, 241–244, 253–254, 268–269 (counting with don't-cares); E 408
- pyq_topics: dl/boolean
- PYQs (8; boolean): `cse-2001-b-58-a`, `cse-2007-cs-3`, `cse-2010-cs-6`, `cse-2014-2-cs-6`, `cse-2015-3-cs-44`, `cse-2021-1-cs-42`, `cse-2024-1-cs-37`, `cse-2025-1-cs-14`
- Time: 50 min
- Diagrams/animations: truth table ↔ minterm list highlighter; self-dual pairing diagram
  (complementary rows); minterm-set Venn
- Practice themes: Σ/Π conversions; counting functions; self-duality checks

### dl-02-05-universal-gates · Universal gates and functional completeness
- Prerequisites: dl-02-04
- Sub-topics: NAND-only and NOR-only realisations; minimum gate counts (XOR = 4 NAND, 5 NOR;
  two-level NAND–NAND / NOR–NOR); completeness criteria (Post's classes, at an intuitive level:
  needs non-monotone, non-affine, non-self-dual, not 0- or 1-preserving); complete sets with
  constants (MUX + constants, {AND, XOR, 1}, implication + 0, half adders)
- Sets: A 29–32, 43 (completeness: heading only); B 111–112, 117–118; C 229–232, 250–252, 279 (gate counts); D 400
- pyq_topics: dl/gates
- PYQs (11; gates): `cse-1992-a-2-ii`, `cse-1993-ii-b-9`, `cse-1995-b-63-a`, `cse-1998-a-57-a`, `cse-1998-a-57-b`, `cse-1999-a-34`, `cse-2002-b-55-b`, `it-2004-it-8`, `cse-2009-cs-6`, `cse-2015-1-cs-39`, `cse-2015-3-cs-2`
- Time: 55 min
- Diagrams/animations: NAND → NOT/AND/OR construction animation; XOR from 4 NANDs; a
  completeness checklist table
- Practice themes: minimum NAND/NOR counts; decide completeness; build a function from a given
  gate
- Gaps: **GAP** Post's criteria (no set covers them; we give an intuitive version)

### dl-02-06-gate-circuit-analysis · Analysing gate circuits and timing
- Prerequisites: dl-02-04, dl-02-05
- Sub-topics: reading multi-level circuits; f = f₁f₂ + f₃ style minterm reasoning; propagation
  delay; glitches and pulse generation (X·X̄ with delay); two-way switch and staircase logic;
  wrong-gate fabrication puzzles
- Sets: A 24 (delay, feedback loops); B 108–109 (contact networks); C 199–202, 223–226, 245–246 (switch/contact networks, staircase XOR)
- pyq_topics: dl/gates, dl/combinational
- PYQs (16; combinational, gates): `cse-1993-ii-a-6-1`, `cse-1994-a-8`, `cse-1997-a-40`, `cse-2002-a-26`, `cse-2003-cs-47`, `cse-2005-cs-15`, `it-2005-cs-10`, `it-2007-cs-38`, `cse-2008-cs-8`, `cse-2010-cs-31`, `cse-2011-cs-13`, `cse-2019-cs-30`, `cse-2020-cs-28`, `cse-2024-1-cs-18`, `cse-2024-2-cs-40`, `cse-2025-2-cs-21`
- Time: 50 min
- Diagrams/animations: **signal-flow circuit animation** (values propagate gate by gate); timing
  diagram with delay-induced glitch
- Practice themes: circuit → expression; minterm-set algebra; delay/glitch width
- Gaps: timing and glitch analysis (thin)

---

## Chapter 3 · Minimisation (`03-minimisation`)
Live Lab: **K-map Solver**: 2–5 variables. Click cells (1/0/X), see every prime implicant,
highlight the essential ones, choose a minimal SOP or POS, and step through Quine–McCluskey on
the same function.

### dl-03-01-kmaps · Karnaugh maps (2–4 variables)
- Prerequisites: dl-02-04, dl-01-08 (Gray order)
- Sub-topics: map layout and Gray order; adjacency and wrap-around (corners); grouping rules
  (powers of 2, largest first); SOP from 1s and POS from 0s; reading a given map; spotting
  XOR/XNOR patterns; algebraic minimisation alongside; counting minterms of an expression
- Sets: A 37–39; B 113–116; C 232–238, 259–260, 263–264 (minimal POS)
- pyq_topics: dl/minimization
- PYQs (20; minimization): `cse-1995-b-63-b`, `cse-1996-a-49`, `cse-1997-b-71-a`, `cse-1997-b-71-b`, `cse-1998-a-42`, `cse-2000-a-2-11`, `it-2004-it-44`, `cse-2005-cs-18`, `cse-2007-cs-32`, `cse-2007-cs-9`, `it-2007-cs-78`, `it-2007-cs-79`, `it-2008-it-8`, `cse-2011-cs-14`, `cse-2014-1-cs-7`, `cse-2015-2-cs-37`, `cse-2021-2-cs-52`, `cse-2025-1-cs-32`, `cse-2025-2-cs-33`, `cse-2026-2-cs-30`
- Time: 70 min
- Diagrams/animations: **K-map grouping with wrap-around** (map rolls into a torus); corner quad;
  checkerboard XOR; non-Gray-labelled trap map
- Practice themes: minimal SOP/POS; read the map; which expression matches

### dl-03-02-prime-implicants · Implicants, prime implicants and don't-cares
- Prerequisites: dl-03-01
- Sub-topics: implicant / PI / EPI definitions; listing all PIs; counting PIs; selecting a
  minimal cover (EPIs first, then the cheapest cover); don't-cares (use only when they help);
  multiple minimal covers
- Sets: A 40–42 (PI/EPI/redundant/selective counting); B 114–117; C 234–236, 260–269 (PI charts, cyclic functions, branching, multiple minimal covers), 273–276; E 405
- pyq_topics: dl/minimization
- PYQs (14; minimization): `cse-1991-b-5-b`, `cse-1997-a-36`, `cse-1999-a-8`, `cse-2001-a-11`, `cse-2002-a-12`, `cse-2004-cs-59`, `it-2006-cs-35`, `cse-2008-cs-5`, `cse-2012-cs-30`, `cse-2014-3-cs-7`, `cse-2015-3-cs-43`, `cse-2017-2-cs-28`, `cse-2018-cs-49`, `cse-2026-1-cs-38`
- Time: 60 min
- Diagrams/animations: PI enumeration animation; EPI highlight (cells covered once);
  don't-care toggling
- Practice themes: count PIs/EPIs; minimal cover with don't-cares

### dl-03-03-tabular-method · Quine–McCluskey and other map methods
- Prerequisites: dl-03-02
- Sub-topics: the Quine–McCluskey tabular method (grouping by weight, combining, PI chart, row
  and column dominance, Petrick's method in brief); 5-variable maps; variable-entered maps
- Sets: B 115–117, 165 (VEM); C 238 (5-variable map), 262–263 and 266–270 (PI chart, branching), 270–273 (VEM, free variables). No set runs the full Quine–McCluskey tabulation
- pyq_topics: dl/minimization
- PYQs (1; minimization): `cse-1992-a-1-i`
- Time: 60 min
- Diagrams/animations: **Quine–McCluskey table** filled step by step; PI chart with dominance
  crossing; VEM-to-K-map unfolding
- Practice themes: QM rounds; PI chart selection; VEM reading
- Gaps: **GAP** Quine–McCluskey tabulation (no set runs it, and the 2027 syllabus names it); B and C cover VEM

### dl-03-04-two-level-implementation · From minimal forms to gates: cost, NAND/NOR, hazards
- Prerequisites: dl-03-02, dl-02-05
- Sub-topics: literal and gate cost; SOP vs POS cost; NAND–NAND and NOR–NOR from minimal forms;
  minimum NOR count for a given function; static-1/static-0 hazards and the consensus fix;
  multiple-output sharing
- Sets: B 117–118, 129 (hazards); C 259 (cost criteria), 276 (multi-output sharing), 277–278 (NAND–NAND/NOR–NOR); D 402 (static-1 hazard); E 407 (SOP vs POS cost)
- pyq_topics: dl/minimization, dl/gates
- PYQs (4; gates, minimization): `cse-2003-cs-45`, `cse-2006-cs-38`, `cse-2017-1-cs-21`, `cse-2019-cs-50`
- Time: 45 min
- Diagrams/animations: hazard timing glitch with the covering term added; NAND–NAND conversion
- Practice themes: literal counts; NOR-only counts; hazard-free covers
- Gaps: **GAP** hazards (only summaries in B 129 and D 402)

---

## Chapter 4 · Combinational circuits (`04-combinational-circuits`)
Live Lab: **Combinational Workbench**: MUX/DEMUX/decoder/encoder blocks with live routing. Set
the select lines, watch the chosen path light up, and use the "implement f with a MUX" helper
(Shannon split).

### dl-04-01-combinational-design · Designing combinational circuits; code converters
- Prerequisites: dl-03-02
- Sub-topics: the design procedure (spec → truth table → K-map → gates); BCD → mod-n, BCD ≥ 5
  detectors; excess-3 ↔ BCD; binary ↔ Gray converters; seven-segment (aside)
- Sets: A 38–39 (converter), 44–47 (design, majority/minority); B 117–118; C 201–202 (word problems), 277–283 (design flow, BCD→XS-3 converter)
- pyq_topics: dl/combinational, dl/minimization
- PYQs (5; combinational, minimization): `cse-2000-b-9-a`, `cse-2000-b-9-b`, `cse-2001-b-58-b`, `cse-2004-cs-58`, `cse-2012-cs-6`
- Time: 45 min
- Diagrams/animations: design-pipeline storyboard; converter K-maps with don't-cares
- Practice themes: converter design; gate counts

### dl-04-02-multiplexers · Multiplexers and function realisation
- Prerequisites: dl-04-01, dl-02-02 (Shannon)
- Sub-topics: 2ⁿ:1 MUX equation; MUX trees; implementing functions (n or n−1 select variables,
  the residue on the data lines); cascaded/feedback MUX puzzles; MUX as a universal element;
  register-select sizing
- Sets: A 64–72 (most detailed: MUX as gates, implementation tables, MUX trees); B 119–122; C 296–325 (see part-2 digest); E 407–408
- pyq_topics: dl/combinational
- PYQs (19; combinational): `cse-1996-a-47`, `cse-1996-a-53`, `cse-1998-a-14`, `cse-2001-a-36`, `cse-2002-a-27`, `cse-2004-cs-60`, `it-2005-cs-48`, `cse-2006-cs-35`, `it-2006-cs-36`, `cse-2007-cs-34`, `it-2007-cs-8`, `cse-2010-cs-9`, `cse-2014-1-cs-45`, `cse-2014-3-cs-8`, `cse-2016-1-cs-30`, `cse-2020-cs-19`, `cse-2021-2-cs-5`, `cse-2023-cs-34`, `cse-2024-1-cs-54`
- Time: 60 min
- Diagrams/animations: **MUX routing animation**; MUX tree build; implementation table
  (select-variable split)
- Practice themes: MUX output expression; implement f; count MUXes in a tree

### dl-04-03-decoders-encoders · Decoders, demultiplexers, encoders and priority encoders
- Prerequisites: dl-04-02
- Sub-topics: n:2ⁿ decoder as a minterm generator; enable inputs and decoder expansion; DEMUX =
  decoder with data on enable; encoders; priority encoders with a valid bit; address decoding
  for memory
- Sets: A 72–75; B 122–129; C 295, 299–325 (see part-2 digest); E 408
- pyq_topics: dl/combinational
- PYQs (7; combinational): `cse-1992-b-4-b`, `cse-2007-cs-8`, `it-2008-it-9`, `cse-2013-cs-5`, `cse-2020-cs-20`, `cse-2022-cs-30`, `cse-2026-2-cs-49`
- Time: 50 min
- Diagrams/animations: **decoder/encoder routing**; decoder tree expansion (6:64 from 3:8)
- Practice themes: decoder count; function from decoder + OR/NOR; priority-encoder tables

### dl-04-04-comparators-parity · Magnitude comparators and parity circuits
- Prerequisites: dl-04-01, dl-02-03
- Sub-topics: 1-bit and n-bit comparators (equality via XNOR, greater/less cascades); parity
  generator and checker
- Sets: A 61–63; B 132–133; C 279–280 (1-bit), 294–295 (4-bit)
- pyq_topics: dl/combinational
- PYQs (0): none
- Time: 30 min
- Diagrams/animations: comparator cascade animation
- Practice themes: comparator expressions; parity-tree gate counts
- Note: no PYQ; kept because the sets cover it and it is a standard building block

### dl-04-05-rom-pla-pal · ROM, PLA and PAL as combinational logic
- Prerequisites: dl-04-03
- Sub-topics: ROM = decoder + OR array; sizing a ROM for a truth table (2ⁿ × m); PLA vs PAL; the
  multiplier-ROM size questions
- Sets: B 125, 127–128 (ROM via decoder, expansion); C 373–391 (PLD classes, PROM/ROM internals, PLA incl. complement trick, PAL, CPLD/FPGA)
- pyq_topics: dl/combinational
- PYQs (4; combinational): `cse-1993-ii-a-6-6`, `cse-1996-a-21`, `it-2004-it-10`, `cse-2012-cs-19`
- Time: 35 min
- Diagrams/animations: ROM as a lookup grid; PLA AND/OR plane
- Practice themes: ROM sizing; PLA term counts

### dl-04-06-faults-testing · Stuck-at faults and test inputs
- Prerequisites: dl-02-06
- Sub-topics: the stuck-at-0/1 model; activation and propagation; finding a test vector;
  counting faults
- Sets: B 129 (stuck-at faults and test vectors, brief); otherwise thin, **GAP**
- pyq_topics: dl/gates, dl/combinational
- PYQs (3; combinational, gates): `cse-1994-b-35-b`, `it-2005-cs-46`, `it-2007-cs-45`
- Time: 30 min
- Diagrams/animations: fault injection on a small circuit (good vs faulty output)
- Practice themes: test vectors; fault counts
- Gaps: **GAP** (only one brief page in B; textbook: Mano / any testing primer)

---

## Chapter 5 · Arithmetic circuits (`05-arithmetic-circuits`)
Live Lab: **Adder Race**: a ripple-carry vs carry-look-ahead side-by-side simulation with
gate-delay counters. Enter A and B, see the carry wave, flip to subtract, and watch the overflow
flag.

### dl-05-01-adders-ripple-carry · Half/full adders, subtractors and ripple-carry adders
- Prerequisites: dl-02-03, dl-01-04
- Sub-topics: half and full adder (from 2 HAs + OR); half and full subtractor; n-bit ripple
  adder; delay models (2n + 1 etc.); worst-case carry chain; pipelined adders with registers
- Sets: A 48–59 (HA/FA/HS/FS, NAND/NOR counts, delay cases); B 129–131, 133; C 279–288; D 400–401; E 408–409
- pyq_topics: dl/arithmetic, dl/combinational
- PYQs (5; arithmetic, combinational): `cse-1999-a-41`, `cse-2002-b-56-a`, `cse-2002-b-56-b`, `cse-2015-2-cs-48`, `cse-2016-2-cs-7`
- Time: 55 min
- Diagrams/animations: **ripple-carry animation** (carry wave); full adder from 2 HAs; delay
  timeline
- Practice themes: delays; HA/FA counts; worst-case operands

### dl-05-02-carry-look-ahead · Carry look-ahead adders
- Prerequisites: dl-05-01
- Sub-topics: generate/propagate; C_{i+1} = G_i + P_i C_i expanded; two-level CLA delay; group
  (block) G/P and multi-level CLA; fan-in limits (O(log n)); 74181/74182-style hierarchies
- Sets: A 59–60; B 131–133 (CLA, hybrid, serial adders); C 286–287; D 401; E 408
- pyq_topics: dl/arithmetic, dl/combinational
- PYQs (5; arithmetic, combinational): `cse-1997-a-15`, `cse-2004-cs-62`, `cse-2006-cs-36`, `cse-2007-cs-35`, `cse-2016-1-cs-33`
- Time: 50 min
- Diagrams/animations: **ripple-carry vs carry-look-ahead** comparison; CLA tree
- Practice themes: CLA delay; G/P expressions; level counts

### dl-05-03-adder-subtractor-overflow · Adder–subtractor, overflow and BCD addition
- Prerequisites: dl-05-01, dl-01-04
- Sub-topics: XOR-controlled adder/subtractor; unsigned carry vs signed overflow; overflow rules
  (same-sign operands, c_in ≠ c_out of the MSB); flags (C, V, S, Z); sign-magnitude
  add/subtract range; 1's-complement end-around carry; BCD adder (+6 correction); adder-based
  code conversion
- Sets: A 20–21 (overflow); B 146, 148, 159–160 (adder/subtractor, BCD adder); C 211–216 (complement subtraction, overflow, BCD/XS-3 addition), 289 (adder-subtractor with overflow), 290–291 (BCD adder)
- pyq_topics: dl/arithmetic, dl/combinational
- PYQs (15; arithmetic, combinational): `cse-1992-b-4-a`, `cse-1995-a-51`, `cse-1996-a-46`, `cse-2002-a-21`, `cse-2003-cs-46`, `it-2004-it-42`, `cse-2006-cs-39`, `it-2006-cs-7`, `it-2008-it-15`, `cse-2017-1-cs-9`, `cse-2019-cs-8`, `cse-2022-cs-8`, `cse-2024-1-cs-3`, `cse-2026-1-cs-12`, `cse-2026-2-cs-18`
- Time: 60 min
- Diagrams/animations: overflow on the 2's-complement wheel (crossing +7 → −8); flag panel;
  BCD +6 correction animation
- Practice themes: overflow detection; flags; BCD sums

### dl-05-04-multipliers-booth · Multiplication: array multipliers and Booth's algorithm
- Prerequisites: dl-05-03
- Sub-topics: shift-and-add; partial products; array multiplier delay (≈ 2n); signed products;
  Booth recoding (radix-2) and its add/subtract count; best and worst patterns; bit-pair
  (radix-4) recoding
- Sets: B 153–154, 178 (Booth); C 291–293 (array multiplier); D 401–402 (radix-2 and radix-4 Booth tables)
- pyq_topics: dl/arithmetic
- PYQs (10; arithmetic): `cse-1991-a-1-v`, `cse-1996-a-23`, `cse-1999-a-20`, `cse-1999-a-21`, `cse-2003-cs-11`, `cse-2004-cs-66`, `it-2005-cs-8`, `it-2006-cs-38`, `it-2008-it-42`, `cse-2025-2-cs-22`
- Time: 60 min
- Diagrams/animations: Booth scan animation (pair window sliding, add/sub marks); array
  multiplier grid with the critical path
- Practice themes: Booth recoding; count of operations; array delay
- Gaps: **GAP** Booth's algorithm worked end to end and the array-multiplier delay (C 291–293 shows only the structure; textbook: Hamacher / Mano CSA)

---

## Chapter 6 · Latches, flip-flops and sequential analysis (`06-latches-flip-flops`)
Live Lab: **Flip-flop Scope**: choose SR/JK/D/T (latch or edge-triggered), drive the inputs and
the clock, and see the live timing diagram with setup/hold violations flagged.

### dl-06-01-latches · Feedback, latches and races
- Prerequisites: dl-02-06
- Sub-topics: feedback and stable states; SR latch (NOR and NAND, active-low); the forbidden
  input and oscillation; gated latches; D latch (MUX with feedback); latch vs flip-flop
- Sets: A 76–78; B 134–135; C 326–333 (latches, clocking, triggering, latch vs flip-flop); E 406
- pyq_topics: dl/sequential
- PYQs (6; sequential): `cse-1991-b-5-a`, `cse-1993-ii-a-6-2`, `cse-1999-a-33`, `cse-2004-cs-18`, `it-2007-cs-7`, `cse-2023-cs-11`
- Time: 45 min
- Diagrams/animations: SR latch feedback animation (including the race into oscillation);
  MUX-feedback latch
- Practice themes: latch tables; NAND vs NOR behaviour; stability

### dl-06-02-flip-flops · Flip-flops: SR, JK, D, T, edge triggering and timing
- Prerequisites: dl-06-01
- Sub-topics: level vs edge triggering; master–slave; characteristic tables and equations;
  excitation tables; conversions between types; asynchronous preset/clear; setup, hold and
  propagation delay; timing-diagram questions
- Sets: A 79–86, 99 (race-around); B 135–138 (incl. conversions); C 333–342 (D/JK/master–slave/T, conversions, preset/clear); D 400; E 406–407 (preset/clear)
- pyq_topics: dl/sequential
- PYQs (5; sequential): `cse-2000-a-2-12`, `cse-2001-a-33`, `cse-2005-cs-62`, `cse-2006-cs-8`, `it-2008-it-37`
- Time: 65 min
- Diagrams/animations: **SR/JK/D/T flip-flops with timing diagrams**; master–slave two-phase
  animation; conversion tables
- Practice themes: next-state; excitation; conversions; timing

### dl-06-03-sequential-analysis · Analysing synchronous sequential circuits
- Prerequisites: dl-06-02
- Sub-topics: synchronous vs asynchronous (and why synchronous); excitation and state equations
  from a circuit; state tables and diagrams; tracing sequences from an initial state;
  reachability; mixed T/D/JK circuits
- Sets: A 76–77; B 154–155, 183 (solved items); C 326–328 (sync vs async). Analysis of given circuits is thin everywhere
- pyq_topics: dl/sequential
- PYQs (13; sequential): `cse-1991-a-3-ii`, `cse-1993-ii-c-19`, `cse-1994-b-34`, `cse-1996-b-72`, `cse-1996-b-73`, `cse-2005-cs-64`, `it-2005-cs-43`, `it-2006-cs-37`, `cse-2011-cs-50`, `cse-2011-cs-51`, `cse-2015-1-cs-37`, `cse-2017-1-cs-33`, `cse-2023-cs-33`
- Time: 55 min
- Diagrams/animations: circuit → state-table → state-diagram animation; clock-by-clock trace
- Practice themes: trace states; derive state equations
- Gaps: circuit → state table → diagram analysis (thin in every set; 13 PYQs rely on it)

---

## Chapter 7 · Counters, registers and FSMs (`07-counters-registers-fsms`)
Live Lab: **Counter & FSM Simulator**: build a ring/Johnson/ripple/synchronous counter or enter
an FSM table, clock it step by step, and see the waveform plus the state diagram; it includes a
self-start checker.

### dl-07-01-shift-registers · Shift registers, ring and Johnson counters, LFSRs
- Prerequisites: dl-06-03
- Sub-topics: SISO/SIPO/PISO/PIPO; bidirectional/universal; ring (N states) and Johnson (2N
  states) counters; counter + decoder = ring; LFSR sequences; a RAM as a long shift register
- Sets: A 88–92; B 155–156, 158–159; C 357–372 (ring/Johnson, SISO/SIPO/PISO/PIPO, universal register, sequence generators); D 402; E 408
- pyq_topics: dl/sequential
- PYQs (10; sequential): `cse-1991-b-6-a`, `cse-1991-b-6-b`, `cse-1993-ii-a-6-3`, `cse-2001-a-37`, `cse-2006-cs-37`, `it-2007-cs-40`, `cse-2014-2-cs-7`, `cse-2015-1-cs-20`, `cse-2018-cs-22`, `cse-2025-1-cs-50`
- Time: 50 min
- Diagrams/animations: **registers step by step** (bits sliding); Johnson twisted ring; LFSR
  XOR feedback animation
- Practice themes: sequences; state counts; LFSR contents

### dl-07-02-ripple-counters · Counter basics and asynchronous (ripple) counters
- Prerequisites: dl-06-02
- Sub-topics: mod-N and the flip-flop count ⌈log₂ N⌉; ripple up/down counters; frequency division
  (f/2ⁿ); ripple delay and max frequency; mod-N by asynchronous clear; counting pulses between two
  states
- Sets: A 87–92, 101; B 157–158; C 342–353 (ripple up/down, decade, MOD-N by reset); D 400
- pyq_topics: dl/sequential
- PYQs (6; sequential): `cse-1994-a-2-1`, `it-2005-cs-11`, `cse-2007-cs-36`, `cse-2010-cs-32`, `cse-2011-cs-15`, `cse-2025-2-cs-24`
- Time: 45 min
- Diagrams/animations: **counter step by step** with the ripple timing diagram; clear-gate mod-N
  animation
- Practice themes: frequency; mod-N; pulse counts

### dl-07-03-synchronous-counter-design · Synchronous counter design
- Prerequisites: dl-07-02, dl-06-02, dl-03-02
- Sub-topics: the design procedure with excitation tables; arbitrary sequences; repeated-value
  sequences (needs extra state bits); Gray and saturating counters; self-starting and lock-out;
  max clock frequency of synchronous counters
- Sets: B 156–157, 159 (incl. a GATE 2016 item); C 353–356, 371–372 (sync design, arbitrary sequence, lock-out); A 87 (terminology only)
- pyq_topics: dl/sequential
- PYQs (10; sequential): `cse-1991-b-5-c`, `cse-1992-b-4-c`, `cse-1998-b-68`, `cse-2004-cs-61`, `cse-2014-3-cs-45`, `cse-2015-2-cs-7`, `cse-2016-1-cs-8`, `cse-2017-2-cs-42`, `cse-2021-1-cs-28`, `cse-2026-1-cs-27`
- Time: 65 min
- Diagrams/animations: design storyboard (sequence → table → K-maps → circuit); state graph
  with unused states
- Practice themes: flip-flop counts; derive T/JK/D inputs; self-start check

### dl-07-04-finite-state-machines · Finite state machines: Mealy and Moore
- Prerequisites: dl-07-03
- Sub-topics: Mealy vs Moore; state diagrams and tables; sequence detectors (overlapping or
  not); serial adders and serial 2's complementers; the shortest input to reach an output; FSM →
  circuit
- Sets: E 405 (serial 2's-complement Mealy), 407 (Mealy vs Moore) only. Set C has no FSM theory
- pyq_topics: dl/sequential
- PYQs (6; sequential): `cse-2001-b-59-a`, `cse-2001-b-59-b`, `cse-2002-a-30`, `cse-2005-cs-63`, `cse-2009-cs-27`, `cse-2021-2-cs-28`
- Time: 55 min
- Diagrams/animations: **FSM diagrams** with an animated token; Mealy ↔ Moore conversion
- Practice themes: build detectors; interpret machines; output sequences
- Gaps: **GAP** Mealy/Moore theory, detectors and FSM → circuit (only E 405/407 touch it; textbook: Mano)

### dl-07-05-state-minimisation · State minimisation
- Prerequisites: dl-07-04
- Sub-topics: equivalent states; partition refinement; implication tables; incompletely
  specified machines (brief)
- Sets: E 409 (implication table) only
- pyq_topics: dl/sequential
- PYQs (3; sequential): `cse-1996-a-48`, `cse-2003-cs-44`, `cse-2025-1-cs-49`
- Time: 35 min
- Diagrams/animations: partition refinement animation; implication table crossing out
- Practice themes: minimise a table; count states
- Gaps: **GAP** partition refinement (E 409 shows one implication table only)

---

## Chapter 8 · Beyond the core syllabus (optional, `08-beyond-syllabus`)
Kept because Set C covers these and some old PYQs test them. They are marked "optional" in the
reader. Live Lab: **Converter Bench**: a SAR ADC stepping through its binary search beside an
R-2R DAC staircase (small, and it reuses the Number Lab's base functions).

### dl-08-01-memory-devices · Semiconductor memory organisation
- Prerequisites: dl-04-05
- Sub-topics: RAM/ROM types; chip organisation; expanding word size and count (cross-reference COA)
- Sets: C 373–377, 392–393 (memory arrays, SRAM vs DRAM, 4×4 RAM)
- pyq_topics: none
- PYQs (0): none
- Time: 25 min
- Diagrams/animations: chip-array expansion

### dl-08-02-data-converters · DAC and ADC basics
- Prerequisites: dl-01-03
- Sub-topics: weighted-resistor and R-2R DAC; resolution; flash/successive-approximation/counter
  ADCs
- Sets: C 394–397 (binary-weighted and R-2R DACs; ADCs only named)
- pyq_topics: none
- PYQs (0): none
- Time: 25 min
- Diagrams/animations: SAR binary-search animation
- Gaps: **GAP** ADC types (C only names them)

### dl-08-03-logic-families · Logic families and switch-level circuits
- Prerequisites: dl-02-01
- Sub-topics: TTL/CMOS/ECL comparison; noise margins and levels; CMOS static power; pass
  transistors and transmission gates
- Sets: A 95 (NAND vs NOR in CMOS); C 224–226 (TTL/ECL unused inputs), 398 (families, fan-in/fan-out); otherwise thin, **GAP**
- pyq_topics: dl/gates
- PYQs (4; gates): `cse-1991-a-1-i`, `cse-1991-a-3-i`, `cse-1994-a-3-10`, `cse-1998-a-15`
- Time: 30 min
- Diagrams/animations: CMOS inverter switch animation; pass-transistor path tracing
- Gaps: **GAP** (pre-2000 PYQs only)

---

## PYQ assignment check
- dl PYQs in `src/gate/questions.json`: **304** (sequential 59, combinational 42, number 40, minimization 40, boolean 36, gates 33, arithmetic 29, floating 25).
- Assigned to a lesson: **304**; each id has exactly one *primary* lesson (secondary links are listed in chapter plans).
- **Unassigned: 0** (none)
- Lessons with no PYQ: `dl-04-04`, `dl-08-01`, `dl-08-02` (kept: set coverage, building blocks or optional).
- Enforced by `content/gate-notes/_checks/dl/outline_pyq_assignment.py` (runs in CI via `scripts/gate-notes/run_checks.py`). Once lessons exist, `npm run notes:build` coverage takes over.

## Gaps summary (write from textbooks)
- `dl-01-03-fractions-fixed-point` (Fractions and fixed-point numbers): fixed-point range and resolution (thin in every set)
- `dl-02-05-universal-gates` (Universal gates and functional completeness): Post's criteria (no set covers them; we give an intuitive version)
- `dl-03-03-tabular-method` (Quine–McCluskey and other map methods): Quine–McCluskey tabulation (no set runs it, and the 2027 syllabus names it); B and C cover VEM
- `dl-03-04-two-level-implementation` (From minimal forms to gates: cost, NAND/NOR, hazards): hazards (only summaries in B 129 and D 402)
- `dl-04-06-faults-testing` (Stuck-at faults and test inputs): (only one brief page in B; textbook: Mano / any testing primer)
- `dl-05-04-multipliers-booth` (Multiplication: array multipliers and Booth's algorithm): Booth's algorithm worked end to end and the array-multiplier delay (C 291–293 shows only the structure; textbook: Hamacher / Mano CSA)
- `dl-07-04-finite-state-machines` (Finite state machines: Mealy and Moore): Mealy/Moore theory, detectors and FSM → circuit (only E 405/407 touch it; textbook: Mano)
- `dl-07-05-state-minimisation` (State minimisation): partition refinement (E 409 shows one implication table only)
- `dl-01-07-floating-point-arithmetic` (Floating-point arithmetic, rounding and its pitfalls): rounding modes and the guard/round/sticky bits (textbook)
- `dl-08-02-data-converters` (DAC and ADC basics): ADC types (C only names them)
- `dl-08-03-logic-families` (Logic families and switch-level circuits): (pre-2000 PYQs only)
