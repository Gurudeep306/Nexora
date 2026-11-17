# Compiler Design (`cd`): build plan

**State today:** nothing written. Start at N0 **after Theory of Computation's
chapters 2–5 are at least in review**, because lexing and parsing build on
them (link, never re-teach). PYQs: **214** (`cd/parsing` 87, `cd/runtime` 41,
`cd/sdt` 29, `cd/icg` 23, `cd/optimization` 18, `cd/lexical` 16; 17 flagged
`needsReview`, 10 with figures).

**Official GATE CSE syllabus (verify against the current PDF):** lexical
analysis, parsing, syntax-directed translation; runtime environments;
intermediate code generation; local optimisation; data-flow analyses: constant
propagation, liveness analysis, common sub-expression elimination.

**Prerequisites:** `toc` (regular expressions, DFAs, CFGs, ambiguity),
`pds` (stacks, trees, hashing), `coa` (registers, addressing — light).

## Suggested chapter structure (confirm or improve in N1)

| # | Chapter | Main topics |
|---|---|---|
| 1 | The compiler pipeline | Phases and passes, front/back end, symbol table, error handling; one statement traced through every phase (the running example for the whole subject) |
| 2 | Lexical analysis | Tokens, lexemes, patterns; regex → NFA → DFA for tokens; longest match and priority; input buffering (two pointers, sentinels); counting tokens in a program (a GATE favourite); lex/flex structure |
| 3 | Top-down parsing | Grammar clean-up (left recursion, left factoring), FIRST and FOLLOW, LL(1) table and conflicts, predictive parsing with a stack, recursive descent, error recovery |
| 4 | Bottom-up parsing | Handles and shift–reduce; LR(0) items and automaton; SLR(1), CLR(1), LALR(1) tables; conflicts (S/R, R/R) and how each method resolves or fails; operator precedence parsing; inclusion LL(1) ⊂ LALR(1) ⊂ CLR(1), SLR ⊂ LALR; counting states/items |
| 5 | Syntax-directed translation | SDDs, synthesized and inherited attributes, S- and L-attributed definitions, annotated parse trees, dependency graphs and evaluation order, SDT schemes with embedded actions, building ASTs and DAGs |
| 6 | Intermediate code generation | Three-address code, quadruples, triples, indirect triples, SSA (as GATE asks it), translation of expressions, arrays, booleans (short-circuit) and control flow (backpatching), counting temporaries |
| 7 | Runtime environments | Storage organisation, activation records, the call stack, static vs dynamic scoping, access links and displays, parameter passing (value, reference, value-result, name), heap and garbage collection basics |
| 8 | Optimisation and data-flow analysis | Basic blocks and leaders, CFGs, local optimisation (CSE via DAG, constant folding, copy propagation, dead code, strength reduction, algebraic identities), loop optimisation, data-flow frameworks: reaching definitions, live variables, available expressions, constant propagation; register allocation by graph colouring (concept), peephole |

## Live Labs (build in N3; register in `index.ts` and `LAB_TABS`)

| Lab id | Chapter | Tabs | What the reader does |
|---|---|---|---|
| `lexer-lab` | 2 | `tokens`, `dfa` | Type a code snippet; watch the scanner with two pointers produce tokens one by one (longest match shown), token count tallied; the combined token DFA |
| `ll1-lab` | 3 | `first-follow`, `table`, `parse` | Enter a grammar; FIRST/FOLLOW computed iteration by iteration; LL(1) table with conflicts highlighted; parse an input with stack + input + action trace |
| `lr-lab` | 4 | `items`, `tables`, `parse` | Enter a grammar; LR(0)/LR(1) item sets built with closure and goto; SLR/LALR/CLR tables with conflicts flagged and explained; shift-reduce trace with the stack |
| `sdt-lab` | 5 | `annotate`, `order` | Annotated parse tree: attribute values flowing up (synthesized) and down (inherited); dependency graph and a topological evaluation order |
| `tac-lab` | 6 | `tac`, `forms` | Expression or statement → three-address code with temporaries; the same as quadruples, triples and indirect triples; backpatching lists filling in |
| `runtime-lab` | 7 | `stack`, `scope` | Step through a program's calls: activation records pushed/popped with locals, return address, control and access links; static vs dynamic scoping resolving the same variable |
| `dataflow-lab` | 8 | `blocks`, `dag`, `liveness` | Split code into basic blocks and a CFG; build the DAG of a block and see CSE; iterate liveness / reaching definitions / available expressions to a fixed point, IN/OUT sets per round |

Viz engine upgrades needed first (see `animations.md` §3): **`stack`, `tape`
(input buffer with two pointers), `code`, `state`** (LR automaton), and `tree`.

## Animations every lesson set must include (≥ 6 per lesson; this list is the floor)
- One source line travelling through all phases (tokens → parse tree → AST →
  TAC → optimised → target code), the running example.
- Scanner with `lexemeBegin`/`forward` pointers, longest match and retract.
- Token-counting walkthrough for a C fragment (each token boxed in turn).
- Left-recursion removal and left-factoring rewriting step by step.
- FIRST and FOLLOW computed by iteration until no set changes.
- LL(1) table filling, a conflict cell turning red, and why.
- Predictive parse: stack, input and action columns, one row per step.
- LR(0) item-set construction: closure expanding, goto edges appearing.
- SLR vs LALR vs CLR on the same grammar: where the conflict appears/disappears.
- Shift-reduce parse with the handle highlighted before each reduce.
- Operator-precedence relations table and parse.
- Annotated parse tree evaluation (synthesized up, inherited down).
- Expression → DAG with shared sub-expressions merging.
- TAC generation for expressions, array access, if/while with backpatching.
- Activation records pushing and popping through recursive calls (e.g. factorial,
  Fibonacci), with access links for nested procedures.
- Static vs dynamic scoping: the same program printing different values.
- Parameter passing modes: the same call under value, reference, value-result
  and name, memory cells changing.
- Leaders → basic blocks → CFG.
- Liveness and reaching definitions iterating to a fixed point (IN/OUT tables).
- Local optimisations applied one at a time to a block (each change explained).
- Register allocation by interference-graph colouring.

## Verification (`_checks/cd/`)
Write `cdlib.py`: a tiny tokenizer for a C subset (token counting), grammar
utilities (FIRST, FOLLOW, left-recursion removal, LL(1) table), LR(0)/LR(1)
item sets and SLR/LALR/CLR tables with conflict detection, a shift-reduce
parser, an SDD evaluator, a TAC generator for an expression language, basic
block/CFG builder, and data-flow solvers. Every table, item count, conflict
claim, token count, TAC sequence and data-flow result in a lesson or PYQ is
recomputed. Cross-check the LR tables with a second method (e.g. compare LALR
by merging CLR states and by the propagation algorithm).

## Textbooks and free sources (fact-checking only)
Aho–Lam–Sethi–Ullman, *Compilers: Principles, Techniques, and Tools* (the
Dragon Book, 2nd ed.); Cooper–Torczon, *Engineering a Compiler*; Appel,
*Modern Compiler Implementation*; Stanford CS143 and MIT 6.035 lecture notes
(free); NPTEL Compiler Design; Crafting Interpreters (free online) for
intuition only.

## Traps the PYQs keep testing (make each a `:::trap`)
Every LL(1) grammar is LALR(1) (and unambiguous), but not every LALR(1) is
LL(1); left-recursive or ambiguous grammars are never LL(1); LALR merges can
create R/R conflicts but never S/R ones that CLR didn't have; the number of
LALR states equals LR(0)/SLR states; FOLLOW never contains ε; `$` belongs to
FOLLOW(start); S-attributed ⊂ L-attributed; token counting: string literals and
`++`/`<=` are one token, comments and whitespace none; triples cannot be
reordered but indirect triples can; dynamic scoping looks at the call chain,
not the text; call-by-name re-evaluates the argument each use; a variable is
live if used later before being redefined; a basic block's leaders are the
first statement, branch targets and the statement after a branch.
