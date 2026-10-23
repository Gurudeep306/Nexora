# Programming & Data Structures errata (internal)

This file records places where a reference set (A–E) is wrong, where sets disagree with each other,
or where a set disagrees with the C standard or the textbooks. Each entry gives the correct version
with a short reason; C claims were checked by compiling with the system C compiler. Lessons must teach
the **correct** version, and where a slip is a classic trap they name it in a `:::trap`. Page numbers
are PDF pages. Sets are named only by letter.

Legend: **E** = error in one set · **X** = sets disagree · **B** = question-bank note (for the PYQ
pipeline, not a set error; every bank change goes through `src/gate/fixes/`).

## 1. Cross-set disagreements (X)

| # | Topic | Disagreement | Correct version (course convention) |
|---|---|---|---|
| X1 | Tree height | A 60–62 and C 445 count edges (single node 0); B 200, 219, 245 and C 490–493 often count levels (single node 1); several AVL tables mix the two. | Height = edges (single node 0, empty tree −1). Every lesson states the convention a PYQ uses and converts. AVL minimum nodes: N(0) = 1, N(1) = 2, N(h) = N(h−1) + N(h−2) + 1 with edges; 0, 1, 2, 4, 7, 12, … with levels. |
| X2 | "Complete", "full", "strict" binary trees | A 74 "strict complete"; B 201, 242 "complete" = every node 0 or 2 children; B 204 "full" = every level full; C 431 "complete" with a garbled definition. | Full (proper/strict) = 0 or 2 children; complete = all levels full except possibly the last, filled from the left; perfect = all levels full. Each PYQ's own definition is quoted in the lesson. |
| X3 | Heap array indexing | A 91–94 and B 219–222 use 1-based arrays; C 510–518 uses 0-based (with formula slips). | Teach both: 1-based parent ⌊i/2⌋, children 2i, 2i + 1; 0-based parent ⌊(i − 1)/2⌋, children 2i + 1, 2i + 2; leaves are the last ⌈n/2⌉ positions. |
| X4 | Pointer size | B 135, 227: "size of a pointer = size of int". C 261 shows 8-byte pointers with 4-byte int. | Pointer size is the platform's address size (8 bytes on today's 64-bit systems, 4 on 32-bit) and has nothing to do with `sizeof(int)`. Old PYQs that assume 2-byte int and pointers say so. |
| X5 | Order of evaluation | B 114–115, 224 call `a++ + ++a` "compiler dependent"; C 299 gives definite answers for such expressions. | Modifying a variable twice (or reading and modifying it) without a sequence point is **undefined behaviour**; argument evaluation order is **unspecified**. GATE questions that depend on it state the order (e.g. 2024 set 2 Q3 says right to left). |
| X6 | Infix → postfix popping rule | C 327, 330, 332: pop only equal precedence / push when ≥. A 43–52 and B 185, 240: pop while the stack top has higher or equal precedence. | Pop while the top has higher precedence, or equal precedence and the incoming operator is left-associative; never pop past '('. Right-associative `^` pops only strictly higher operators. |
| X7 | Bounds vs cases | A 10 says O = worst case, Ω = best case, Θ = average. | O, Ω, Θ are upper, lower and tight bounds on a function; best/worst/average are cases. Any case can be bounded with any notation. |

## 2. Errors inside a single set (E)

### C language
- **B 135, 227:** "pointer size = int size" (see X4).
- **B 146:** `f(3, &m)` traced as 24 assumes left-to-right evaluation of operands that modify `m`;
  operand order is unspecified, clang gives 21. Teach as order-dependent.
- **B 152:** reversing `char *p = "Hello"` in place "prints nothing": writing into a string literal is
  undefined behaviour (typically a crash). Only `char p[] = "Hello"` may be modified.
- **B 234:** `unsigned short` range written 0 to 65536; it is 0 to 65535 (2¹⁶ − 1).
- **B 233:** "calling a function before its declaration is a compile error": in C89 it was an implicit
  `int` declaration; C99 removed implicit declarations (compilers diagnose them). GATE 2005 Q32 tests
  the C89 view (error because the implicit `int foo()` conflicts with the later `double foo(double)`).
- **C 260:** `printf("%d", a)` with a `float` a has output 0.55556: undefined behaviour (format
  mismatch); `%f` prints 0.555556.
- **C 262:** "one extra negative value for an unsigned type": it is the signed two's-complement type
  that has one more negative value.
- **C 263:** `0777s` is not a C constant (no `s` suffix); right shift of a negative signed value is
  implementation-defined; left-shifting a negative value or shifting by ≥ the width is undefined.
- **C 264:** `extern int var;` with no definition fails at **link** time, not compile time.
- **C 265:** `&` of a `register` variable is always a compile error in C.
- **C 269:** reading uninitialised malloc'd memory gives indeterminate values, not a segmentation fault.
- **C 270:** an `\x` escape consumes every following hex digit; `int 511 → char` gives −1 with signed char.
- **C 282:** implicit function declarations exist only in C89.
- **C 283:** a string literal has type `char[N]` in C (not `const char *`), though modifying it is UB.
- **C 287:** `a` and `&a` have the same address but different types: `a + 1` steps one element,
  `&a + 1` steps the whole array.
- **C 296:** "pointer to 1-D array is int**" is wrong as a type: `int a[5][6]` decays to `int (*)[6]`.
- **C 299:** `int a = 3, 1;` is a syntax error; `a -= (a--) - (--a);` and `a[i] = ++i;` are undefined.
- **C 301:** `printf("%s ", **pp) + 3` adds 3 to printf's return value; it prints the whole string.
  `p + p[4] − p[0]` forms an out-of-range pointer before subtracting (UB); write `p + (p[4] − p[0])`.
- **C 302:** printing an `int` member with `%s` is undefined behaviour.
- **C 304–305:** calling a function with a `double` argument when it is defined `int foo(int)` with no
  prototype in scope is undefined behaviour.
- **E 543:** "structures are initialised to 0 by default": only static/global (or partially
  initialised) structures are zero-filled.
- **E 541:** `printf(str, 0[arr], 2[arr + 3])`: `arr` is one-dimensional; `2[arr + 3]` is `arr[5]`.
  The answer "98 a" is right, the reasoning is not.
- **E 544:** `foo(val--)` passes the same value to every nested call (the decrement happens in the
  caller, which never resumes); the recursion never makes progress and overflows the stack.
- **E 545:** with the comma operator there is a sequence point, so the side effect is complete before
  the next operand is read.

### Arrays, lists, stacks and queues
- **A 26:** delete-last loop `while (p->link->link != NULL)` dereferences NULL on a one-node list.
- **A 27:** `loc->link = loc->link->link; free(loc->link);` frees the wrong node and leaks the removed
  one; use `q = loc->link; loc->link = q->link; free(q);`.
- **A 30–32, B 176:** doubly linked list code ignores the empty-list, first-node and last-node cases
  (NULL dereferences).
- **A 42 (GATE 2006 Q49):** the worst case gives exactly 2n pushes; the strict "x < 2n" in the chosen
  option is a known wording issue (see B-notes).
- **A 46:** prefix `+ − 6 ^ 2 * 3 7 9` converts to `(6 − 2^(3*7)) + 9`; the boxed answer swaps the
  operands of `−`.
- **C 311:** 2-D address formulas omit the element size.
- **C 315–316:** empty array-stack test is `top == −1`, not `top == NULL`.
- **C 322, 343, 346, 348:** missing `return`, unreachable decrement after `return`, peek after
  underflow, deleting from an empty stack.
- **C 324:** `=` used instead of `==` in the bracket checker; `gets` is unsafe and removed in C11.
- **C 328:** BODMAS as a strict order is wrong: × and ÷ share a level, + and − share a level, each
  applied left to right (8 − 3 + 2 = 7).
- **C 335:** reverse-convert-reverse for prefix needs the equal-precedence rule mirrored.
- **C 345:** `realloc(S->array, S->capacity)` must multiply by `sizeof(int)`.
- **C 356 (GATE 2007 program):** the digit must be pushed as `c − '0'`.
- **C 361, D 525:** circular queue full test must wrap: `(rear + 1) % n == front`; an n-slot array
  holds n − 1 elements under the "one empty slot" convention.
- **C 377:** moving elements back after every dequeue makes each dequeue Θ(n); leaving them in the
  second stack gives amortised O(1).
- **C 379, 381, 382:** queue size formula breaks for full/empty queues; wrong `sizeof` type; `rear`
  not reset after the last dequeue (use after free).
- **C 390, 393, 394:** list insert tests an unassigned pointer; position checks; the copy-the-next
  deletion fails for the last node.
- **C 401:** the Floyd meeting "proof" picks an invalid witness; correct argument: inside the cycle the
  gap shrinks by one each step, so they meet within one lap.
- **C 407:** deleting at the end of a dynamic array is O(1); inserting at the end of a list is O(1)
  with a tail pointer.
- **B 239:** two stacks in one array: the right stack starts at `size` (or `MAX + 1` 1-based), not −1.
- **B 250:** "priorities must be distinct" is false (B 251 itself says equal priorities are allowed).

### Trees, heaps, hashing
- **A 83 (GATE IT 2007 Q29):** only 3 keys (70, 80, 90) exceed 60; the count is C(7, 3) = 35, not
  7!/(4!·4!).
- **A 87:** after inserting 29 the correct AVL tree is 25(8(5, 13), 29(27, 40)) (RL rotation at 27).
- **A 95:** heap sort is in place: O(1) auxiliary space.
- **A 103:** double hashing needs h₂(k) ≠ 0 and coprime with m (e.g. m prime).
- **A 104:** open-addressing deletion is possible with a "deleted" marker.
- **A 105–106:** keys/slots is the load factor (can exceed 1 with chaining); "minimal perfect hashing"
  maps n keys onto exactly n slots.
- **B 244:** BST maximum height for n nodes is n − 1 edges (n levels).
- **B 246, C 512:** heap height is ⌊log₂ n⌋ (not ⌈log n⌉): 2ʰ ≤ n < 2ʰ⁺¹.
- **C 431:** minimum height needs ceilings: ⌈log₂(n + 1)⌉ levels.
- **C 438:** deleting from a binary tree copies the deepest rightmost node's data into the target.
- **C 448–449, 455–457, 459:** non-recursive postorder must peek; inorder-successor prose; threaded
  traversal skips the first node; BuildExpT must return the root.
- **C 467, 479, 482:** BST/AVL delete and insert code: NULL dereferences and the RL/RR choice reversed.
- **C 474:** with N(0) = 1, 1 + N(h) = F(h + 3); the 1.44 log₂ n bound is unaffected.
- **C 491:** leaves of a 1-based complete tree are ⌊n/2⌋ + 1 … n.
- **C 493:** "2ⁿ − n trees on n nodes" is not a valid count (Catalan for ordered/binary shapes).
- **C 500:** `1 + (a > b) ? x : y` parses as `(1 + (a > b)) ? x : y` (precedence bug); a 3-node chain
  returns 0. Correct: `1 + ((a > b) ? a : b)`.
- **C 502:** the "isComplete" function tests a full (0/2-children) tree, not a complete tree.
- **C 512:** parent of the last node (0-based) is ⌊n/2⌋ − 1; Σ heights of a perfect heap = n − h − 1.
- **C 515:** `max_heapify` recurses even when the node is in place (infinite recursion).
- **C 517:** heap insert loops forever because `(0 − 1)/2 == 0` in C; use `while (i > 0 && …)`.
- **C 518:** resizing copies O(n) elements.
- **D 531:** the minimum-key B-tree has the **maximum** height for n keys.
- **E 537:** max+min by pairs needs ⌈3n/2⌉ − 2 comparisons; radix sort is not comparison-based.
- **E 538:** the log₂ n! bound is for the worst/average case of comparison sorts, not the best case.
- **E 539:** DFS visits each vertex once; the median is at the root whenever both subtrees have equal
  size, not only for perfect trees.
- **E 544:** out-degrees from adjacency lists take O(V + E) time.

## 3. Question-bank notes (B)
Key audits run per chapter (every key re-derived by script; C programs compiled and run). Findings and
any `src/gate/fixes/` entries are listed here chapter by chapter.

- *(Chapter 1 onwards: to be filled as the chapters are written.)*
