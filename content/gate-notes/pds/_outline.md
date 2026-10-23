# Programming & Data Structures: master syllabus map (Checkpoint A, status: review)

Internal planning file (the build skips it). It is Stage N1 of the GATE Notes build for subject
`pds`. Reference sets are labelled A–E only. Nothing here is published.

## How this map was built
The map is the union of three sources:
1. **Official GATE CSE syllabus, Programming and Data Structures:** programming in C; recursion;
   arrays, stacks, queues, linked lists, trees, binary search trees, binary heaps, graphs. The
   syllabus names no hashing, but hashing PYQs sit in the `pds/hashing-ds` bank topic and the
   Algorithms syllabus lists "hashing", so hashing is taught here, beside the heaps that share its
   chapter. Graph *algorithms* (BFS/DFS, shortest paths, MST) belong to Algorithms; this course
   teaches only graph **representation** (the three `graphs-ds` PYQs). Re-verify the GATE 2027
   wording against the official PDF before publishing.
2. **Everything any reference set covers** (digests in `_digest/pds/`, internal; about 60,000
   words over all 545 pages).
3. **Everything the 404 pds PYQs test** (`src/gate/questions.json`, read together with the v2
   solutions' `concepts` and `approach` fields). About a quarter of the C PYQs are written in
   Pascal or pseudo-code (1991–2001); they test the same ideas (parameter passing, scope, loops),
   so the lessons teach the idea in C first and then read the Pascal form.

**Ids:** planning id `pds-NN-MM-slug` ↔ file `NN-chapter/MM-slug.md`, with frontmatter `id: slug`
(unique across the subject). **Sets:** A–E (internal). A lesson marked **GAP** is not covered well by
any set and is written from textbooks (Kernighan & Ritchie, *The C Programming Language*; the C11
standard for undefined and unspecified behaviour; Sethi, *Programming Languages* and Pratt & Zelkowitz
for parameter passing and scope; Cormen et al., *Introduction to Algorithms* for heaps, hashing and
BSTs; Weiss, *Data Structures and Algorithm Analysis in C*; Knuth vol. 1 and 3). **`pyq_topics`**
use the questions.json `subject/topic` keys.

**Conventions fixed for the whole course** (the sets disagree; see `_errata/pds.md`):
- C code means ISO C (C99/C11) on a typical 64-bit compiler: `char` 1 byte, `short` 2, `int` 4,
  `long` 8, pointers 8, unless a question states otherwise (older PYQs assume 2-byte `int`; the
  lesson says so where it matters). Every C program in the course is compiled and run by the checks.
- **Height** of a tree = number of **edges** on the longest root-to-leaf path (a single node has
  height 0, the empty tree −1). **Level/depth** of the root = 0. When a PYQ uses levels (nodes on the
  path), the lesson converts explicitly.
- **Heaps** in arrays are 1-based (children 2i, 2i + 1, parent ⌊i/2⌋) unless the question is 0-based
  (children 2i + 1, 2i + 2, parent ⌊(i − 1)/2⌋); lessons always show both.
- **Full / complete / perfect** binary trees use the CLRS-style meanings: *full* (proper, strict) =
  every node has 0 or 2 children; *complete* = all levels full except possibly the last, filled
  from the left; *perfect* = all leaves at the same depth and every internal node has 2 children.
  The sets use "complete" for two of these; the lessons name the meaning each PYQ uses.

## Chapter overview
| # | Chapter | Folder | Lessons | PYQs | Est. time |
|---|---|---|---|---|---|
| 1 | C foundations: values, control flow and functions | `01-c-foundations` | 7 | 78 | 6 h 30 min |
| 2 | Pointers, arrays, strings and memory | `02-pointers-memory` | 5 | 49 | 4 h 35 min |
| 3 | Recursion | `03-recursion` | 4 | 46 | 3 h 40 min |
| 4 | Arrays and linked lists | `04-arrays-lists` | 4 | 46 | 3 h 55 min |
| 5 | Stacks and queues | `05-stacks-queues` | 3 | 34 | 2 h 55 min |
| 6 | Trees and binary search trees | `06-trees` | 7 | 99 | 7 h 10 min |
| 7 | Heaps, hashing and graph representation | `07-heaps-hashing-graphs` | 4 | 52 | 3 h 40 min |
| | **Total** | | **34** | **404** | **32 h 25 min** |

Foundation-first order: values, operators and control flow (Ch 1, the vocabulary every program
uses) → functions, storage and parameter passing (the call mechanics that recursion and pointers
need) → pointers, arrays, strings, structures and the heap (Ch 2, the memory model every data
structure is built from) → recursion (Ch 3, needs the call stack of Ch 1 and the pointers of Ch 2)
→ arrays as data structures and linked lists (Ch 4, need pointers, structs and malloc) → stacks and
queues (Ch 5, built on arrays and lists) → trees and BSTs (Ch 6, need recursion, lists and the
Catalan count of Ch 5) → heaps, hashing and graph storage (Ch 7, need complete trees in arrays, lists
for chaining and adjacency lists).

**Nexus:** the `c` subject tree (`content/nexus/c.json`, PYQ subject `pds`) is rebuilt with one node
per lesson in this order, zones = chapters, and `gate.notesSubject = "pds"`; node ids that other
subjects reference (`c-basics`, `pointers`, `dynamic-memory`, `recursion`, `linked-lists`,
`stacks-queues`, `bst`, `heaps`, `hashing`) are kept as the ids of the matching lesson nodes.

---

## Chapter 1 · C foundations: values, control flow and functions (`01-c-foundations`)
Live Lab: **C Tracer** (`c-tracer`): a step-by-step interpreter for a small C subset (int/char/
unsigned, operators with precedence, if/switch/loops, functions with static/auto locals, pointers to
scalars) that shows the expression tree, the value of every variable after each step, the call stack
with its activation records and the static area. Tabs: `expr` (evaluate an expression step by step:
precedence, promotion, short circuit, side effects), `trace` (run a program: loops, switch
fall-through, static variables, scope). Backed by the same evaluator as `_checks/pds/ctrace.py`.

### pds-01-01-types-operators · Types, operators and expressions
- Prerequisites: none (Digital Logic two's complement helps: `dl:signed-numbers`)
- Sub-topics: integer and floating types, sizes and ranges (signed/unsigned, two's complement);
  constants (decimal, octal `011`, hex, char `'A'` = 65); integer division and `%` with negatives;
  implicit conversions (integer promotion, usual arithmetic conversions, the signed→unsigned trap);
  overflow and wrap-around (unsigned modulo 2ⁿ; signed overflow is undefined); operators and their
  precedence/associativity table; `++`/`--` pre and post; assignment operators; relational and
  logical operators, truth values, short-circuit `&&` `||`; conditional `?:`; bitwise `& | ^ ~ << >>`
  and shifts as ×2/÷2; `sizeof`; comma operator; order of evaluation vs precedence, sequence points,
  unspecified argument order and undefined `i++ + i++`
- Sets: A 5–10 (intro); B 109–119, 223–225; C 258–263, 270–271, 297–306 (solved output questions);
  E 540, 543, 545
- pyq_topics: pds/c, pds/c-prog
- PYQs (11; c, c-prog): `cse-1991-a-4-i`, `cse-1993-a-2-5`, `it-2004-it-15`, `cse-2008-cs-18`, `cse-2014-2-cs-10`, `cse-2014-2-cs-11`, `cse-2017-1-cs-53`, `cse-2017-2-cs-54`, `cse-2021-1-cs-37`, `cse-2022-cs-34`, `cse-2024-2-cs-3`
- Time: 65 min
- Diagrams/animations: expression tree evaluated bottom-up with promotions shown on the edges;
  precedence ladder; short-circuit gate that skips the right operand (animated); unsigned number
  circle (wrap-around); bit-shift strip
- Practice themes: evaluate expressions; signed/unsigned comparisons; short-circuit side effects;
  bitwise puzzles; overflow
- Gaps: undefined vs unspecified behaviour (no set separates them cleanly; the sets call
  `a++ + ++a` "compiler dependent"); **GAP** usual arithmetic conversions

### pds-01-02-control-flow · Control flow and loop tracing
- Prerequisites: types-operators
- Sub-topics: if/else and the dangling else; switch with fall-through, default anywhere, break;
  while, do-while, for (all three parts optional, comma in for); break/continue; goto and structured
  equivalents (`repeat…until` ↔ while); counting iterations exactly (arithmetic, halving and
  doubling loops: ⌊log₂ n⌋ + 1); nested loops and closed-form sums; loops with floats; infinite
  loops and termination
- Sets: B 113, 119, 225; C 280–281, 295; E 540, 545
- pyq_topics: pds/c
- PYQs (12; c): `cse-1991-a-4-ii`, `cse-1995-a-4`, `cse-2003-cs-88`, `cse-2006-cs-15`, `it-2007-cs-31`, `cse-2012-cs-3`, `cse-2013-cs-31`, `cse-2014-1-cs-41`, `cse-2015-3-cs-48`, `cse-2018-cs-32`, `cse-2019-cs-52`, `cse-2024-1-cs-8`
- Time: 60 min
- Diagrams/animations: flowcharts of while vs do-while vs for; switch fall-through ladder (animated);
  iteration table for a halving loop; nested-loop grid that counts executions
- Practice themes: iteration counts; switch outputs; dangling else; closed forms of loop sums

### pds-01-03-loop-algorithms · Loop algorithms, invariants and correctness
- Prerequisites: control-flow
- Sub-topics: what a loop invariant is (initialisation, maintenance, termination) and how to prove a
  loop correct; postconditions; classic loops: Euclid's GCD by subtraction and by remainder; fast
  exponentiation (square-and-multiply) and its invariant `res·aᵇ = Xʸ`; Horner's rule; digit
  extraction, reversal and alternate digits; integer division by repeated subtraction; integer
  square root; Newton/Heron square root; series sums (eˣ); swap without a temporary (and why it
  fails for aliases and overflow); maximum-subarray brute force
- Sets: B 157–158 (Horner), 234 (division invariant); C 297–306; E 543 (loop invariants)
- pyq_topics: pds/c
- PYQs (16; c): `cse-1991-a-1-vi`, `cse-1991-a-3-viii`, `cse-1993-ii-a-7-4`, `cse-1995-a-28`, `cse-2003-cs-1`, `cse-2004-cs-32`, `cse-2004-cs-41`, `cse-2004-cs-42`, `cse-2015-1-cs-33`, `cse-2016-2-cs-35`, `cse-2017-2-cs-37`, `cse-2020-cs-48`, `cse-2021-1-cs-48`, `cse-2024-1-cs-38`, `cse-2025-1-cs-53`, `cse-2025-2-cs-23`
- Time: 70 min
- Diagrams/animations: GCD subtraction staircase (animated); square-and-multiply trace with the
  invariant checked each step; Horner chain; digit-peeling conveyor
- Practice themes: find the invariant; what does this loop compute; termination conditions
- Gaps: **GAP** invariant proofs (the sets only state invariants)

### pds-01-04-storage-classes · Functions, storage classes and lifetime
- Prerequisites: control-flow
- Sub-topics: function definition, declaration and prototype; implicit declaration (C89 `int`
  default, C99 error); argument conversions; return values; activation records and the run-time
  stack; storage classes `auto`, `static` (local and file), `extern`, `register` (no `&`); scope vs
  lifetime (extent); static locals initialised once (zero by default); memory segments (text, data,
  bss, heap, stack); tracing programs with static counters; functions as expression operands and
  unspecified call order
- Sets: B 120–130, 225–227; C 264–267, 281–283; E 543
- pyq_topics: pds/c
- PYQs (13; c, c-prog): `cse-2000-a-2-20`, `it-2004-it-59`, `cse-2005-cs-32`, `cse-2012-cs-48`, `cse-2012-cs-49`, `cse-2015-2-cs-38`, `cse-2015-3-cs-54`, `cse-2016-1-cs-12`, `cse-2017-1-cs-55`, `cse-2019-cs-18`, `cse-2019-cs-27`, `cse-2023-cs-25`, `cse-2025-2-cs-53`
- Time: 60 min
- Diagrams/animations: memory segments map; activation-record stack that pushes and pops while a
  static counter in the data segment keeps its value (animated)
- Practice themes: outputs with static/auto locals; prototype errors; storage-class matching

### pds-01-05-scope-binding · Scope: blocks, static and dynamic scoping
- Prerequisites: storage-classes
- Sub-topics: block scope and shadowing; file scope; redeclaration rules (same scope vs nested);
  linkage; static (lexical) scoping vs dynamic scoping, how a non-local name is resolved (static
  chain vs call chain); scope vs lifetime once more; Pascal nested procedures
- Sets: B 128–130; C 297–306
- pyq_topics: pds/c
- PYQs (7; c): `cse-1991-b-9-b`, `cse-1993-ii-a-7-3`, `cse-2001-a-44`, `cse-2003-cs-89`, `it-2008-it-51`, `cse-2026-1-cs-24`, `cse-2026-2-cs-9`
- Time: 45 min
- Diagrams/animations: nested-block boxes with the name lookup arrow; static vs dynamic resolution
  side by side (animated: the same call sequence resolves `a` two ways)
- Practice themes: shadowing outputs; static vs dynamic scope outputs; legal redeclarations
- Gaps: **GAP** dynamic scoping (only one short example in the sets)

### pds-01-06-parameter-passing · Parameter passing: value, reference, value-result, name; macros
- Prerequisites: scope-binding
- Sub-topics: call by value (C's only mechanism), simulating reference with pointers; call by
  reference (Pascal `var`, C++ `&`); aliasing and why it changes results; call by value-result
  (copy-in/copy-out); call by name (thunks, re-evaluation); macros vs functions (textual
  substitution, side effects, missing parentheses); C++ references briefly
- Sets: B 140–142, 229, 233; C 297–306; E 543
- pyq_topics: pds/c
- PYQs (9; c): `cse-1991-b-9-a`, `cse-1993-ii-a-7-1`, `cse-1993-ii-a-7-2`, `cse-1995-a-29`, `cse-1998-a-48`, `cse-2000-a-1-16`, `cse-2001-a-42`, `cse-2004-cs-2`, `it-2008-it-50`
- Time: 55 min
- Diagrams/animations: the same call under four mechanisms (four memory panels, animated); alias
  arrows; macro expansion step
- Practice themes: outputs under each mechanism; aliasing; macro pitfalls
- Gaps: **GAP** value-result and name (only one-line mentions in the sets)

### pds-01-07-language-toolchain · Paradigms, structured programming and the toolchain
- Prerequisites: parameter-passing
- Sub-topics: programming paradigms (imperative, object-oriented, functional, logic); structured
  programming and goto; type systems (static/dynamic, strong/weak); preprocessor and macros
  (conditional expansion); assembler passes and the location counter; object modules, relocation,
  external symbols and linkers; loaders; subroutines vs coroutines vs macros
- Sets: B 120, 233; C 292–294 (macros, conditional compilation)
- pyq_topics: pds/c, pds/c-prog
- PYQs (10; c, c-prog): `cse-1993-ii-a-7-6`, `cse-1994-b-39-a`, `cse-1994-b-40-a`, `cse-1994-b-40-b`, `cse-1995-a-11`, `cse-1995-a-14`, `cse-1997-a-9`, `cse-2003-cs-24`, `cse-2004-cs-1`, `cse-2004-cs-90`
- Time: 35 min (optional depth for older PYQs)
- Diagrams/animations: source → preprocessor → compiler → assembler → linker → loader pipeline
  (animated); two-pass assembler symbol table
- Practice themes: true/false on toolchain facts; paradigm matching
- Gaps: **GAP** assemblers, linkers and coroutines (pre-2005 syllabus; written from textbooks)

---

## Chapter 2 · Pointers, arrays, strings and memory (`02-pointers-memory`)
Live Lab: **Memory Inspector** (`memory-lab`): a byte-addressed memory grid with variables, arrays,
strings and structs laid out at chosen addresses; type a C expression (`*p`, `p + 1`, `*(*(a+1)+2)`,
`&a + 1`, `p->c`, casts) and it shows the type, the address arithmetic and the value, with arrows from
pointers to their targets. Tabs: `pointers` (scalars, pointer to pointer, swaps), `arrays` (1D/2D/3D,
arrays of pointers, `sizeof`), `strings` (char arrays vs literals, strlen vs sizeof). Backed by
`_checks/pds/memlib.py`.

### pds-02-01-pointers · Pointers and indirection
- Prerequisites: parameter-passing
- Sub-topics: addresses, `&` and `*`; pointer types and what dereferencing reads; NULL; pointer
  assignment vs assignment through a pointer; pointers as parameters (changing the caller's
  variable; changing the local pointer changes nothing); pointer to pointer; swap functions
  (correct, wrong, arithmetic swap and aliasing); `scanf` with pointers; reading declarations
  (right-left rule): arrays of pointers, pointers to functions, functions returning pointers
- Sets: A 11–16 (address view); B 133–142, 227–229; C 267–269, 274–276, 297–306; E 543
- pyq_topics: pds/c
- PYQs (15; c, c-prog): `cse-2000-a-1-11`, `cse-2005-cs-1`, `cse-2006-cs-57`, `it-2006-cs-50`, `cse-2008-cs-60`, `cse-2010-cs-11`, `cse-2014-1-cs-10`, `cse-2015-1-cs-11`, `cse-2016-1-cs-15`, `cse-2016-2-cs-12`, `cse-2017-2-cs-14`, `cse-2018-cs-29`, `cse-2022-cs-11`, `cse-2025-1-cs-24`, `cse-2026-2-cs-50`
- Time: 65 min
- Diagrams/animations: box-and-arrow memory diagram where `p = q` re-aims an arrow and `*p = 2`
  changes a box (animated); call frames for `f(&i, &j)`; declaration spiral
- Practice themes: outputs with pointer parameters; pointer to pointer; declarations

### pds-02-02-pointers-arrays · Pointer arithmetic, arrays and multidimensional arrays
- Prerequisites: pointers
- Sub-topics: array name decay; `a[i] ≡ *(a + i) ≡ i[a]`; pointer arithmetic scaled by the element
  size; pointer difference; comparisons; `&a` vs `a` vs `&a[0]` (types and `+1` steps); arrays of
  pointers vs pointers to arrays; 2D arrays as arrays of arrays (`*(*(a + i) + j)`, `a + 1` jumps a
  row); 3D initialisation and brace elision; passing arrays to functions (`sizeof` loses the length);
  lvalues: what can be assigned
- Sets: B 135–139, 228, 231; C 268–269, 296, 300; B 254
- pyq_topics: pds/c, pds/arrays, pds/c-prog
- PYQs (12; arrays, c, c-prog): `cse-2003-cs-2`, `it-2006-cs-51`, `it-2008-it-52`, `cse-2015-1-cs-35`, `cse-2015-3-cs-26`, `cse-2019-cs-24`, `cse-2019-cs-53`, `cse-2020-cs-22`, `cse-2021-2-cs-10`, `cse-2022-cs-33`, `cse-2024-2-cs-26`, `cse-2025-2-cs-52`
- Time: 65 min
- Diagrams/animations: memory strip with `p`, `p + 1`, `&a + 1` jumps (animated); 2D array as rows
  with `a`, `*a`, `a[1]` arrows; array of pointers to rows
- Practice themes: pointer-arithmetic outputs; 2D/3D indexing; lvalue questions

### pds-02-03-strings · Strings
- Prerequisites: pointers-arrays
- Sub-topics: char arrays and the terminating `'\0'`; string literals (read-only storage) vs arrays
  initialised from literals; `strlen` vs `sizeof`; `printf("%s")` from an offset; walking a string
  with pointers; copying, reversing, overlapping copies; character arithmetic (ASCII); counting
  characters (anagram); find-and-replace pitfalls; head/tail string operations
- Sets: B 151–152, 230, 254; C 283–286, 295
- pyq_topics: pds/c
- PYQs (11; c): `cse-1995-a-34`, `cse-2004-cs-33`, `it-2005-cs-53`, `it-2008-it-49`, `cse-2011-cs-22`, `cse-2013-cs-50`, `cse-2013-cs-51`, `cse-2015-3-cs-7`, `cse-2017-2-cs-55`, `cse-2024-2-cs-23`, `cse-2025-2-cs-9`
- Time: 55 min
- Diagrams/animations: string as a byte row with the terminator; reverse-copy that copies `'\0'` to
  the front (animated); overlapping copy
- Practice themes: string outputs; strlen/sizeof; pointer walks

### pds-02-04-structs-unions · Structures, unions and type declarations
- Prerequisites: strings
- Sub-topics: struct declaration and member access (`.` and `->`, precedence with `++`); struct
  layout, padding and alignment (and "ignoring alignment" questions); `sizeof` of structs and unions;
  unions share storage; Pascal variant records; structs passed by value vs by pointer; arrays of
  structs; typedef; self-referential structs; casting a struct pointer to `char *`; enums and bit
  fields briefly
- Sets: B 112, 161–163, 232; C 289–292; E 543
- pyq_topics: pds/c
- PYQs (5; c): `cse-1995-a-36`, `cse-2000-a-1-17`, `it-2004-it-61`, `it-2006-cs-49`, `cse-2018-cs-2`
- Time: 45 min
- Diagrams/animations: struct layout ruler with padding; union overlay (animated); array of structs
  with `p++->c` steps
- Practice themes: sizeof; member access precedence; union reinterpretation

### pds-02-05-dynamic-memory · Memory layout, malloc and free, leaks and dangling pointers
- Prerequisites: structs-unions
- Sub-topics: stack vs heap vs static data; malloc/calloc/realloc/free; `void *` and casts; checking
  for NULL; memory leaks (lost references); dangling pointers (freed memory, address of a local
  returned); uninitialised pointers; double free; what lives where (locals, statics, literals,
  malloc'd blocks); garbage collection and reference counting (concept)
- Sets: B 131–132, 164, 227, 230, 233; C 272–273, 286–289
- pyq_topics: pds/c
- PYQs (6; c): `cse-1993-ii-a-7-5`, `cse-2000-a-1-12`, `cse-2001-a-43`, `cse-2017-1-cs-13`, `cse-2017-2-cs-2`, `cse-2026-2-cs-7`
- Time: 45 min
- Diagrams/animations: heap block allocated, pointer moved away (leak), block freed while pointer
  remains (dangling) (animated); segment map
- Practice themes: classify the bug; where is it stored; outputs with malloc

---

## Chapter 3 · Recursion (`03-recursion`)
Live Lab: **Recursion Tracer** (`recursion-lab`): pick a recursive function from a menu (or the
lesson's PYQ functions) and an argument; it draws the call tree node by node with the call stack
beside it, prints output in the order it happens (before/after the recursive calls), and counts calls
and maximum depth. Tabs: `tree` (call tree and output), `count` (calls and depth against n with the
recurrence). Backed by `_checks/pds/reclib.py`.

### pds-03-01-recursion-basics · Recursion: definitions, base cases and return values
- Prerequisites: storage-classes, pointers
- Sub-topics: recursive definition, base case and progress; how a call executes (activation record,
  return address); evaluating a return-value recursion by substitution (bottom-up table);
  recursion on numbers (digit sums in base r, binary, power, binomial via Pascal's rule and the
  missing base case), on arrays and pointers (`f(a + 1, n − 1)`), nested recursion (McCarthy 91);
  recursion vs iteration; tail recursion
- Sets: A 53–56; B 121–127, 143–150, 225–226; C 281–283; E 544
- pyq_topics: pds/recursion
- PYQs (13; recursion): `cse-1994-a-29`, `cse-1995-a-52-a`, `cse-1998-a-47`, `cse-1999-a-49`, `it-2005-cs-57`, `it-2006-cs-52`, `cse-2010-cs-35`, `cse-2011-cs-48`, `cse-2011-cs-49`, `cse-2016-2-cs-37`, `cse-2021-2-cs-23`, `cse-2025-1-cs-51`, `cse-2026-2-cs-51`
- Time: 60 min
- Diagrams/animations: call stack growing and unwinding with return values flowing back (animated);
  substitution table
- Practice themes: return values; missing base cases; what does it compute

### pds-03-02-recursion-output-order · Recursion and output order: head, tail and tree recursion
- Prerequisites: recursion-basics
- Sub-topics: statements before the call run on the way down, after the call on the way up; printing
  in reverse (getchar/putchar reversal, string reversal); binary conversion by `f(n/2)` then print;
  two calls per level (output of `abc("123")`); mutual (indirect) recursion; pass-by-value locals in
  each frame
- Sets: A 53–56; B 123–127; C 496 (triple order)
- pyq_topics: pds/recursion
- PYQs (9; recursion): `cse-2001-b-61-a`, `it-2004-it-60`, `cse-2005-cs-31`, `cse-2008-cs-61`, `it-2008-it-82`, `it-2008-it-83`, `cse-2015-2-cs-15`, `cse-2017-1-cs-35`, `cse-2024-1-cs-9`
- Time: 50 min
- Diagrams/animations: call tree with "print" marks placed before/after children (animated Euler
  walk); stack of frames for getchar reversal
- Practice themes: predict the output; fill the blanks so a string prints reversed

### pds-03-03-recursion-counting · Counting calls, stack depth and non-termination
- Prerequisites: recursion-output-order
- Sub-topics: call trees; counting calls with a recurrence C(n) = 1 + ΣC(sub); Fibonacci call counts
  (2F(n+1) − 1); Towers of Hanoi (2ⁿ − 1 moves, the recursive structure); maximum stack depth = height
  of the call tree (space); exponential `f(n−1) + f(n−1)`; recurrences for time; termination and
  infinite recursion (post-decrement, n/2 of negatives, Collatz-like); recursion with a global counter
- Sets: A 55–59; B 126–127, 148, 226; D 524 (Hanoi); E 544
- pyq_topics: pds/recursion, pds/c-prog, pds/c
- PYQs (14; c-prog, recursion): `cse-1991-a-1-x`, `cse-1994-b-43`, `cse-2001-b-61-b`, `cse-2002-b-59`, `cse-2004-cs-83`, `it-2007-cs-27`, `cse-2015-2-cs-11`, `cse-2015-3-cs-39`, `cse-2017-1-cs-36`, `cse-2018-cs-21`, `cse-2018-cs-45`, `cse-2019-cs-26`, `cse-2021-2-cs-49`, `cse-2026-1-cs-51`
- Time: 55 min
- Diagrams/animations: Fibonacci call tree with counts per level; Hanoi moves (animated three pegs);
  depth meter
- Practice themes: number of calls; stack depth; does it terminate

### pds-03-04-recursion-state · Recursion with static, global and reference state
- Prerequisites: recursion-counting, parameter-passing
- Sub-topics: one static/global variable shared by all frames vs a fresh local per frame; reading a
  static after the recursive call returns (it may have changed); pointer parameters threaded through
  calls (`fun(n, &x)`); call by reference in recursion (`f(&x, c)`); Pascal procedures that update a
  global after the call
- Sets: A 57–59 (GATE 2013, 2007); B 144–147, 234
- pyq_topics: pds/recursion, pds/c
- PYQs (10; c, recursion): `cse-1997-a-54-a-i`, `cse-1997-a-54-a-ii`, `cse-1997-a-54-b`, `cse-2004-cs-31`, `cse-2007-cs-42`, `cse-2009-cs-18`, `cse-2013-cs-42`, `cse-2014-2-cs-42`, `cse-2016-1-cs-35`, `cse-2020-cs-46`
- Time: 55 min
- Diagrams/animations: frames stacked beside a single static box that every frame points at
  (animated); reference parameter arrow shared by frames
- Practice themes: outputs with static counters; pointer-threaded recursion

---

## Chapter 4 · Arrays and linked lists (`04-arrays-lists`)
Live Lab: **List Lab** (`list-lab`): a linked-list playground. Build a singly, doubly or circular
list, run operations (insert/delete at head, tail, after a node, reverse, swap pairs, remove
duplicates, move last to front, detect a cycle) step by step with pointer arrows re-aimed one
statement at a time; plus an array-address tab that computes row-major/column-major/triangular
addresses with the formula expanded. Tabs: `list`, `address`. Backed by `_checks/pds/listlib.py`.

### pds-04-01-array-addressing · Array storage and address computation
- Prerequisites: pointers-arrays
- Sub-topics: 1D address `base + (i − lb)·w`; 2D row-major and column-major with arbitrary bounds;
  nD row-major (Horner form); lower/upper triangular and banded matrices packed into 1D (row and
  column order), symmetric matrices; Z/diagonal layouts; strides and the loop order that follows
  memory (cache, row-major traversal)
- Sets: A 11–22; B 153–157, 230–231, 252, 254–255; C 311–314; D 523
- pyq_topics: pds/arrays
- PYQs (4; arrays): `cse-1994-a-11`, `cse-1998-a-49`, `cse-2002-a-33`, `cse-2015-3-cs-30`
- Time: 45 min
- Diagrams/animations: 2D grid unrolled into memory row by row vs column by column (animated);
  triangle packing with the element count before row i
- Practice themes: addresses with odd bounds; triangular index; column-major

### pds-04-02-array-algorithms · Array algorithms and their invariants
- Prerequisites: array-addressing, loop-algorithms
- Sub-topics: rotation by reversal and by cycles (juggling, gcd(n, k) cycles); in-place transpose
  (and the double-swap bug); merging two sorted arrays and its loop invariant; binary search and
  its off-by-one/non-termination bugs; frequency counting (counting array); sparse sets with
  uninitialised arrays (constant-time membership); Young tableaux; maximum in an array and invariants;
  bubble-sort passes; sliding window / two pointers for subarrays with a bound
- Sets: A 11–16 (min/max, search); B 159–160, 232; C 311–314
- pyq_topics: pds/arrays
- PYQs (18; arrays): `cse-1992-b-9`, `cse-1993-ii-b-12`, `cse-1994-a-30`, `cse-1995-a-52-b`, `cse-1996-b-62`, `cse-2000-a-2-15`, `cse-2000-b-15-a`, `cse-2000-b-15-b`, `cse-2000-b-15-c`, `it-2004-it-58`, `cse-2005-cs-5`, `cse-2006-cs-53`, `cse-2008-cs-84`, `cse-2014-3-cs-10`, `cse-2015-2-cs-31`, `cse-2016-1-cs-34`, `cse-2017-2-cs-43`, `cse-2024-2-cs-32`
- Time: 70 min
- Diagrams/animations: three-reversal rotation (animated); binary search window shrinking (and
  stalling); Young tableau extract-min ripple; sparse-set cross-links
- Practice themes: trace an array algorithm; find the bug; count swaps/comparisons
- Gaps: **GAP** sparse sets and Young tableaux (not in any set)

### pds-04-03-linked-lists · Singly linked lists
- Prerequisites: dynamic-memory, structs-unions
- Sub-topics: node struct, head pointer, traversal, length, search; insertion at head/tail/after/
  before a node; deletion (head, middle, the node given only its pointer: copy-next trick and its
  last-node failure); costs table vs arrays (no random access, no binary search); reversal
  (iterative, three pointers; recursive); middle and n-th from end (two pointers); cycle detection
  (Floyd); recursive list functions (count, sortedness check); pointer bugs (NULL dereference,
  use after free); inserting n elements into a sorted list
- Sets: A 23–29; B 165–172, 235–237; C 386–411; D 525
- pyq_topics: pds/linked-lists
- PYQs (14; linked-lists): `cse-1993-ii-b-13`, `cse-1994-a-17`, `cse-1998-b-71-a`, `cse-1999-b-59-b`, `cse-2002-a-5`, `cse-2003-cs-90`, `it-2004-it-13`, `cse-2017-1-cs-8`, `cse-2020-cs-16`, `cse-2021-2-cs-35`, `cse-2022-cs-5`, `cse-2023-cs-3`, `cse-2025-1-cs-52`, `cse-2026-1-cs-29`
- Time: 65 min
- Diagrams/animations: insertion and deletion re-aiming arrows (animated); three-pointer reversal
  (animated); Floyd hare and tortoise
- Practice themes: complexity of list operations; outputs of list code; fill in the pointer step

### pds-04-04-list-variants · Doubly and circular lists; list algorithms
- Prerequisites: linked-lists
- Sub-topics: doubly linked lists (insert/delete with four links; delete given a node in O(1));
  circular lists (tail pointer gives O(1) head and tail access; concatenation in O(1)); header
  nodes; sorted lists and duplicate removal; pairwise swap of data and of links; move last to front;
  set operations on unsorted lists (union/intersection costs); XOR lists (aside)
- Sets: A 30–32; B 173–177, 237–238; C 412–428
- pyq_topics: pds/linked-lists
- PYQs (10; linked-lists): `cse-1997-a-4`, `cse-1997-a-52`, `cse-1997-b-63-a`, `cse-1997-b-63-b`, `cse-1997-b-63-c`, `cse-2004-cs-40`, `it-2005-cs-54`, `cse-2008-cs-62`, `cse-2010-cs-36`, `cse-2016-2-cs-15`
- Time: 55 min
- Diagrams/animations: DLL delete with four arrows (animated); circular list with tail pointer;
  pairwise swap
- Practice themes: link updates; complexity tables; code tracing

---

## Chapter 5 · Stacks and queues (`05-stacks-queues`)
Live Lab: **Stack & Queue Lab** (`stack-queue-lab`): push/pop/enqueue/dequeue on array and circular
implementations with front/rear/top indices; an infix → postfix converter and postfix evaluator with
the operator/operand stack shown at every token; a stack-permutation checker. Tabs: `stack`,
`expression`, `queue`. Backed by `_checks/pds/sqlib.py`.

### pds-05-01-stacks · Stacks and stack permutations
- Prerequisites: array-addressing, linked-lists
- Sub-topics: stack ADT (LIFO), array and linked implementations, overflow/underflow, top
  conventions; two stacks in one array growing towards each other (full condition); n stacks;
  balanced parentheses; stack permutations (which outputs are possible; the 312 pattern; count =
  Catalan C(2n, n)/(n + 1)); average lifetime of an element; stacks defined recursively; min-stack
  (records with a running minimum); costs of operations
- Sets: A 37–42; B 178–183, 238–239; C 315–323, 342–357; D 524; E 542
- pyq_topics: pds/stacks-queues
- PYQs (10; stacks-queues): `cse-1991-a-3-vii`, `cse-1994-a-14`, `cse-1996-a-12`, `cse-2003-cs-64`, `cse-2004-cs-3`, `cse-2004-cs-5`, `it-2004-it-52`, `it-2005-cs-13`, `cse-2024-2-cs-38`, `cse-2025-2-cs-35`
- Time: 60 min
- Diagrams/animations: push/pop with the top index (animated); two stacks meeting in the middle;
  permutation checker railway
- Practice themes: possible output orders; Catalan counts; full/empty conditions

### pds-05-02-expressions · Expression notation, conversion and evaluation
- Prerequisites: stacks
- Sub-topics: infix, prefix, postfix (reverse Polish); precedence and associativity (right-assoc `^`,
  unary minus); infix → postfix with an operator stack (what is essential: the stack, the precedence
  table); infix → prefix; postfix and prefix evaluation with an operand stack; maximum stack size
  during evaluation; evaluating with two stacks; expression trees (link to Ch 6)
- Sets: A 43–52; B 183–187, 239–240; C 323–339, 350; E 542
- pyq_topics: pds/stacks-queues
- PYQs (8; stacks-queues): `cse-1997-a-7`, `cse-1998-b-71-b`, `cse-2000-b-13-b-i`, `cse-2000-b-13-b-ii`, `cse-2002-a-44`, `cse-2007-cs-38`, `it-2007-cs-32`, `cse-2015-3-cs-12`
- Time: 55 min
- Diagrams/animations: token-by-token conversion with the operator stack (animated); postfix
  evaluation stack (animated)
- Practice themes: convert; evaluate; top-of-stack after k tokens

### pds-05-03-queues · Queues, circular queues, deques and simulations
- Prerequisites: stacks
- Sub-topics: queue ADT (FIFO); linear array queue and its wasted space; circular queue (full/empty
  with one empty slot vs a count; `(rear + 1) mod n == front`); linked queue (front/rear pointers,
  which end to insert at); circular linked list with one pointer as a queue; deques and restricted
  deques; queue with two stacks (amortised cost, push/pop counts); stack with queues; reversing a
  queue with a stack or recursion; priority queue as an ADT (implementations compared, heap in Ch 7);
  mixed stack/queue simulations
- Sets: A 33–36; B 188–196, 249–250; C 358–385; D 525; E 542
- pyq_topics: pds/stacks-queues, pds/linked-lists
- PYQs (16; linked-lists, stacks-queues): `cse-1994-b-48`, `cse-2000-b-13-a`, `cse-2001-a-41`, `cse-2004-cs-36`, `cse-2006-cs-49`, `it-2007-cs-30`, `cse-2012-cs-35`, `cse-2014-2-cs-41`, `cse-2016-1-cs-10`, `cse-2016-1-cs-41`, `cse-2017-2-cs-13`, `cse-2018-cs-3`, `cse-2021-1-cs-21`, `cse-2022-cs-52`, `cse-2023-cs-49`, `cse-2026-2-cs-40`
- Time: 60 min
- Diagrams/animations: circular queue ring with front/rear chasing (animated); two-stack queue
  transfer (animated); deque ends
- Practice themes: full/empty conditions; operation counts; simulation outputs

---

## Chapter 6 · Trees and binary search trees (`06-trees`)
Live Lab: **Tree Lab** (`tree-lab`): build a binary tree (or a BST by inserting keys, or an AVL tree
with rotations shown), then run preorder/inorder/postorder/level-order with the visiting cursor;
rebuild a tree from two traversals; delete keys from a BST (three cases); check AVL balance factors.
Tabs: `traverse`, `build` (from traversals), `bst`, `avl`. Backed by `_checks/pds/treelib.py`.

### pds-06-01-binary-trees · Binary trees: terms, properties and node counts
- Prerequisites: recursion-counting, linked-lists
- Sub-topics: rooted tree terms (degree, leaf, internal, level, depth, height conventions); binary
  tree definition (ordered, empty tree); n₀ = n₂ + 1 and its proof (edge counting and induction);
  full (0/2) trees: n = 2i + 1, L = i + 1; k-ary full trees L = (k − 1)i + 1; max nodes at depth d and
  in height h (2ʰ⁺¹ − 1); min/max height for n nodes; NULL links n + 1; trees where every node has an
  odd number of descendants; weighted external path length (Huffman link)
- Sets: A 60–66, 74–77; B 197–202, 241–242; C 429–440, 490–493; D 526
- pyq_topics: pds/trees
- PYQs (18; trees): `cse-1991-a-1-viii`, `cse-1993-ii-b-16`, `cse-1994-a-28`, `cse-1995-a-17`, `cse-1998-a-24`, `cse-1998-a-46`, `cse-1999-b-60-a`, `cse-2002-a-34`, `cse-2005-cs-36`, `it-2006-cs-9`, `cse-2007-cs-12`, `cse-2007-cs-43`, `cse-2010-cs-10`, `cse-2015-1-cs-25`, `cse-2015-2-cs-10`, `cse-2015-3-cs-25`, `cse-2025-2-cs-3`, `cse-2026-1-cs-23`
- Time: 65 min
- Diagrams/animations: growing a full tree one internal node at a time (leaves +1) (animated);
  perfect tree level counts; height conventions side by side
- Practice themes: leaves from degrees; k-ary leaf counts; height bounds; induction proofs

### pds-06-02-tree-traversals · Traversals and reconstruction
- Prerequisites: binary-trees
- Sub-topics: preorder, inorder, postorder (recursive and with a stack), level order with a queue;
  traversals of general (ordered) trees and their inorder convention; last node visited; which pairs
  identify a tree (inorder + pre/post yes; pre + post only for full trees); reconstruction from
  in + pre and in + post; identifying which sequence is which; BFS/DFS order on trees; expression
  trees and their traversals (prefix/postfix), evaluating with 0/1 leaves, new-order variants
- Sets: A 67–73; B 206–210, 243; C 445–451, 458–459, 496–497
- pyq_topics: pds/trees
- PYQs (17; trees): `cse-1991-a-1-ix`, `cse-1994-a-31`, `cse-1996-a-15`, `cse-1998-b-72`, `cse-2000-a-2-16`, `cse-2004-cs-35`, `cse-2004-cs-6`, `it-2004-it-54`, `cse-2007-cs-39`, `it-2008-it-46`, `cse-2014-2-cs-39`, `cse-2014-3-cs-12`, `cse-2016-2-cs-11`, `cse-2016-2-cs-36`, `cse-2018-cs-20`, `cse-2021-2-cs-16`, `cse-2026-2-cs-2`
- Time: 65 min
- Diagrams/animations: Euler tour with pre/in/post marks (animated); reconstruction by splitting at
  the root (animated); level-order queue
- Practice themes: traversals of a drawn tree; reconstruct; height after reconstruction

### pds-06-03-tree-counting · Counting binary trees and representing trees
- Prerequisites: tree-traversals
- Sub-topics: number of unlabelled binary trees with n nodes (Catalan, recurrence and closed form);
  labelled trees (× n!); trees with a given preorder/postorder (Catalan); trees with maximum height
  (2ⁿ⁻¹); array representation (2i, 2i + 1; 0-based variants; space for skewed trees); level of X[i];
  nested/parenthesised representations; left-child right-sibling representation of general trees;
  threaded trees (aside)
- Sets: A 63–66; B 198–199, 203–206, 241; C 437–440, 450–457, 497, 507
- pyq_topics: pds/trees
- PYQs (6; trees): `cse-1995-a-54`, `cse-2000-a-1-14`, `cse-2002-b-54`, `cse-2006-cs-13`, `it-2006-cs-73`, `cse-2007-cs-13`
- Time: 50 min
- Diagrams/animations: the five 3-node shapes and the Catalan recurrence split (animated); array
  slots for a skewed tree; LCRS conversion
- Practice themes: count shapes; array index questions; nested representation

### pds-06-04-tree-recursion · Recursive functions on trees
- Prerequisites: tree-counting, recursion-state
- Sub-topics: the pattern f(t) = combine(f(left), f(right), t); height/depth (with the −1/0 base
  case trap); counting nodes, leaves, full nodes, nodes with one child; sums and expression values;
  subtree sizes and counting subtrees of size k in O(n) (postorder); left-child right-sibling
  recursion; mystery functions; mirror and identical trees
- Sets: A 67–73; B 209–212; C 498–500
- pyq_topics: pds/trees
- PYQs (7; trees): `cse-2001-b-62-c`, `cse-2004-cs-43`, `cse-2007-cs-46`, `cse-2012-cs-47`, `cse-2014-1-cs-12`, `cse-2014-3-cs-41`, `cse-2023-cs-37`
- Time: 50 min
- Diagrams/animations: postorder evaluation of a mystery function with values bubbling up
  (animated)
- Practice themes: what does this function return; fill the statements

### pds-06-05-bst · Binary search trees: search, insert, delete
- Prerequisites: tree-traversals
- Sub-topics: BST property (whole-subtree, not just children); search and its path; valid search
  sequences (interval narrowing); insertion; building by insertion and the resulting shape/height;
  minimum, maximum, predecessor and successor; deletion (leaf, one child, two children with
  successor/predecessor); costs O(h) and the skewed worst case; inorder is sorted (and checking a
  sequence); range queries O(log n + k); which data structure supports which operations in O(log n);
  picking an element smaller than the max in O(1); duplicates conventions
- Sets: A 78–83; B 211–215, 244; C 461–471; D 527
- pyq_topics: pds/bst
- PYQs (22; bst): `cse-1996-a-39`, `cse-1996-a-52`, `cse-2001-b-62-a`, `cse-2001-b-62-b`, `cse-2003-cs-19`, `cse-2003-cs-63`, `cse-2004-cs-4`, `it-2006-cs-45`, `it-2007-cs-29`, `it-2008-it-71`, `cse-2013-cs-7`, `cse-2014-3-cs-39`, `cse-2015-1-cs-10`, `cse-2015-1-cs-23`, `cse-2015-3-cs-13`, `cse-2017-1-cs-6`, `cse-2020-cs-41`, `cse-2021-1-cs-10`, `cse-2024-2-cs-29`, `cse-2025-1-cs-16`, `cse-2025-2-cs-25`, `cse-2026-2-cs-39`
- Time: 70 min
- Diagrams/animations: insertion path (animated); deletion of a two-child node via the successor
  (animated); search interval shrinking on a number line
- Practice themes: build by insertion; valid search paths; deletion results; complexities

### pds-06-06-bst-orders · BST traversals, construction and counting
- Prerequisites: bst, tree-counting
- Sub-topics: a BST is fixed by its preorder or postorder alone (inorder = sorted); converting
  preorder ↔ postorder; validating a preorder/postorder; building from postorder in O(n); number of
  BSTs on n keys (Catalan) and the recurrence; insertion orders that give the same BST (counting
  interleavings), the first inserted key is the root; orders that give a complete tree; search-path
  counting with constraints; BST that is also a complete tree (k-th largest by array index)
- Sets: A 78–83; B 244; C 501–506; E 538
- pyq_topics: pds/bst
- PYQs (16; bst): `cse-1997-a-30`, `cse-2003-cs-6`, `cse-2005-cs-33`, `cse-2005-cs-35`, `it-2005-cs-12`, `it-2005-cs-55`, `cse-2008-cs-46`, `it-2008-it-72`, `it-2008-it-73`, `cse-2011-cs-29`, `cse-2013-cs-43`, `cse-2017-2-cs-36`, `cse-2020-cs-5`, `cse-2022-cs-18`, `cse-2026-1-cs-30`, `cse-2026-1-cs-52`
- Time: 60 min
- Diagrams/animations: preorder split at the root into "less" and "greater" runs (animated);
  interleaving count tree
- Practice themes: pre → post; count BSTs and insertion orders; positions in traversals

### pds-06-07-balanced-trees · AVL trees and other balanced trees
- Prerequisites: bst-orders
- Sub-topics: why balance; AVL definition and balance factor; the four rotations (LL, RR, LR, RL)
  on insertion; how many ancestors can become unbalanced; deletion briefly; minimum nodes N(h) =
  N(h−1) + N(h−2) + 1 (with both height conventions), maximum height for n nodes; O(log n)
  operations and inserting many keys; size-balanced and weight-balanced trees (height bounds); 2-3
  trees and B-trees of minimum degree t (properties, insertion with splits; 2-3-4 trees)
- Sets: A 84–90; B 215–219, 245; C 472–483, 487–490; D 528–533
- pyq_topics: pds/bst, pds/trees
- PYQs (13; bst, trees): `cse-1992-a-2-vii`, `cse-1996-a-14`, `cse-1997-b-60-a`, `cse-1997-b-60-b`, `cse-1998-b-73-a`, `cse-1998-b-73-b`, `cse-2002-a-37`, `cse-2003-cs-65`, `it-2005-cs-50`, `it-2008-it-12`, `cse-2009-cs-37`, `cse-2012-cs-5`, `cse-2020-cs-6`
- Time: 70 min
- Diagrams/animations: each rotation (animated); N(h) minimal AVL trees growing Fibonacci-style;
  B-tree split (animated)
- Practice themes: insert with rotations; min nodes and max height; B-tree insertion

---

## Chapter 7 · Heaps, hashing and graph representation (`07-heaps-hashing-graphs`)
Live Lab: **Heap & Hash Lab** (`heap-hash-lab`): a binary (or d-ary) heap shown as a tree and as an
array side by side (insert with sift-up, delete with sift-down, build-heap bottom-up with swap
counts); and a hash table with chaining, linear, quadratic and double hashing, showing each probe
sequence and the load factor. Tabs: `heap`, `hash`. Backed by `_checks/pds/heaplib.py` and
`hashlib_pds.py`.

### pds-07-01-heaps · Heaps: structure, array layout and where elements can be
- Prerequisites: tree-counting
- Sub-topics: complete binary tree in an array (1- and 0-based formulas: parent, children, level,
  leaves ⌊n/2⌋ + 1 … n); max/min-heap property; checking whether an array is a heap; d-ary heaps
  (0-based children di + 1 … di + d); height ⌊log₂ n⌋; where the minimum of a max-heap lives (the
  leaves) and the cost of finding it; possible positions of the k-th smallest; second largest is a
  child of the root; counting heaps on a set of keys (recurrence with the left-subtree size);
  depth of a value; finding the 7th smallest in O(1)
- Sets: A 91–94; B 219–222, 246; C 510–521
- pyq_topics: pds/heaps, pds/trees
- PYQs (18; heaps): `cse-1991-b-14-a`, `cse-2001-a-15`, `cse-2003-cs-23`, `cse-2006-cs-10`, `cse-2006-cs-76`, `it-2006-cs-44`, `it-2006-cs-71`, `cse-2009-cs-59`, `cse-2011-cs-23`, `cse-2016-2-cs-34`, `cse-2018-cs-46`, `cse-2019-cs-40`, `cse-2020-cs-47`, `cse-2021-2-cs-2`, `cse-2023-cs-2`, `cse-2024-1-cs-33`, `cse-2025-1-cs-25`, `cse-2026-1-cs-13`
- Time: 60 min
- Diagrams/animations: tree ↔ array with index arrows (animated); leaf band in the array;
  counting heaps by splitting the smallest/largest
- Practice themes: is it a heap; index formulas; counts; positions of extreme keys

### pds-07-02-heap-operations · Heap operations, build-heap and priority queues
- Prerequisites: heaps
- Sub-topics: insert (sift-up), delete-max/min (move last to root, sift-down), delete at index i,
  increase/decrease key; build-heap bottom-up in O(n) (proof by summing heights) vs n insertions
  O(n log n); counting swaps/interchanges; heapify cost and lower bounds; inserting n more elements;
  binary search on the sift-up path (comparisons vs moves); heapsort; priority queues on heaps;
  priority queue simulating a stack or a queue; meld costs across structures; d-ary insert
- Sets: A 91–94; B 220–222, 246, 250, 253; C 510–521
- pyq_topics: pds/heaps
- PYQs (21; heaps): `cse-1991-b-14-b`, `cse-1991-b-14-c`, `cse-1996-a-36`, `cse-1997-a-32`, `cse-1999-b-60-b`, `cse-2004-cs-37`, `it-2004-it-53`, `cse-2005-cs-34`, `cse-2006-cs-77`, `it-2006-cs-72`, `cse-2007-cs-47`, `cse-2008-cs-47`, `cse-2009-cs-60`, `cse-2014-2-cs-12`, `cse-2015-1-cs-32`, `cse-2015-2-cs-17`, `cse-2015-3-cs-19`, `cse-2016-1-cs-37`, `cse-2023-cs-36`, `cse-2024-1-cs-31`, `cse-2025-2-cs-28`
- Time: 65 min
- Diagrams/animations: sift-up and sift-down (animated); build-heap level by level with swap counter
  (animated)
- Practice themes: heap after operations; swap counts; complexities

### pds-07-03-hashing · Hashing
- Prerequisites: list-variants, array-addressing
- Sub-topics: direct addressing; hash functions (division, multiplication, mid-square, folding,
  digit extraction) and choosing m; collisions; chaining (load factor α = n/m can exceed 1, expected
  Θ(1 + α)); open addressing: linear probing (primary clustering, probe counts, deletion markers),
  quadratic probing (secondary clustering, not all slots reached), double hashing (h₁ + i·h₂, h₂ ≠ 0,
  coprime with m); counting insertion orders that produce a table; expected probes; dynamic/
  extendible hashing with a trie of bits
- Sets: A 99–107; B 247–248; D 533–535
- pyq_topics: pds/hashing-ds
- PYQs (10; hashing-ds): `cse-1996-a-13`, `cse-1996-b-63`, `cse-2004-cs-7`, `it-2005-cs-16`, `cse-2010-cs-52`, `cse-2010-cs-53`, `cse-2015-3-cs-17`, `cse-2020-cs-23`, `cse-2021-1-cs-47`, `cse-2025-1-cs-55`
- Time: 60 min
- Diagrams/animations: probe sequences for linear/quadratic/double hashing (animated); cluster
  growth; chaining buckets
- Practice themes: final tables; probe counts; insertion-order counting; load factor
- Gaps: **GAP** dynamic hashing (only in the PYQ)

### pds-07-04-graph-representation · Graph representation
- Prerequisites: linked-lists, array-addressing
- Sub-topics: adjacency matrix and adjacency list (space, edge test, neighbour scan, degree);
  undirected edge stored twice; in-degree from lists; checking for a universal sink in O(n) with the
  matrix; incidence matrix (aside); which representation suits which algorithm (BFS/DFS costs, link
  to Algorithms)
- Sets: A 95–98; B 252–253; E 537–540
- pyq_topics: pds/graphs-ds
- PYQs (3; graphs-ds): `it-2005-cs-84-1`, `it-2005-cs-84-2`, `cse-2016-2-cs-41`
- Time: 35 min
- Diagrams/animations: one graph as matrix and lists (animated build); sink elimination walk
  (animated)
- Practice themes: costs of operations; sink detection; degree computations

---

## Coverage of the reference sets
Every topic in the digests is placed above except: graph algorithms (BFS/DFS trees, MST, shortest
paths, SCC, articulation points; A 95–98, B 252–253, E 537–541) → the Algorithms course; sorting and
searching algorithms beyond the array lessons (E 537) → Algorithms; asymptotic notation (A 5–10) →
Algorithms (the lessons use O/Θ informally and link there); Huffman coding (C 494–495) → Algorithms
(weighted path length is introduced in pds-06-01); red-black and splay trees (C 487–490), tries and
radix trees (C 509), skip and unrolled lists (C 424–425) → mentioned as asides only (no PYQ).

## Errata
Set errors and cross-set disagreements are recorded in `content/gate-notes/_errata/pds.md`; question
bank key fixes go only through `src/gate/fixes/` with an errata entry.
