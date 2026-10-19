# Digital Logic errata (internal)

This file records places where a reference set (A–E) is wrong, where sets disagree with each
other, or where a set disagrees with the textbooks. Each entry gives the correct version with a
short derivation. Lessons must teach the **correct** version, and where a slip is a classic
trap they should name it in a `:::trap`. Page numbers are PDF pages. Sets are named only by
letter.

Legend: **E** = error in one set · **X** = sets disagree · **B** = question-bank note (for the
PYQ pipeline, not a set error).

## 1. Cross-set disagreements (X)

| # | Topic | Disagreement | Correct version |
|---|---|---|---|
| X1 | Floating-point bias | B 151 writes bias = 2ⁿ − 1, while B 152 and its examples use 2^{k−1}. IEEE (D 402–403, A 23) uses 2^{k−1} − 1. | Two conventions exist. *Excess-2^{k−1}* (textbook custom formats, e.g. excess-64 for a 7-bit exponent) and *IEEE* 2^{k−1} − 1 (127 / 1023). The lesson must state which one each question uses (dl-01-05, `bias-conventions`). |
| X2 | Ring/Johnson counters | A 88 lists them under "asynchronous counters". B 155–156 and D 402 treat them as synchronous shift counters. | They are synchronous, because every flip-flop shares one clock. |
| X3 | Overflow with opposite signs | A 21 says that opposite-sign operands never overflow "in addition or subtraction". B 146 and C 214 state the addition rule only. | Addition: overflow needs same-sign operands. Subtraction A − B = A + (−B), so it can overflow only when A and B have **opposite** signs (4-bit: 7 − (−2) = 9 > 7). |
| X4 | NAND vs NOR speed | A 95 says NOR is faster. Textbooks say NAND. | In CMOS a NOR puts its series transistors in the slow PMOS pull-up, while a NAND puts them in the NMOS pull-down. So NAND is faster and smaller, which is why it is the preferred universal gate. |
| X5 | Race-around | A 99 says it occurs when t_pd ≪ T_clk, and that the fix is t_pd > T_clk. B 135–137 attributes it to the pulse width. | Race-around occurs when the clock pulse width t_w > t_pd (the JK output toggles again while the clock is still high). Timing fix: t_w < t_pd < T. Practical fix: master–slave or edge triggering. |
| X6 | Edge-triggered vs transparent | A 79 draws a clock-gated SR latch and calls it edge-triggered; A 83 calls the D flip-flop "transparent". | A gated latch is level-sensitive (transparent while enabled). An edge-triggered flip-flop samples only at the edge. Teach latch vs flip-flop explicitly (dl-06-01/02). |
| X7 | Weighted codes | B 144 / 175 call 1's complement "non-weighted" and SM "weighted". | 2's complement is the clean weighted case (MSB weight −2^{n−1}). 1's complement can be given MSB weight −(2^{n−1} − 1). SM's sign bit is a flag, not a weight. Avoid the phrase in lessons except for 2's complement. |
| X8 | Reflective vs self-complementing | C 214 groups "reflective" with "self-complementing" (2421, XS-3). A 16–19 separates them. | Reflected = the Gray-code construction property. Self-complementing = code(9 − d) = NOT code(d) (2421, 84−2−1, XS-3). They are different properties. |

## 2. Errors inside a single set (E)

### Number systems, codes and representations
- **A 22:** the minimum of a signed 1|16|15 fixed-point format is given as −2^{−15}. That is the
  negative value closest to 0. In sign-magnitude the most negative value is −(2^{16} − 2^{−15});
  the smallest positive value is +2^{−15}.
- **A 23:** the IEEE single largest value is written (2^{24} − 1)·2^{127}. Correct:
  (2 − 2^{−23})·2^{127} = (2^{24} − 1)·2^{104} ≈ 3.4 × 10^{38}. The "smallest" pattern (exponent
  0, fraction 0…01) is a **denormal** = ±2^{−149}. The smallest positive normal is 2^{−126}.
- **A 14:** 22/256 is rounded to 0.086. The exact value is 0.0859375 (minor).
- **B 143:** "having a decimal point makes it floating point" is wrong. Floating point means
  sign, significand and exponent; 14.135 can be fixed point.
- **B 176–177:** "Gray is unweighted BCD" and "Gray needs fewer bits than BCD" are wrong. Gray
  encodes binary counts (it is not a BCD code) and uses as many bits as plain binary.
- **B 183:** 16·P for P = A72E5₁₆ is written in 20 bits, which overflows. Keep 24 bits:
  1010 0111 0010 1110 0101 0000. "1's complement = 2's complement − 1" holds only as a pattern
  relation for the same value, not as written.
- **C 203:** (101)₂ is "approximately" 5. It is exactly 5.
- **C 209:** the line "4096 − 5671 − 1" should read 5674 (the octal 7's complement 7777 − 5674 =
  2103₈ is right).
- **C 211:** n in the range formulas is the number of bits, not "variables".
- **C 213:** the result 0111 after re-complementing must be read as −7.
- **C 215:** "packed BCD = BCD of numbers > 9" is wrong. Packed BCD stores two digits per byte;
  unpacked stores one per byte.
- **C 219:** Gray(16) is written as 0000. In 5 bits Gray(10000) = 11000 (0000 is only the 4-bit
  cyclic wrap).
- **C 221:** parity detects any **odd** number of bit errors (not just one), and Hamming(7,4)
  **corrects** single-bit errors.
- **D 402:** the exponent field of the largest normal is written as 1111110 (7 bits). It should
  be 11111110 = 254.
- **D 403:** "denormals give larger negative numbers" is wrong. Denormals fill (0, 2^{−126}) in
  magnitude on both signs, closer to zero.

### Boolean algebra, gates, minimisation
- **B 113:** "the minimal SOP is always unique" is wrong. Σ(1,2,3,4,5,6) over (a,b,c) has two
  minimal covers: a′c + bc′ + ab′ and a′b + b′c + ac′. Only canonical forms are unique.
- **C 238:** A′BCE + ABCE is left as two terms. They merge to BCE, so the minimal result is
  C′E′ + BD + A′DE + BCE.
- **C 240:** a typo z′z′ for x′z′.
- **C 245–246:** results are left unsimplified. A + A′BC = A + BC, and AB′C′ + ABC + AB + AC′ =
  A(B + C′).
- **C 253:** "number of variables = 2ⁿ" should be the number of rows/minterms = 2ⁿ.
- **C 255–256:** XOR as mod-2 sum: x₁ ⊕ … ⊕ x₄ = 0 ⇔ the number of 1s is **even** (0, 2 or 4),
  not "a multiple of 4". The side note "(A + B)/2 = 2k + R" should read A + B = 2k + R.
- **D 400:** the consensus result is mis-typed. xy + zy′ + xz = xy + zy′.
- **D 400:** a 2:1-MUX cascade with constants 1/0 is labelled A + B. Under the usual input order
  it gives NAND = (AB)′. A + B = MUX(I₀ = A, I₁ = 1, S = B). The conclusion "a MUX is
  functionally complete" is still right.
- **D 400:** "f_clk = 1/2ⁿ" should be f_out = f_clk/2ⁿ for an n-stage divider. The ring-oscillator
  formula is missing: f = 1/(2N·t_pd) for N inverters.
- **E 408:** the sum operators look like XNOR in the scan. S = A ⊕ B ⊕ C_in must be XOR (check
  A = B = C = 0 ⇒ S = 0).

### Combinational and arithmetic
- **A 38:** a "binary-to-Gray" converter uses rows 10–15 as don't-cares, so X = A + B. That holds
  only for BCD inputs. A full 4-bit converter needs X = A ⊕ B (input 1100 → Gray 1010).
- **A 53:** "A = B = 0 generates a carry" is wrong. A = B = 0 *kills* the carry; only A = B = 1
  generates.
- **A 55:** the sum delay for A = B = C_in = 1 is labelled with the AND delay. It is the XOR₂ delay.
- **A 58:** the full-subtractor borrow is simplified to B + A′B_in. Correct: B_out = A′B + A′B_in
  + BB_in (check A = B = 1, B_in = 0 ⇒ no borrow).
- **A 61 / 63:** typos A1B0 → B1B0. In the 3-bit comparator the third term needs
  (A₂ ⊙ B₂)(A₁ ⊙ B₁)A₀B₀′, not (A₀ ⊙ B₀)….
- **A 64:** the 2:1 MUX table row (S, D₁, D₀) = (0, 0, 1) must give 1 (Y = S′D₀ + SD₁).
- **B 120 / 166:** "XOR = AB + A′B′ on a 4:1 MUX (I₀ = I₃ = 1)" is XNOR. XOR needs I₁ = I₂ = 1,
  I₀ = I₃ = 0. The enable equation also lost its bars:
  E(I₀S₁′S₀′ + I₁S₁′S₀ + I₂S₁S₀′ + I₃S₁S₀).
- **A 72 / B 167:** the MUX-tree count ⌈M/N^k⌉ summed over k = 1, 2, … overcounts by one when the sum
  runs one level too far (a level that already leaves a single signal needs no further MUX). Stop when one
  block remains: 16:1 from 4:1 is 4 + 1 = 5 (dl-05-02 `mux-tree-count`, checked by `comblib.mux_tree`).
- **B 129:** "a short is stuck-at-1 and an open is stuck-at-0" is a technology-dependent simplification
  (an open TTL input floats high; a CMOS open can hold either value), and stuck-at faults are filed under
  hazards. They are a separate topic: the logical fault model of dl-05-06, which states the model without
  tying it to a physical defect.
- **B 178:** "Booth reduces multiplication to O(n^{log₂3})" is wrong. That is Karatsuba's bound.
  Booth only reduces the number of add/subtract operations for runs of 1s.
- **D 401:** "CLA = 6 delays when XOR gates are available" assumes complemented literals and
  2-level XOR. With unit-delay XOR gates the count is 1 + 2 + 1 = 4. Lessons must state the gate
  model.

### Sequential
- **B 179:** a garbled box on Johnson counters. An N-flip-flop Johnson counter has 2N states, so
  mod-2N needs N flip-flops.
- **B 180:** the "down counter" is drawn 0 → 1 → 2 → 3. A down count is 0 → 3 → 2 → 1 → 0.
- **B 183:** next state is equated with the T input. For a T flip-flop, Q⁺ = T ⊕ Q.
- **A 101:** the third output is labelled Q1 again. It should be Q2 (f/8).
- **D 400:** "D = Qn" should be Q_{n+1} = D.

### Other
- **C 189:** "digital needs less bandwidth" is the opposite of the truth (PCM voice at 64 kb/s
  vs a 4 kHz analog channel). It is out of scope for GATE, but do not repeat it.

## 3. Question-bank notes (B), for the PYQ pipeline
- `cse-1991-a-1-iii`: the bank prints 16³ + 9 + 16² + 7 + 16 + 5 + 3 (= 4392 → four 1s, matching
  the key 4). Some solution sets read it as 16³·9 + 16²·7 + 16·5 + 3 = 0x9753 (nine 1s).
  **Resolved 2026-10-17:** the 1991 paper scan in `GATE_PYQ/GATE1991.pdf` (p. 1, Q1(iii)) prints
  the sum exactly as the bank does, so the key 4 stands. The lesson's `trap-printed` block and
  aside teach "evaluate what is printed".
- `it-2004-it-44`: already `needsReview` (reprint typos). Keep it in dl-03-01 and solve the
  intended version with a note. **Resolved 2026-10-18:** text and option (b) repaired through
  `src/gate/fixes/it-2004.json` (see the Chapter 3 key audit below).
- `cse-2002-a-15`: the key D (10001) assumes the minimum width (5 bits). The lesson's
  `min-width` block makes that assumption explicit.
- **Chapter 1 key audit (2026-10-17):** all 40 `dl/number` keys were re-derived from scratch in
  `_checks/dl/l01…l05` (brute force where possible, e.g. every radix 2–64, every 4-bit Gray
  successor, every option of each MCQ/MSQ). All 40 stored keys are correct; no `src/gate/fixes`
  entry was needed. The 40 v2 solutions were rewritten or extended to the teacher-style standard
  (concept tested, steps, every option explained, shortcut, pitfalls), enforced by
  `_checks/dl/pyq_ch1.py`.

- `cse-2005-cs-85b` (**fixed 2026-10-17**, `src/gate/fixes/cse-2005.json`): an earlier fix had set
  `needsReview: true` with a note calling the question flawed ("1.1101 × 2¹⁰ encodes as 4AD0, not an
  option"). That note dropped a 1: $0.00111101 \times 2^{13} = 1.11101 \times 2^{10}$ (five 1s), so the
  hidden-bit word is exponent $74 = 1001010$, mantissa $11101000$, i.e. **4AE8 = option D**, the stored
  key. 4AE8 decodes to $1.90625 \times 2^{10} = 1952 = \tfrac{61}{256} \times 2^{13}$, the same value as
  part (a). The fix now restores `needsReview: false` and clears the note; the key is unchanged.
  Re-derived in `_checks/dl/l05_fp_basics.py`.
- **Floating-point key audit (2026-10-17):** all 25 `dl/floating` keys were re-derived from scratch in
  `_checks/dl/l05_fp_basics.py`, `l06_ieee754.py` and `l07_fp_arithmetic.py` (exact IEEE arithmetic in
  `fplib.py`, cross-checked against Python's `struct`/float32 rounding). All 25 stored keys are correct;
  the only bank change is the `cse-2005-cs-85b` review-note fix above. The 1997 parts (a)–(c) assume
  truncation, which the lesson states. The 25 v2 solutions were rewritten to the teacher-style standard
  (enforced by `pyq_ch1.py`).
- **Arithmetic PYQ move and key audit (2026-10-17):** the 13 number-level PYQs of `dl-05-03` (old numbering; now `dl-04-03`), the 8
  Booth/product PYQs of `dl-05-04` (now `dl-04-04`), `it-2005-cs-47` (lesson 2) and `cse-2010-cs-8` (lesson 4) now live in
  Chapter 1 lessons 9–10. All 23 keys were re-derived in `_checks/dl/l09_code_arithmetic.py` and
  `l10_multiplication_booth.py` (brute force where possible, e.g. the overflow formulas over every
  4- and 8-bit operand pair, Booth counts with `boothlib.py`). All stored keys are correct. Three keep
  their existing `needsReview` notes, which are about interpretation, not the key: `cse-1995-a-51`
  (W's negative result as an "error"), `cse-2002-a-21` (some published keys give D; B is right) and
  `it-2008-it-42` (multiplier read from a blurry scan; with the printed digits the count is 8 = B).
- **B 185** (Booth): the boxed recoding of −113 drops its leading −1 digit; the full recoding is
  −1 0 0 +1 0 0 0 −1 (value −128 + 16 − 1 = −113). Lesson 10's `trap-booth-pair` and the value check
  ("sum the digits times powers of two") catch this.
- **Floating-point bias conventions in GATE papers** (for lessons 5–7): 1996 used a 2's-complement
  exponent, 1997 a sign-magnitude exponent, 2002 and 2005 excess-64 (base 16 in 2002), 2003 a bias of 31
  with the all-ones field meaning zero, and every paper from 2008 the IEEE biases 127 / 1023 (2021-1 says
  "bias of 127" explicitly). Solution sets that write "bias = 2ᵏ⁻¹" for IEEE, or 2ⁿ − 1 (set B 151), are
  wrong for IEEE; lesson 5's `bias-conventions` table and `trap-bias` teach the distinction.
- **Chapter 2 key audit (2026-10-17):** all 64 Chapter 2 keys (`dl/boolean` 36, `dl/gates` 27,
  `dl/combinational` 1) were re-derived in `_checks/dl/l2_01 … l2_06` by truth-table enumeration
  (every option of every MCQ/MSQ is parsed and evaluated), exhaustive minimum-gate search
  (`boollib.min_gates`) and timing simulation. 62 stored keys are correct; two were wrong and are now
  fixed in `src/gate/fixes/` (the earlier `needsReview` flags were turned into answer fixes):
  - `cse-2009-cs-6` (**fixed D → B**, `src/gate/fixes/cse-2009.json`): the minimum number of 2-input NOR
    gates for $AB + C$ is 3, not 5: $AB + C = (A + C)(B + C) = \text{NOR}(\text{NOR}(A, C), \text{NOR}(B, C))$,
    and an exhaustive search over every 2-gate NOR circuit finds none. 5 is the naive gate-by-gate count.
    The paper scan (`GATE_PYQ/GATE2009.pdf` p. 2, Q6) prints the options 2, 3, 4, 5.
  - `cse-2010-cs-31` (**fixed D → A**, `src/gate/fixes/cse-2010.json`): the paper scan
    (`GATE_PYQ/GATE2010.pdf` p. 7, Q31) shows first-level NORs on (P, Q), (Q, R), (P, R), (Q, R), so
    $f = \big((P+Q)(Q+R) + (P+R)(Q+R)\big)' = (Q + R)'$ (option A); $P = 1, Q = R = 0$ gives $f = 1$, which
    rules out D, $(P+Q+R)'$.
  - Interpretations kept (keys unchanged): `cse-1998-a-13` reads "XORed with itself n times" as $n$ XOR
    operations ($n + 1$ copies), which is what makes D the key; `cse-1992-a-2-ii` and `cse-1999-a-34`
    assume the constants 0 and 1 are available (without them neither the MUX nor {AND, XOR} is complete);
    `cse-2000-a-2-10`'s equation system has six solutions, of which only option C is offered.
  - The legacy free-text `solution` field of both questions argued for the old key D. `solution` is now a
    fixable field in `scripts/gate/apply-fixes.mjs`, and both texts are replaced through
    `src/gate/fixes/cse-2009.json` and `cse-2010.json` (the v2 solutions in `src/gate/solutions` were already
    correct).
  - Set-level slips noticed while writing Chapter 2 (lessons teach the correct versions): one set claims NOR
    is faster than NAND (X4 above), and one set labels a cascade of two 2:1 MUXes with constants as OR when
    it computes NAND (D 400 above).
- **Chapter 3 key audit (2026-10-18):** all 39 Chapter 3 keys (`dl/minimization` 38, `dl/gates` 1) were
  re-derived in `_checks/dl/l3_01 … l3_04` with `minlib.py`: prime implicants by Quine–McCluskey and by a
  brute-force scan of all 3ⁿ cubes (which must agree), minimal covers by Petrick's method and by exhaustive
  subset search (which must agree), every option of every MCQ/MSQ parsed and evaluated, printed maps read
  from the question tables and figure alt texts (checked against the scans), minimum NOR counts by
  exhaustive circuit search, hazards by checking every adjacent pair of 1-cells. Findings:
  - `cse-2006-cs-38` (**fixed A → D**, `src/gate/fixes/cse-2006.json`): $f = \Sigma(5, 7, 11, 12, 13, 15)$ has six
    adjacent 1-pairs; cover (A) has no cube containing 13 (1101) and 15 (1111), so it can glitch when $y$ changes
    with $w = x = z = 1$. Cover (D) has a cube for every pair (it adds the consensus cube $wxz$). The scan
    (`GATE_PYQ/GATE2006.pdf` p. 5, Q38) blurs (d)'s first cube; read as $wx\bar y$ (the only reading under which
    (d) covers $m_{12}$) it is the bank's text. The earlier `needsReview` flag became the answer fix, and the
    legacy free-text solution (which argued for A) is replaced through the same fixes file.
  - `it-2004-it-44` (**text and option (b) repaired**, `src/gate/fixes/it-2004.json`; key B unchanged): the
    reprint scan (`GATE2004IT.pdf` p. 6, Q44) prints the fifth term as $AB'C$, a duplicate of the first, and
    option (b) as "AB'AC' + A'C" with a '+' missing. As printed no option is equivalent ($\Sigma(1, 3, 5, 6)$);
    with $AB'C'$ the function is $\Sigma(1, 3, 4, 5, 6) = AB' + AC' + A'C$, option (b).
  - `cse-2003-cs-45` (**key kept, flag kept**): the scan (`GATE2003.pdf` p. 6, Q45) matches the bank's map.
    The true minimum literal counts are POS 9 and SOP 8 (SOP $y'w' + x'z'w + xz'w'$ or $\dots + xyz'$); no option
    is (9, 8). The commonly published key (C) (9, 10) has the right POS count (its 10 is the SOP you get by missing the corner quad); the v2 solution proves both counts and
    explains (C). The existing `needsReview` note stays.
  - Interpretations kept (keys unchanged): `cse-2021-2-cs-52` (the three conditions leave $m_2, m_3$
    unspecified; as don't-cares the minimum is 6 literals, any other completion costs 8 or 9),
    `cse-2000-a-2-11` (all three expressions implement the map, so "none of the above"), `cse-1998-a-42`
    (columns printed in counting order).
  - Set-level slips noticed while writing Chapter 3 (lessons teach the correct versions): B 113's "the
    minimal SOP is unique" (section 2), C 238's unmerged 5-variable pair (section 2), C 267 / 271 / 273
    (section 4b).
- **Chapter 4 key audit (2026-10-18):** all 38 Chapter 4 keys (`dl/combinational` 35, `dl/minimization` 1,
  `dl/gates` 2) are re-derived by enumeration over every input row in `_checks/dl/l5_01 … l5_06` (`comblib`
  netlists with MUX, decoder, enable and stuck-at fault nodes; minimum AND/OR/NOT gate search; ROM and PLA
  sizing). None is wrong.
  - `cse-2001-b-58-b` (**flag cleared**): the scan (`GATE2001.pdf` p. 8, Q58(b)) rendered at 600 dpi shows the
    top labels as e₈ / b₈, so the block is weight-labelled and $b_4$ is the weight-4 BCD bit. Its minimal POS
    has 7 literals and three equally minimal forms; the bank's $(\bar e_4 + e_2)(\bar e_4 + e_1)(e_4 + \bar e_2 + \bar e_1)$
    is one. `needsReview` cleared and the note updated through `src/gate/fixes/cse-2001.json`.
  - `cse-2002-a-27`: the scan (`GATE2002.pdf` p. 3, Q27) matches the bank's wiring (x → I0, I1; y → I2;
    y′ → I3 and A1; z → A0; z′ → EN); with an active-high enable $f = xy\bar z$, key (A).
  - Interpretations kept: `cse-1992-b-4-b` (output codes not given; A → 11, B → 10, C → 01 assumed, flag
    kept), `cse-2000-b-9-b` ("one two-input gate" read as an OR; the 2000 paper is not in `GATE_PYQ/`).
- **Arithmetic-circuits key audit (Chapter 4 since the 2026-10-19 reorder, written 2026-10-19):** all 14 keys
  are re-derived in `_checks/dl/l4_01 … l4_04` from `arithlib` gate netlists (exhaustive or 3000-sample
  simulation against integer arithmetic, static arrival times with the delay per gate type each question
  states, and a transport-delay simulation for data-dependent settling). None is wrong.
  - `cse-2015-2-cs-48` (**flag cleared**, `src/gate/fixes/cse-2015-2.json`): the key 19.2 is the **block
    model**, four full adders of 4.8 µs each (sum XOR + XOR, carry XOR + AND + OR, with XOR = 2.4 µs and
    AND/OR = 1.2 µs); an exam archive lists 19.2 as the official answer. The gate-level critical path is
    4.8 + 3 × 2.4 = 12 µs. The lesson teaches both (`delay-models`, `trap-block-vs-gate`).
  - `cse-2006-cs-36` (flag kept): the 2006 scan (`GATE2006.pdf` p. 5, Q36) prints the options as an illegible
    bitmap (only the 7-term shape of A and B is readable), so B–D as transcribed cannot be confirmed. Key A is
    proved independently: it equals $G_2 + P_2G_1 + P_2P_1G_0$ with $P_i = a_i + b_i$ (carry in 0), and B–D as
    transcribed are not equal to it.
  - `cse-2016-2-cs-7`: B = −1 is the unique slowest operand with A = 1 (transport simulation over all 256 B).

## 4. Set C, sequential, memory and converters (pp. 326–398)
- **C 371 (important, a lesson-worthy trap):** the 0 → 3 → 5 → 6 JK counter (J_A = K_A = Q_B,
  J_B = K_B = 1, J_C = K_C = Q_B′) is presented as working, but it **locks out**. The unused states
  cycle 001 → 010 → 100 → 111 → 001 and never reach the main loop. (Check from 001: A holds
  because Q_B = 0, B toggles to 1, and C toggles to 0, giving 010; and so on.) Fix: give unused
  states an explicit next state (for example 000) instead of don't-cares, which is the set's own
  advice on p. 372. Use this as the self-start example in dl-06-05 (synchronous counter design).
- **C 345:** "preset = 1 gives output 0" is wrong. Preset forces Q = 1 and clear forces Q = 0
  (active-low on the drawn symbol, pp. 341–342).
- **C 332:** a clock-gated SR circuit is drawn with an edge symbol. It is a level-sensitive gated
  latch (same issue as X6).
- **C 361:** for a 4-bit SISO, the first stored bit reaches the output after 4 clocks; all 4 bits
  have been seen after 7 clocks, and 8 clocks shift them out completely.
- **C 381:** "bit 2 of a square is always 0" should say bit 1 (value 2). Squares mod 4 are 0 or
  1. The set's own table agrees with the corrected version.
- **C 387:** a PLA product term labelled C′ should be C (F₂ = C + A′B′).
- **C 397:** 5 V/2 kΩ is 2.5 mA (not 25 mA). The output is −I′R_f = −(2.5 mA/8)(2 kΩ) =
  −0.625 V (not −0.3125 V). The MSB/LSB labelling also flips between pp. 394–396 and p. 397.
- **C 398:** fan-in is defined as input loading. The usual (GATE) meaning is the number of gate
  inputs.
- **C 343 / 392:** loose claims ("ripple counters used in ICs due to simplicity"; SRAM "high
  power"). SRAM's advantage is that it needs no refresh, and its standby power is usually below
  DRAM's.

## 4b. Set C part 2 (pp. 259–325)
- **C 267:** the PI labels in the branching example are wrong. The PI covering m1, m5 is w′y′z (not
  w′y′z′); the one covering m5, m7 is w′xz (not w′xy). The chart columns are right.
- **C 267:** in "which set cannot be the PI set", {a′, b, ac} is also impossible:
  a′ + b + ac = a′ + b + c, so ac is not prime. The question has two correct options as written.
- **C 271:** in the VEM of Σ(1, 2, 5, 6), the A = 0, B = 1 cell is C′ (m2 = 1, m3 = 0), not 1.
- **C 273:** "minimal SOP f and minimal POS g differ" does not hold for that example. Both reduce
  to z + w′y. The general warning (SOP and POS may treat don't-cares differently) still stands.
- **C 288:** the second borrow form A′C + C(A ⊕ B)′ is wrong (A = 0, B = 1, C = 0 must borrow).
  Correct: B_out = A′B + C(A ⊕ B)′ = A′B + A′C + BC.
- **C 302:** a typo, AB′C for A′B′C. The MUX residues (C, 1, 0, C) are right.
- **C 306:** the cascaded-MUX result drops AQR′. Correct: h = g′P + gQ with g = R′A + RB gives
  h = B′PR + A′PR′ + AQR′ + BQR (checked over all 32 inputs).
- **C 308:** the level count of a MUX/decoder tree is exactly ⌈log_N M⌉. Round up at each level
  when counting blocks.
- **C 313:** an AND-gate decoder question assumes active-low outputs that the figure does not
  show. State the assumption in our version.

## 5. Coverage notes for lesson writers
- No set runs the full Quine–McCluskey tabulation. C 262–274 has PI charts, dominance and
  branching only.
- No set covers hazards beyond a summary (B 129, D 402). The same holds for Mealy/Moore design
  and state minimisation (E 405/407/409 only), Booth worked end to end (B 153–154, D 401–402
  tables), stuck-at faults (B 129) and IEEE add/multiply.
