# Chapter 1 plan: Number systems and codes (pilot)

Internal planning file (Checkpoint A). Lessons are not written yet. It follows `_style.md`: the
full arc for every concept, at least 4 worked examples per concept (easy → medium → GATE →
edge case), a `:::derivation` for every formula, `:::theorem` + `:::proof` for every theorem
GATE uses, and animation wherever motion teaches. The reader's example levels are
`easy | medium | gate`, so the fourth "edge case" example uses `level="gate"` and a title that
starts with "Edge case:".

- Folder: `content/gate-notes/dl/01-number-systems/`
- `pyq_topics` for the chapter: `dl/number` (all 40). Lesson 4 also previews `dl/arithmetic`
  (overflow is taught fully in Chapter 5).
- Check scripts: `content/gate-notes/_checks/dl/` (one Python module per lesson plus a shared
  `numlib.py`). Every worked value, viz caption, Live Lab test vector and practice answer is
  asserted there before the lesson leaves draft. They use exact arithmetic (`fractions.Fraction`
  or sympy), never floats.
- Sources: our own text. The sets (internal labels A–E) are a checklist only. Facts were
  checked against standard textbooks (Mano, *Digital Design*; Mano, *Computer System Architecture*).

| # | Lesson id | Title | PYQs | Est. study time |
|---|---|---|---|---|
| 1 | `dl-01-01-place-value` | Place value and changing bases | 11 | 55 min |
| 2 | `dl-01-02-power-of-two-bases` | Binary, octal and hex: grouping and arithmetic | 7 | 45 min |
| 3 | `dl-01-03-fractions-fixed-point` | Fractions and fixed-point numbers | 5 | 45 min |
| 4 | `dl-01-04-signed-numbers` | Signed numbers and complements | 16 | 80 min |
| 5 | `dl-01-05-codes` | Binary codes: BCD, excess-3, Gray, parity and Hamming | 1 | 60 min |

Chapter total: 40 PYQs, about 4 h 45 min of study, 5 lessons.

---

## Lesson 1 · `dl-01-01-place-value` · Place value and changing bases

**Prerequisites:** none (school arithmetic: powers, division with remainder).
**Covered by sets:** A 8–14, B 138–141, C 202–207, D 402 (digit count). The sets treat unknown-radix
equations only by example. We add the digit-validity constraint and solution counting as a
method (the GATE 2014-2 and 2015-3 NATs need it).

### Teaching sequence
1. **Intuition:** money in notes and coins, or an odometer that rolls over at *b* instead of 10.
   The digit says *how many*; the position says *of what size*.
2. **Definition** `#place-value-def`: base *b* ≥ 2, digits 0 … b−1, value Σ dᵢ bⁱ. Digits A–Z
   stand for 10–35. Positions to the right of the point carry b⁻¹, b⁻², … (reading only here;
   converting fractions *into* a base is Lesson 3).
3. **Why digits must be < b** `#digit-limit`: the representation is unique, and a digit ≥ b
   would carry into the next place. This sets the lower bound on an unknown radix:
   b > (largest digit).
4. **Base b → decimal** `#expansion`: the sum of digit × place value, and Horner's form
   `((d_k b + d_{k-1}) b + …) b + d_0`. Horner's form is faster by hand and is the same
   multiply-then-add loop a CPU runs.
5. **Decimal → base b** `#repeated-division`: divide repeatedly by b and read the remainders
   bottom to top. Prove it.
6. **Base b → base c**: go through decimal. A shortcut for powers of two comes in Lesson 2.
7. **Counting facts** `#digit-count`: the largest n-digit base-b numeral is bⁿ − 1; N needs
   ⌊log_b N⌋ + 1 digits; there are bⁿ distinct n-digit strings. Example: a 32-digit decimal
   needs ⌈32·log₂10⌉ = 107 bits.
8. **Unknown radix** `#find-base`: turn the numeral equation into a polynomial in b, solve it,
   then apply the digit limits. **Counting solutions** `#count-solutions`: when there are two
   unknowns, list the integer pairs that satisfy both the equation and every digit limit.
9. **Identities true in every base** `#all-bases`: 121_r = (r+1)², so √121_r = 11_r for every
   r > 2. Squaring or multiplying polynomials in r explains why.
10. **Recap.**

### Derivations and proofs
- `:::derivation` value formula → Horner form, by factoring b repeatedly.
- `:::theorem{name="Uniqueness of base-b representation"}` with `:::proof`: existence by repeated
  division (the division algorithm), uniqueness by looking at the lowest place where two
  representations differ (taking both sides mod b).
- `:::derivation` why repeated division gives the digits: N = q·b + d₀, then the same step
  applied to q.
- `:::derivation` digit count: b^{k−1} ≤ N < b^k ⇒ k = ⌊log_b N⌋ + 1.

### Worked examples (4 per concept, in step format)
- **Base → decimal:** (1011)₂ easy; (257)₈ easy; (2D)₁₆ medium; (210)₃ → decimal → hex,
  GATE-style; edge case: (1A.8)₁₆, where the fraction digit is worth 8/16.
- **Decimal → base:** 45 → base 2 easy; 1118 → hex = 45E medium; 39 → base 5 = 124 GATE-style;
  edge case: 0 and b itself (b → "10" in every base).
- **Base → base:** 132₄ → base 5 = 110 GATE-style; 224₅ against 64₁₀, 100₈, 50₁₆, 121₇ (an MSQ
  pattern: three are equal); 73ₓ = 54ᵧ by testing pairs; edge case: a numeral that is invalid in
  the target base.
- **Unknown radix:** (31)_b = 16 ⇒ b = 5 easy; √(224)_r = (13)_r ⇒ r = 5 medium; 312/20 = 13.1
  ⇒ b = 5 (uses the fractional place, a GATE NAT); x² − 13x + 36 = 0 with roots 5 and 6 ⇒ b = 8
  (Vieta); edge case: √121_r = 11_r holds for every r ≥ 3.
- **Counting solutions:** (123)₅ = (x8)ᵧ ⇒ 3 solutions; (43)ₓ = (y3)₈ ⇒ 5 solutions; edge case:
  in (x8)ᵧ the digit 8 forces y ≥ 9 and x must satisfy 1 ≤ x < y, which leaves 3 of the 7
  factor pairs of xy = 30 (y = 30, 15, 10); easy warm-up: (21)_b = 7 ⇒ b = 3, plus the check that 2 < 3.

### Tricks and traps
- `:::trick` Horner by hand (keep a running total ×b + digit). It always works, and it avoids
  writing out powers.
- `:::trick` "(10)_b = b": any numeral 10…0 with k zeros equals b^k. Use it to sanity-check base
  answers quickly.
- `:::trap` Forgetting the digit constraint when you count solutions. Examiners expect the
  unconstrained count, for example 7 instead of 5 for (43)ₓ = (y3)₈ (y = 1, 2 give x = 2, 4, but the digit 4 needs x ≥ 5), or 7 instead of 3 for (123)₅ = (x8)ᵧ.
- `:::trap` Reading the remainders top to bottom. That gives the digits reversed.
- `:::trap` Treating 312/20 as decimal division before converting. Each numeral must be converted
  separately.

### PYQ → block map
| PYQ | Block(s) it will test |
|---|---|
| cse-1993-ii-a-6-5 | `expansion` (part a, fraction reading), `repeated-division` (part b, 1118 → 45E) |
| cse-1997-a-39 | `find-base`, `digit-limit` |
| cse-2004-cs-19 | `expansion`, `digit-limit` (test the option pairs) |
| cse-2008-cs-6 | `all-bases`, `digit-limit` |
| cse-2014-1-cs-8 | `find-base`, `expansion` (fraction place) |
| cse-2014-2-cs-8 | `count-solutions`, `digit-limit` |
| cse-2015-3-cs-35 | `count-solutions`, `digit-limit` |
| cse-2017-2-cs-24 | `find-base` (Vieta) |
| cse-2021-1-cs-6 | `expansion`, `repeated-division` |
| cse-2023-cs-22 | `expansion`, `repeated-division` |
| cse-2024-2-cs-39 | `expansion` (MSQ: compare four bases) |

### Diagrams and animations
- `place-value-strip` (animate): digit cells with bⁱ labels. The total accumulates digit by
  digit, and a toggle switches the base (the demo `binary-place-values` spec, generalised).
- `odometer-rollover` (animate): a 3-wheel counter in base 3 that rolls over 222 → 1000. It shows
  why "10" means b.
- `repeated-division-ladder` (animate): 1118 ÷ 16, with each remainder dropped into a digit slot
  and the read-up arrow drawn last.
- `horner-chain` (animate): ×b, +d steps for (257)₈.
- `radix-solutions-grid` (static): a grid of (x, y) pairs with the invalid ones greyed out, for
  the counting-solutions examples.

### Practice-question ideas (check script: `_checks/dl/l01_place_value.py`)
1. NAT: (3021)₄ to decimal.
2. MCQ: 2026 in base 7.
3. NAT: the radix r with (165)_r = (2A)₁₆ (solve, then apply the digit limit).
4. NAT: the number of solutions of (5x)₉ = (y4)₇ (counting with digit limits).
5. MSQ: which numerals equal 100₁₀ (mixed bases).
6. MCQ: the smallest base in which 7A5 is a valid numeral, with its value.
7. NAT: the minimum bits for any 20-digit decimal (⌈20·log₂10⌉ = 67).
8. MCQ: the identity question: for which r does (1331)_r = (11)_r³ hold?
9. NAT: the base b with 24 × 3 = 103 in base b.
The script brute-forces every radix and pair equation over b ∈ [2, 64] and asserts the unique or
counted answer.

---

## Lesson 2 · `dl-01-02-power-of-two-bases` · Binary, octal and hex: grouping and arithmetic

**Prerequisites:** `dl-01-01-place-value`.
**Covered by sets:** A 8–14, B 138–140, C 203–208 (C also does binary add/sub/mul/div).
Arithmetic in octal or hex is light in every set, so we write it ourselves.

### Teaching sequence
1. **Intuition:** 8 = 2³, so one octal digit is exactly three bits, the way one "₹100 bundle" is
   exactly ten ₹10 notes.
2. **Theorem** `#grouping`: base 2ᵏ ↔ binary by k-bit groups, counted from the radix point
   outward (left for the integer part, right for the fraction), with zero padding at the ends.
3. **Octal ↔ hex** `#octal-hex`: always go through binary. Never go through decimal.
4. **Powers-of-16 expressions** `#hex-expansion`: a sum like 3·4096 + 15·256 + 5·16 + 3 *is* a
   hex numeral (3F53). Read off the bits and count the 1s per digit.
5. **Base 4** `#base4`: 2-bit groups.
6. **Arithmetic in base b** `#base-arithmetic`: add with a carry of b, subtract with a borrow of
   b, and multiply by converting to decimal or using a base-b times table. Check with the
   decimal value.
7. **Popcount quick table** `#popcount`: the number of 1s in each hex digit (0→0 … F→4).
8. **Recap.**

### Derivations and proofs
- `:::theorem{name="Grouping theorem"}`, `:::proof`: write the binary sum and collect terms in
  blocks of k, so each block is Σ cⱼ 2^{kj} with 0 ≤ cⱼ < 2ᵏ, which is a base-2ᵏ numeral by
  uniqueness (from Lesson 1).
- `:::derivation` why padding zeros at the outer ends is safe but padding in the middle is not.

### Worked examples
- **Grouping (integer):** 1011010₂ → octal 132 easy; 657₈ → hex 1AF medium; (1217)₈ → 028F₁₆
  GATE; BCA9₁₆ → 136251₈ GATE; edge case: a leading group that must be zero-padded (101 0110 →
  56₁₆).
- **Grouping (fraction):** 0.1011₂ → 0.B₁₆; 0.11₂ → 0.6₈ (pad on the right); C012.25₁₆ to octal
  (GATE IT 2007, also uses Lesson 3); edge case: padding on the wrong side gives 0.3₈ instead of
  0.6₈.
- **Multi-base in one go:** (123456)₈ → A72E₁₆ and 22130232₄ (GATE IT 2004); 3·4096 + 15·256 +
  5·16 + 3 → 10 ones (GATE 1995); 16³ + 9 + 16² + 7 + 16 + 5 + 3 as printed → 4 ones (GATE 1991;
  note that the literal reading differs from the "intended" hex reading; see errata);
  edge case: F…F (k hex digits) = 2^{4k} − 1.
- **Base arithmetic:** 37₈ + 45₈ = 104₈; A9₁₆ − 3F₁₆ = 6A₁₆; (33.4)₈ × (23.4)₈ = 536.25 =
  (1030.2)₈, so "none of these" (GATE IT 2005); edge case: a borrow chain across several zeros in
  base 8.

### Tricks and traps
- `:::trick` Learn the 4-bit hex table and the per-digit 1-count. Most GATE conversions are then
  30-second questions.
- `:::trap` Grouping from the left of an integer part. It shifts every group; the examiner's
  distractor is exactly that (for example D78 for 657₈).
- `:::trap` Going octal → decimal → hex. It is correct but slow, and it invites arithmetic
  slips.
- `:::trap` "Count the 1s" questions with a misleading decimal-looking expression. Evaluate what
  is printed.

### PYQ → block map
| PYQ | Block(s) |
|---|---|
| cse-1991-a-1-iii | `hex-expansion`, `popcount` |
| cse-1995-a-37 | `hex-expansion`, `popcount` |
| it-2004-it-43 | `grouping`, `base4`, `octal-hex` |
| cse-2005-cs-17 | `octal-hex` |
| cse-2009-cs-5 | `octal-hex` |
| cse-2017-2-cs-1 | `grouping` (hex → octal) |
| it-2005-cs-47 | `base-arithmetic` (with Lesson 1 `expansion`) |

### Diagrams and animations
- `grouping-slider` (animate): a bit string with brackets that snap into groups of 3 or 4 from
  the point outward. Padding zeros fade in, and each group lights up as its digit appears.
- `octal-hex-bridge` (animate): octal digits → 3-bit blocks → regrouped 4-bit blocks → hex digits.
- `hex-nibble-table` (static): 16 rows of hex | binary | number of 1s.
- `base-carry-column` (animate): a column addition in base 8 with the carry of 8 shown moving.

### Practice-question ideas (`_checks/dl/l02_grouping.py`)
1. MCQ: 7354₈ in hex.
2. NAT: the number of 1s in the binary of 0x7E5F.
3. MCQ: 3A.C₁₆ in octal.
4. MSQ: which equal (2301)₄ (binary, octal, hex options).
5. NAT: 57₈ × 6₈ in octal, read as a decimal-looking number.
6. MCQ: FFFF₁₆ − 1 in octal.
7. NAT: the number of octal digits in a 32-bit value.
8. MCQ: the 1s count of 4·16³ + 2·16 + 7.
9. NAT: the difference of two hex values, answered in decimal.
The script converts with Python `int(s, b)` and our own grouping function, and asserts that the
two agree.

---

## Lesson 3 · `dl-01-03-fractions-fixed-point` · Fractions and fixed-point numbers

**Prerequisites:** `dl-01-01-place-value`, `dl-01-02-power-of-two-bases`.
**Covered by sets:** A 8–14 (fraction conversion) and 21–22 (fixed point; see errata for its
minimum-value slip), B 150, C 203–207. Fixed-point
*range and resolution* is thin in all sets, so we write that part from the textbooks.

### Teaching sequence
1. **Intuition:** cutting a cake in halves, quarters and eighths. Some amounts (one tenth) can
   never be hit exactly.
2. **Fraction → base b** `#repeated-multiplication`: multiply by b and peel off the integer
   part. Prove it.
3. **Mixed numbers**: convert the integer and fraction parts separately, then join them.
4. **Terminating vs recurring** `#terminates`: p/q in lowest terms terminates in base b iff every
   prime factor of q divides b. So 0.1₁₀ recurs in binary (0.0̅0̅0̅1̅1̅…).
5. **Truncation vs rounding error** `#truncation`: keeping k fraction digits gives an error below
   b^{−k}.
6. **Fixed-point format** `#fixed-point`: n = i + f bits. The value is the integer reading × 2^{−f}.
   Resolution 2^{−f}; unsigned range [0, 2ⁱ − 2^{−f}].
7. **Representability test** `#representable`: x is exact iff x·2^f is an integer that fits in n
   bits.
8. **Signed fixed point (brief)**: 2's-complement Q-format range [−2^{i−1}, 2^{i−1} − 2^{−f}]
   (forward pointer to Lesson 4).
9. **Recap.**

### Derivations and proofs
- `:::derivation` why repeated multiplication works: b·(0.d₁d₂…)_b = d₁.d₂d₃…
- `:::theorem{name="When a fraction terminates in base b"}` with `:::proof` (p/q = m/b^k ⇔ q | b^k).
- `:::derivation` the fixed-point max: all ones = (2ⁿ − 1)·2^{−f} = 2ⁱ − 2^{−f}.

### Worked examples
- **Fraction → binary:** 0.625 → 0.101 easy; 0.25 → 0.01 easy; 0.1 → 0.000110011… (recurring)
  medium; 0.8125 vs (0.1101)₂ ⇒ x + y = 3 (GATE 2021); edge case: 0.3 → binary, to 6 places with
  the truncation error bound.
- **Mixed / other bases:** 6.625 ↔ 110.101 easy; 27.5 → octal 33.4; C012.25₁₆ − (10111001110.101)₂
  → (135103.412)₈ GATE; edge case: 0.1₃ (= 1/3) is exact in base 3 but recurring in base 2.
- **Fixed-point range:** n = 8, f = 3 → [0, 31.875] easy; general [0, 2ⁱ − 2^{−f}] (GATE 2017);
  resolution and count of values; edge case: why the max is not 2ⁱ.
- **Representability:** 31.5, 0.875, 12.1, 3.001 in 5.3 format (GATE 2018); 2.375 in 4.4 easy;
  a value too large for the integer bits; edge case: 0.1 is never exact in any fixed-point binary
  format.

### Tricks and traps
- `:::trick` A decimal fraction is exactly representable in binary iff, written as p/q in lowest
  terms, q is a power of 2. Check "×2^f is an integer" for fixed point.
- `:::trap` Choosing 2ⁱ as the fixed-point max (option C in GATE 2017). The all-ones pattern is
  one step short.
- `:::trap` Grouping fraction bits from the right end instead of from the point.
- `:::trap` Reading a hex fraction such as C012.25₁₆ as decimal .25. It is 2/16 + 5/256.
- `:::trap` Concluding that 0.25 "cannot be represented" because 0.1 cannot.

### PYQ → block map
| PYQ | Block(s) |
|---|---|
| cse-2002-a-14 | `repeated-multiplication`, `terminates` |
| it-2007-cs-42 | `repeated-multiplication`, Lesson 2 `grouping` |
| cse-2017-1-cs-7 | `fixed-point` |
| cse-2018-cs-33 | `representable`, `fixed-point` |
| cse-2021-2-cs-18 | `repeated-multiplication` (or reading by place value) |
| (cse-1993-ii-a-6-5, part a) | secondary: `repeated-multiplication` as a check |

### Diagrams and animations
- `doubling-peel` (animate): 0.625 × 2 → 1.25, with the 1 peeled into the first bit slot, and so
  on. For 0.1 a loop arrow shows the recurrence.
- `fixed-point-ruler` (static + slider): a number line from 0 to 2ⁱ with tick marks every 2^{−f}.
  Sliding f shows the trade-off between range and resolution.
- `fixed-point-bits` (static): b₇…b₃ . b₂b₁b₀ with weights 16 … 1, ½, ¼, ⅛.

### Practice-question ideas (`_checks/dl/l03_fractions.py`)
1. NAT: 0.6875 in binary, as the count of 1s.
2. MCQ: which of 0.5, 0.2, 0.375, 0.05 terminate in binary.
3. NAT: the max of a 10-bit unsigned fixed-point value with 4 fraction bits.
4. MSQ: values exactly representable in 4.4 format.
5. MCQ: (0.101)₂ + (0.3)₈ in decimal.
6. NAT: the truncation error of 0.7 kept to 4 binary places.
7. MCQ: the resolution of a 16-bit Q8.8 format and its signed range.
8. NAT: the period length of 1/5 in binary (4).
9. NAT: (0.11)₂ = (0.xy)₁₀ ⇒ x + y.
The script uses `Fraction` to expand, detect cycles and test representability.

---

## Lesson 4 · `dl-01-04-signed-numbers` · Signed numbers and complements

**Prerequisites:** Lessons 1–3.
**Covered by sets:** A 20–21, B 141–146 (the most detailed, including r's and (r−1)'s
complements and sign extension), C 208–214, E 405 (ranges; the serial 2's-complement FSM).
Arithmetic-shift rules and minimum-width reasoning are thin, so we add them from the textbooks.

### Teaching sequence
1. **Intuition:** the 2's-complement wheel. A 4-bit odometer that, running backwards from 0000,
   shows 1111, so 1111 "is" −1. Clock arithmetic mod 2ⁿ.
2. **Unsigned** `#unsigned-range`: [0, 2ⁿ − 1].
3. **Sign-magnitude** `#sign-magnitude`: the MSB is the sign. Range ±(2^{n−1} − 1); two zeros.
4. **1's complement** `#ones-complement`: negate by flipping every bit. Same range; two zeros;
   end-around carry (preview).
5. **2's complement** `#twos-complement`: MSB weight −2^{n−1}. Negate = invert + 1. Range
   [−2^{n−1}, 2^{n−1} − 1]; one zero; 2ⁿ distinct values; −2^{n−1} is its own negation.
6. **Shortcut** `#copy-first-one`: from the right, copy up to and including the first 1, then
   invert the rest (with a serial Mealy-machine preview for Chapter 7).
7. **Reading a pattern** `#decode-twos`: −2^{n−1}·b_{n−1} + the rest, or "invert + 1, then add a
   minus sign".
8. **Radix complements in any base** `#radix-complement`: (r−1)'s complement = (rⁿ − 1) − N and
   r's complement = rⁿ − N. 9's/10's in decimal, 7's/8's in octal, F's/16's in hex
   (−539 → DE5 in 12 bits).
9. **Choosing the width** `#min-width`: the smallest n that holds a value (−15 needs 5 bits).
10. **Sign extension** `#sign-extension`: copy the MSB. Prove that the value is unchanged.
11. **Arithmetic shifts** `#arithmetic-shift`: left by k = ×2ᵏ when no significant bits are lost
    (the top k+1 bits must be equal); right by k = ⌊x/2ᵏ⌋ (rounds toward −∞).
12. **Excess-K / biased** `#biased`: value = pattern − K. Leads into IEEE-754 in Chapter 8.
13. **Comparison table** `#compare-representations`: range, zeros, negation cost, and how
    addition works in each.
14. **Pointer** to overflow (Chapter 5, `dl-05-03`).
15. **Recap.**

### Derivations and proofs
- `:::theorem{name="Two's complement value"}`: pattern b ↔ −2^{n−1}b_{n−1} + Σ bᵢ2ⁱ ≡ unsigned(b)
  (mod 2ⁿ), with `:::proof`.
- `:::derivation` invert + 1 = negation: x + x̄ = 2ⁿ − 1 ⇒ x̄ + 1 = 2ⁿ − x ≡ −x.
- `:::derivation` the copy-to-first-one rule from invert + 1 (the +1 ripples through the trailing
  1s of x̄).
- `:::theorem{name="Sign extension preserves value"}`, `:::proof`: −2ⁿ + 2^{n−1} = −2^{n−1}.
- `:::derivation` the ranges and value counts for SM, 1's and 2's (X − Y = 1 for 16 bits).
- `:::derivation` arithmetic left shift = ×2 exactly when b_{n−1} = b_{n−2}.

### Worked examples
- **Encode:** +43 → 00101011 easy; −28 in 16 bits medium; −15 at minimum width (10001) GATE;
  edge case: −128 in 8 bits (no positive twin).
- **Decode:** 1111 1111 1111 0101 → −11 easy; (342)₈ as an 8-bit signed value → −30 GATE; 1000
  0000 → −128 medium; edge case: the same pattern read as SM, 1's and 2's (three different
  values).
- **Ranges and counts:** the n-bit 2's range (GATE 1994/2005/2013); X − Y = 1 for 16 bits; which
  representations have two zeros (MSQ 1999); edge case: the range in 1-bit 2's complement (−1 … 0).
- **Radix complement:** 10's complement of 0371; −539 → DE5 (GATE 2001); the 7's complement of
  octal 1234; edge case: the r's complement of 0 is 0 (the carry is dropped).
- **Sign extension / shifts:** −6 = 1010 → 1111 1010 and 16-bit forms (MSQ 2025); 8·P for P =
  F87B → C3D8 (GATE 2010); right shift of −7 gives −4, not −3; edge case: a left shift that
  overflows (0100 << 1).
- **Divisibility / mixed:** which pattern is divisible by 11111011 (−5): 11100111 = −25 (GATE
  2003); completing the 4-bit converter routine (N + 16 for negative N, GATE 1995 descriptive);
  edge case: dividing −128 by −1 overflows.

### Tricks and traps
- `:::trick` Copy to the first 1, then flip. It works because of the +1 ripple; it fails for no
  input (0 → 0 is fine).
- `:::trick` For a hex pattern, the 16's complement is (FFF…F − N) + 1, done digit-wise (15 − d)
  without binary.
- `:::trick` To check a negative pattern, add it to the positive value. The sum must be 2ⁿ (all
  zeros with a carry out).
- `:::trap` The range "−2^{n−1} to 2^{n−1}" (option C). The top end is one less.
- `:::trap` Padding a negative number with zeros (1000 1010 in the 2025 MSQ).
- `:::trap` Treating sign extension as an arithmetic left shift (the 2002 distractor).
- `:::trap` Giving 1111 or 11111 for −15. The first is −1, the second is −1 in 5 bits.

### PYQ → block map
| PYQ | Block(s) |
|---|---|
| cse-1994-a-2-7 | `twos-complement` (range) |
| cse-1995-b-66 | `twos-complement` (pattern = N + 2ⁿ), Lesson 1 `repeated-division` |
| cse-1998-a-17 | `decode-twos`, Lesson 2 `grouping` |
| cse-1999-a-42 | `sign-magnitude`, `ones-complement`, `compare-representations` |
| cse-2000-a-1-6 | `twos-complement` (positive values) |
| cse-2001-a-35 | `radix-complement` |
| cse-2002-a-15 | `min-width`, `copy-first-one` |
| cse-2002-a-16 | `sign-extension` |
| cse-2003-cs-9 | `decode-twos` |
| cse-2005-cs-16 | `twos-complement` (range) |
| cse-2010-cs-8 | `arithmetic-shift` |
| cse-2013-cs-4 | `twos-complement` (range) |
| cse-2016-1-cs-7 | `decode-twos` |
| cse-2016-2-cs-9 | `compare-representations`, `sign-magnitude` |
| cse-2019-cs-4 | `copy-first-one`, `twos-complement` |
| cse-2025-1-cs-15 | `sign-extension` |

### Diagrams and animations
- `twos-complement-wheel` (animate, the key visual): 16 positions in a circle with each 4-bit
  pattern and its unsigned and signed readings. Stepping round shows the wrap from 0111 (+7) to
  1000 (−8). A toggle switches the inner ring between SM, 1's and 2's, and the two zeros of SM and
  1's appear as a duplicated slot.
- `negate-invert-plus-one` (animate): x, x̄ and x̄ + 1, with the carry ripple through the trailing
  ones highlighted, so the copy-to-first-one rule appears visibly.
- `sign-extension-stretch` (animate): 1010 stretched to 8 and 16 bits, with copies of the MSB
  flowing left. The value label stays at −6.
- `msb-weight-bar` (static): place values with −2^{n−1} drawn in a contrasting tone.
- `arithmetic-shift` (animate): an arithmetic right shift with the sign bit duplicated, beside a
  logical shift for contrast.

### Practice-question ideas (`_checks/dl/l04_signed.py`)
1. NAT: the 12-bit 2's-complement pattern 0xF9C in decimal.
2. MCQ: −100 in 8-bit 2's complement, in hex.
3. MSQ: the representations of −0 in 6 bits.
4. NAT: the number of distinct values in 10-bit 1's complement.
5. MCQ: the 16-bit sign extension of 0xB7.
6. NAT: 0xFFE0 arithmetically shifted right by 3, in decimal.
7. MCQ: the 10's complement of 4070.
8. NAT: the minimum bits to hold every value in [−300, 200] in 2's complement.
9. MSQ: which statements about the n-bit SM/1's/2's ranges are true.
10. NAT: an 8-bit pattern read as SM minus the same pattern read as 2's complement.
The script implements `to_twos`, `from_twos`, `from_sm`, `from_ones`, `sign_extend`, `asr` and
`asl` with a range check, and cross-checks them against Python ints masked to n bits.

---

## Lesson 5 · `dl-01-05-codes` · Binary codes: BCD, excess-3, Gray, parity and Hamming

**Prerequisites:** Lessons 1–2 (XOR is used here only as "bits differ". The full algebra of XOR
is in Chapter 2, so this lesson defines ⊕ by its truth table locally).
**Covered by sets:** A 15–19, B 146–150, C 214–222 (BCD, double dabble, 2421, XS-3, Gray,
parity, Hamming (7,4) with syndrome), E 409 (Gray conversions). B and C give the Hamming
procedure; the minimum-distance theorem and its proof come from the textbooks. C's parity and
Hamming wording, and its Gray(16) row, have slips (see errata).

### Teaching sequence
1. **Intuition:** a code is a dictionary from symbols to bit strings. The choice of dictionary
   decides what is easy: adding (BCD), complementing (excess-3) or counting without glitches
   (Gray).
2. **Weighted vs unweighted codes** `#weighted`: 8421, 2421, 84−2−1, and excess-3 (unweighted).
3. **BCD** `#bcd`: 10 of the 16 patterns are valid. BCD ≠ binary (for example 25 = 0010 0101 vs
   11001). The number of bits for k decimal digits is 4k vs ⌈k·log₂10⌉ (BCD addition is in
   Chapter 5).
4. **Self-complementing codes** `#self-complementing`: the code of 9 − d is the bitwise
   complement. A weighted code is self-complementing iff its weights sum to 9; excess-3 is
   self-complementing too.
5. **Gray code** `#gray`: consecutive values differ in exactly one bit. Reflected construction;
   binary → Gray gᵢ = bᵢ ⊕ b_{i+1}; Gray → binary bᵢ = g_{n−1} ⊕ … ⊕ gᵢ (prefix XOR).
   Uses: K-map ordering (Chapter 3), position encoders and counters (Chapter 7).
6. **Gray "next value" functions** `#gray-successor`: tabulate n → n + 1 in Gray, as a lead-in to
   minterm lists (2006 PYQ).
7. **Parity** `#parity`: even/odd parity bits detect any odd number of bit errors.
8. **Hamming distance** `#hamming-distance`: detect d − 1 errors and correct ⌊(d − 1)/2⌋.
9. **Hamming(7,4) code** `#hamming-code`: parity bits at positions 1, 2 and 4; the syndrome gives
   the error position. The condition 2ᵖ ≥ m + p + 1.
10. **Alphanumeric codes (aside)**: ASCII is 7-bit; 'A' = 0x41, 'a' = 0x61, '0' = 0x30.
11. **Recap.**

### Derivations and proofs
- `:::theorem{name="Reflected Gray code is unit-distance"}`, `:::proof` by induction on n,
  including the wrap-around step.
- `:::derivation` Gray → binary as a prefix XOR, obtained by solving gᵢ = bᵢ ⊕ b_{i+1} from the
  top down.
- `:::theorem{name="Detection and correction by minimum distance"}` with `:::proof`
  (Hamming balls).
- `:::derivation` the parity-bit count 2ᵖ ≥ m + p + 1.
- `:::derivation` the weights-sum-to-9 condition for a self-complementing weighted code.

### Worked examples
- **BCD / excess-3:** 59 in BCD and excess-3; is 1010 1001 valid BCD? (no); the bits needed for
  6 decimal digits, BCD vs binary; edge case: 2421 has two codes for some digits, so the
  standard choice must be fixed.
- **Gray:** binary 1011 → Gray 1110; Gray 101100 → binary 110111; the 3-bit reflected sequence;
  GATE 2006 g₂ minterm list = Σ(2, 4, 5, 6, 7, 12, 13, 15); edge case: Gray of 2ⁿ − 1 → 0 also
  differs in one bit (cyclic).
- **Parity / Hamming:** the even-parity bit of 1101001; a single-bit error caught, a double one
  missed; the Hamming(7,4) encoding of 1011 and a syndrome decode; edge case: d_min = 4 detects 3
  errors or corrects 1 and detects 2, but not both at full strength.
- **Self-complementing:** check 2421 and excess-3; show 8421 is not self-complementing; edge
  case: 84−2−1 (weights sum to 9).

### Tricks and traps
- `:::trick` Binary → Gray = b ⊕ (b >> 1). Gray → binary = repeated XOR-shift (or a running XOR
  from the MSB).
- `:::trap` Treating a BCD string as binary (reading 0010 0101 as 37).
- `:::trap` Converting Gray → binary bitwise with gᵢ ⊕ g_{i+1}. It must use the *binary* bit just
  computed.
- `:::trap` Parity "corrects" errors. It only detects odd-count errors.

### PYQ → block map
| PYQ | Block(s) |
|---|---|
| cse-2006-cs-40 | `gray`, `gray-successor` |

This lesson has few PYQs, but Gray order underpins K-maps (Chapter 3), the 1992 Gray-counter
design question (`dl-07-03`) and the codes in the code-converter questions of `dl-04-01`
(excess-3 → BCD, BCD → mod 6). Those PYQs are mapped in their own lessons and link back here.

### Diagrams and animations
- `gray-reflect` (animate): build the 1-bit → 2-bit → 3-bit Gray lists by mirroring and
  prefixing 0/1.
- `gray-xor-ladder` (animate): binary → Gray with an XOR between neighbours, then the reverse
  prefix XOR.
- `gray-wheel` (static): a 3-bit rotary encoder disc that shows why only one bit changes per step.
- `hamming-74-venn` (animate): three overlapping parity circles over the 4 data bits. Flipping a
  bit lights the circles that fail, and the syndrome lands on the position.
- `bcd-vs-binary` (static): the same decimal number in BCD and in pure binary, side by side.

### Practice-question ideas (`_checks/dl/l05_codes.py`)
1. MCQ: the Gray code of 13.
2. NAT: Gray 1101 in decimal.
3. MSQ: which of four codes are self-complementing.
4. NAT: the number of invalid 4-bit BCD patterns across two digits.
5. MCQ: the excess-3 code of 47.
6. NAT: the parity bits needed to protect 11 data bits (4).
7. MCQ: the Hamming(7,4) syndrome for a received word, and the bit to flip.
8. NAT: the minimum distance needed to correct 2 errors (5).
9. MCQ: the g₀ minterm list of the Gray successor function for 3 bits.
The script implements the Gray and inverse-Gray conversions, BCD/excess-3, a Hamming(7,4)
encoder and syndrome decoder, and the successor-table generator (it re-derives the 2006 key).

---

## Chapter Live Lab: Number Lab (`lab-number-converter`)

One interactive panel with four tabs. It is backed by the same functions as `_checks/dl/numlib.py`
(ported to TypeScript and tested against the Python vectors):

1. **Base converter**: input in any base 2–36, with an optional radix point. Output in every
   other base. A "show steps" toggle replays repeated division, repeated multiplication (with
   cycle detection for recurring fractions) and the grouping view for bases 2/4/8/16.
2. **Signed-width explorer**: choose n (1–16) and enter a value or a bit pattern. It shows the
   unsigned, SM, 1's, 2's and excess-2^{n−1} readings, an interactive 2's-complement wheel, sign
   extension, and arithmetic or logical shift buttons with the overflow flag.
3. **Fixed point**: choose i.f, enter a decimal value, and see the nearest representable value,
   the error and whether the value is exact.
4. **Codes**: decimal → BCD, excess-3, 2421, Gray (and back), the parity bit and the Hamming(7,4)
   encode with a flip-a-bit syndrome demo.
(The IEEE-754 tab is added to the same Lab in Chapter 8.)

## Size estimate for Chapter 1
- Lessons: 5.
- Worked examples: about 22 concept groups × 4 = **88**, written in step format (lesson
  split 20 / 16 / 16 / 24 / 16).
- Diagrams and animations: **22** Viz specs (5 + 4 + 3 + 5 + 5), about 16 of them animated, plus
  the Live Lab.
- Embedded PYQs with full teacher-style solutions: **40**.
- Practice questions: **47** (9 + 9 + 9 + 10 + 9, our own, all script-checked).
- Check scripts: `numlib.py` plus 5 lesson modules, each asserting every worked value.
