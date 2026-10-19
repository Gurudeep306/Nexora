---
id: adder-subtractor-overflow
subject: dl
chapter: arithmetic-circuits
title: "The adder–subtractor, flag logic and the BCD adder circuit"
order: 3
prerequisites: [adders-ripple-carry, code-arithmetic]
pyq_topics: [dl/arithmetic, dl/combinational]
est_minutes: 35
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every control setting, flag, BCD correction and converter output is checked in content/gate-notes/_checks/dl/l4_03_addsub.py (arithlib netlists simulated over every operand)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 20–21, set B pp. 146, 148 and 159–160, set C pp. 211–216 and 289–291."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (the binary adder–subtractor, overflow, the decimal (BCD) adder)."
  - "PYQs: src/gate/questions.json (cse-1996-a-46, cse-2003-cs-46); both keys are re-derived by exhaustive simulation in l4_03_addsub.py."
updated: "2026-10-19"
---

A processor does not keep a separate subtractor next to its adder. It subtracts **with the adder**,
using the rule from [Chapter 1, Lesson 9](lesson:code-arithmetic#radix-sub): $A - B = A + \bar B + 1$ in
two's complement. All the hardware needs is a way to invert $B$ on demand and to inject the "+1",
and both come almost free: a row of XOR gates and the adder's own carry in. This lesson builds that
**adder–subtractor**, reads off exactly which operations its control lines can produce (GATE 2003),
and adds the **flag logic** every ALU has: carry, overflow, negative and zero, including the overflow
detector built from the last two carries. Then it builds the **BCD adder circuit**, a binary adder with
a correction detector and a second adder, and finishes with adders used as **code converters**
(GATE 1996). The number-level rules (why $\bar B + 1$ negates, why overflow is $c_n \ne c_{n-1}$, why BCD
adds 6) are proved in Chapter 1; here we turn them into gates.

## Where this fits

The adders are the ripple and look-ahead adders of [Lesson 1](lesson:adders-ripple-carry) and
[Lesson 2](lesson:carry-look-ahead); everything here works with either. The XOR as a "programmable
inverter" is [Chapter 2, Lesson 3](lesson:xor-and-operators). The number rules are
[Chapter 1, Lesson 9](lesson:code-arithmetic): complements (`#radix-sub`), the overflow theorem
(`#overflow-theorem`), carry vs overflow (`#carry-vs-overflow`) and the BCD +6 rule (`#bcd-add`,
`#bcd-why-six`). [Lesson 4](lesson:multipliers-booth#booth-hardware) reuses the adder–subtractor inside Booth's multiplier, and
[Chapter 5, Lesson 4](lesson:comparators-parity) compares numbers by subtracting them with exactly this
circuit.

:::table{#radar title="GATE radar: adder–subtractor, flags and BCD adder" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 2 (1996, 2003) |
| Marks | 2 two-mark MCQs |
| Pattern 1 | Which operations an XOR-controlled adder can perform with its control lines (2003) |
| Pattern 2 | Identifying what an adder with a detector-driven constant computes (1996: binary to radix 12) |
| Related PYQs elsewhere | The 13 number-level overflow, flag and complement questions are in [Chapter 1, Lesson 9](lesson:code-arithmetic) |
| What examiners test | $K$ inverts $B$ only through XORs, $C_0$ adds 1 only once; $A + 1$ needs $B = 0$; $V = c_n \oplus c_{n-1}$; the unsigned carry after a subtraction means "no borrow"; the BCD detector $K + Z_3Z_2 + Z_3Z_1$ and why $K$ is in it |
:::

## One adder that also subtracts

:::intuition{#addsub-intuition title="A row of switchable inverters" depth="standard"}
To compute $A - B$ in two's complement you add $A$, the bitwise complement of $B$, and 1. Imagine putting a
switch on every wire of $B$: in one position the bit passes straight through, in the other it is inverted.
An XOR gate is exactly such a switch: $b \oplus 0 = b$ and $b \oplus 1 = \bar b$. Tie all the switches to one
control line $K$, and feed the same $K$ into the adder's carry in. With $K = 0$ you get $A + B + 0$; with
$K = 1$ you get $A + \bar B + 1 = A - B$. One wire chooses between adding and subtracting.
:::

:::definition{#controlled-inverter term="The XOR as a controlled inverter" depth="standard"}
For a control bit $K$: $\;b \oplus K = b$ when $K = 0$ and $b \oplus K = \bar b$ when $K = 1$. A row of
$n$ XOR gates sharing $K$ outputs $B$ or $\bar B$ (the one's complement) as a whole word.
:::

:::definition{#adder-subtractor term="The adder–subtractor" depth="standard"}
An $n$-bit **adder–subtractor**: XOR gates form $y_i = b_i \oplus K$; an $n$-bit adder adds $A$ and $Y$ with carry
in $c_0 = K$.

- $K = 0$: $S = A + B$.
- $K = 1$: $S = A + \bar B + 1 = A - B$ (mod $2^n$).

Cost: an adder plus $n$ XOR gates. It works for unsigned and two's-complement operands; only the reading of
the carry out and of the overflow changes (below).
:::

:::theorem{#addsub-theorem name="A + B̄ + 1 = A − B (mod 2ⁿ)" depth="standard"}
For $n$-bit patterns $A$, $B$: $\;A + \bar B + 1 \equiv A - B \pmod{2^n}$, so with $K = 1$ the adder–subtractor's
$n$ sum bits are the pattern of $A - B$.
:::

:::proof{#proof-addsub-theorem of="subtraction by complement and carry in" depth="standard"}
**Idea first:** $B$ and $\bar B$ together fill every bit, so they add up to all ones, which is $-1$.

For each bit $b_i + \bar b_i = 1$, so $B + \bar B = 2^n - 1$, i.e. $\bar B = 2^n - 1 - B$. Then
$A + \bar B + 1 = A - B + 2^n \equiv A - B \pmod{2^n}$. The adder computes this sum exactly (its $n + 1$
output bits are $A + \bar B + 1$), and its $n$ sum bits are that sum mod $2^n$. (This is the two's-complement
negation rule of [Chapter 1, Lesson 9](lesson:code-arithmetic#radix-sub) applied inside the adder.) ∎
:::

:::viz{#addsub-viz spec="addsub-overflow" mode="animate" depth="standard"}
:::

The animation sets $K$ to 0 and then 1, watches the XOR row invert $B$, and runs four cases. In $5 + 6$ the
carries into and out of the sign stage disagree and $V$ lights; $5 - 6$ and $3 - 5$ are fine; $-8 - 1$
overflows again.

:::note{#recap-addsub title="Recap" depth="quick"}
$y_i = b_i \oplus K$, $c_0 = K$: $K = 0$ adds, $K = 1$ subtracts ($A + \bar B + 1$). Cost: $n$ XORs on top of the
adder.
:::

## The control lines

:::intuition{#control-intuition title="Two separate knobs" depth="standard"}
If the XOR control $K$ and the carry in $C_0$ are wired to **separate** pins, there are four settings, not
two. $K$ picks $B$ or $\bar B$; $C_0$ independently adds 0 or 1. Each setting is one fixed formula in $A$ and
$B$, and the only operations available are those four formulas. Anything that needs a different second
operand (like a constant 1 instead of $B$) is out of reach, however you turn the knobs.
:::

:::definition{#control-lines term="The four control settings" depth="standard"}
With $y_i = b_i \oplus K$ and carry in $C_0$:

| $K$ | $C_0$ | Output | Name |
|:-:|:-:|:--|:--|
| 0 | 0 | $A + B$ | add |
| 0 | 1 | $A + B + 1$ | add with carry (increment the sum) |
| 1 | 0 | $A + \bar B = A - B - 1$ | subtract with borrow |
| 1 | 1 | $A + \bar B + 1 = A - B$ | subtract |

$A + 1$ (increment $A$) is **not** among them for arbitrary $B$: it would need the second operand to be 0,
which $K$ and $C_0$ cannot force. It is produced only if $B = 0$ is applied at the inputs (or by extra
gating of $B$, which a real ALU has, but GATE 2003's figure does not).
:::

:::trap{#trap-a-plus-1 title="'Set C0 = 1 and you get A + 1'" depth="standard"}
GATE 2003 asks which of $A + B$, $A - B$, $A + 1$ the ALU performs "by suitably setting the control lines $K$
and $C_0$ only". $K = 0$, $C_0 = 1$ gives $A + B + 1$, which equals $A + 1$ only when $B = 0$, and $B$ is an
operand, not a control line. So the answer is "$A + B$ and $A - B$, but not $A + 1$". The examiners' wrong
option (D) is the one that forgets $B$ is still added.
:::

:::note{#recap-control title="Recap" depth="quick"}
$(K, C_0)$: 00 add, 01 add + 1, 10 $A - B - 1$, 11 subtract. $A + 1$ needs $B = 0$.
:::

### Worked examples: control lines

::::example{#ex-ctl-easy level="easy" title="Settings for A + B and A − B" depth="quick"}
With $K$ tied to the carry in (the standard adder–subtractor), what do $K = 0$ and $K = 1$ compute for
$A = 0110$, $B = 0010$?

:::step{why="K = 0: B passes unchanged, carry in 0."}
$0110 + 0010 = 1000$ (6 + 2 = 8).
:::

:::step{why="K = 1: B is inverted to 1101 and the carry in adds 1."}
$0110 + 1101 + 1 = 1\,0100$: the sum bits are $0100 = 4 = 6 - 2$.
:::

:::answer
$K = 0$: 1000 (8). $K = 1$: 0100 (4), with a carry out of 1 (no borrow, since $6 \ge 2$).
:::
::::

::::example{#ex-ctl-medium level="medium" title="All four (K, C0) settings" depth="standard"}
$K$ and $C_0$ are separate. For $A = 0101$ (5), $B = 0011$ (3), give the 4-bit output of each setting.

:::step{why="K = 0: Y = B = 0011."}
$C_0 = 0$: $5 + 3 = 8 = 1000$. $C_0 = 1$: $9 = 1001$.
:::

:::step{why="K = 1: Y = B′ = 1100 = 12."}
$C_0 = 0$: $5 + 12 = 17 \to 0001$ $(= 5 - 3 - 1)$. $C_0 = 1$: $18 \to 0010$ $(= 5 - 3)$.
:::

:::answer
00 → 1000, 01 → 1001, 10 → 0001, 11 → 0010: $A + B$, $A + B + 1$, $A - B - 1$, $A - B$.
:::
::::

::::example{#ex-ctl-gate level="gate" title="Which claims hold for the 2003 ALU?" depth="standard"}
The ALU has $y_i = B_i \oplus K$ into full adders and a separate carry in $C_0$. Decide whether each of $A + B$,
$A - B$, $A + 1$ can be produced by $K$ and $C_0$ alone.

:::step{why="Look for a setting whose formula is the operation for every A and B."}
$A + B$: $(K, C_0) = (0, 0)$ ✓. $A - B$: $(1, 1)$ ✓.
:::

:::step{why="A + 1 must not depend on B. The four formulas are A + B, A + B + 1, A − B − 1, A − B; each depends on B."}
For $B = 0011$, $A = 0000$: the outputs are 0011, 0100, 1100, 1101; none is $A + 1 = 0001$.
:::

:::answer
$A + B$ and $A - B$, but not $A + 1$ (option A). An exhaustive check over all 4-bit $A$, $B$ confirms that no
setting equals $A + 1$ for every $B$.
:::
::::

::::example{#ex-ctl-edge level="gate" title="Edge case: can the ALU compute A − 1?" depth="standard"}
Same ALU. Is there a setting that gives $A - 1$ for every $A$, if we are also allowed to choose the value
applied to $B$?

:::step{why="A − 1 = A + 1111 (mod 16), i.e. the second operand must be all ones."}
We need $Y = 1111$ and $C_0 = 0$.
:::

:::step{why="Y = B ⊕ K, so either B = 1111 with K = 0, or B = 0000 with K = 1."}
$B = 0000$, $K = 1$, $C_0 = 0$: $A + 1111 = A - 1$ ✓ (this is $A - B - 1$ with $B = 0$).
:::

:::answer
Yes, but only by fixing $B$ (to 0000 with $K = 1$, $C_0 = 0$). With the control lines alone and $B$ an arbitrary
operand, neither $A - 1$ nor $A + 1$ is available.
:::
::::

## Overflow and the status flags

:::intuition{#flags-intuition title="One result, four questions" depth="standard"}
After every addition or subtraction the ALU answers four yes/no questions about the result, and stores
them as **flags** for the next instruction (a conditional branch, say). Did the unsigned result need an extra
bit? (**C**, carry.) Is the signed result wrong because it did not fit? (**V**, overflow.) Is the result's sign
bit 1? (**N**, negative.) Is the result zero? (**Z**.) Each is a tiny piece of logic on wires the adder
already has.
:::

:::definition{#overflow-detector term="The overflow detector" depth="standard"}
For two's-complement operands the adder's result is wrong exactly when the carry into the sign stage
differs from the carry out of it ([Chapter 1, Lesson 9](lesson:code-arithmetic#overflow-theorem)):

$$V = c_n \oplus c_{n-1}.$$

One XOR gate on two wires of the adder. For the adder–subtractor this works for both operations, because the
adder really adds $A$ and $Y$ (= $B$ or $\bar B$) with carry in $K$. An equivalent form uses the sign bits of the
adder's inputs $a_{n-1}$, $y_{n-1}$ and its output $s_{n-1}$: overflow iff the inputs have the same sign and the
result does not,

$$V = \bar a_{n-1}\bar y_{n-1}\, s_{n-1} + a_{n-1} y_{n-1}\, \bar s_{n-1}.$$

The carry form is cheaper and is the one GATE draws.
:::

:::definition{#flags term="Status flags C, V, N, Z" depth="standard"}
| Flag | Logic | Meaning |
|:--|:--|:--|
| C (carry) | $c_n$ | unsigned: the sum needed $n + 1$ bits. After a **subtraction** ($K = 1$): $C = 1$ means **no borrow**, i.e. $A \ge B$ unsigned |
| V (overflow) | $c_n \oplus c_{n-1}$ | signed result out of range $[-2^{n-1}, 2^{n-1} - 1]$ |
| N (negative) | $s_{n-1}$ | sign bit of the result (the true sign only if $V = 0$) |
| Z (zero) | $\overline{s_{n-1} + \dots + s_0}$ (an $n$-input NOR) | result is 0 |

(Some processors store the borrow instead, $\bar C$, after a subtraction; the lesson uses the "carry = no
borrow" convention of the circuit itself.)
:::

:::theorem{#compare-flags name="Comparing A and B with one subtraction" depth="standard"}
Compute $A - B$ on the adder–subtractor. Then (a) unsigned $A < B$ iff $C = 0$; (b) signed $A < B$ iff
$N \oplus V = 1$; (c) $A = B$ iff $Z = 1$.
:::

:::proof{#proof-compare-flags of="the comparison flags" depth="standard"}
**Idea first:** the carry out of $A + \bar B + 1$ is 1 exactly when the true difference is non-negative; and the
sign of the true signed difference is the sign bit, flipped when overflow has wrapped it.

(a) The adder computes $A + \bar B + 1 = A - B + 2^n$ exactly as an $(n+1)$-bit number. It has a carry out
($\ge 2^n$) iff $A - B \ge 0$. So $C = 1 \iff A \ge B$ (unsigned), and $C = 0 \iff A < B$.

(b) Let $d = A - B$ for the signed values. If $V = 0$, the result pattern is $d$ itself, so its sign bit $N$ is
1 iff $d < 0$. If $V = 1$, $d$ is out of range and the pattern is $d \mp 2^n$, whose sign is the opposite of $d$'s
(a positive overflow wraps to a negative pattern and vice versa), so $d < 0$ iff $N = 0$. In both cases
$d < 0 \iff N \oplus V = 1$.

(c) The result is $A - B \bmod 2^n$, which is 0 iff $A = B$ (both are $n$-bit patterns). ∎
:::

:::trap{#trap-carry-flag title="Carry = 1 after a subtraction does not mean 'overflow' or 'negative'" depth="standard"}
Two classic slips. (1) Reading $C = 1$ after $A - B$ as an error: it means **no borrow**, the normal case when
$A \ge B$. (2) Using $N$ alone as "signed less than": $-7 - 3$ in 4 bits gives $0110$ with $N = 0$, yet
$-7 < 3$; the overflow flag is 1 and $N \oplus V = 1$ gets it right. [Chapter 1, Lesson 9](lesson:code-arithmetic#carry-vs-overflow)
tabulates carry vs overflow at the number level.
:::

:::derivation{#overflow-forms of="the two overflow detectors agree" depth="standard"}
Write $x = a_{n-1}$, $y = y_{n-1}$ (the sign bits entering the top full adder), $c = c_{n-1}$ (its carry in), so
$s_{n-1} = x \oplus y \oplus c$ and $c_n = \text{maj}(x, y, c)$. Check the cases of $(x, y)$:

| $x\,y$ | $c_n$ | $s_{n-1}$ | $c_n \oplus c_{n-1}$ | sign form $\bar x\bar y s + x y \bar s$ |
|:-:|:-:|:-:|:-:|:-:|
| 0 0 | 0 | $c$ | $c$ | $c$ |
| 1 1 | 1 | $c$ | $\bar c$ | $\bar c$ |
| 0 1 or 1 0 | $c$ | $\bar c$ | 0 | 0 |

Both columns agree on every row, so the carry form and the sign form are the same function. **Why it is
intuitive:** with different signs ($x \ne y$) the top stage merely passes its carry ($c_n = c$), so the carries
agree and nothing overflows; with equal signs, the top stage's carry out is fixed by the signs, and a carry
in that disagrees with it is exactly what flips the result's sign.
:::

:::intuition{#alu-intuition title="An adder with neighbours: the ALU slice" depth="standard"}
A real arithmetic logic unit (ALU) is the adder–subtractor plus a few cheap neighbours: AND, OR and XOR gates
working on the same $A$ and $B$, and a multiplexer that chooses which result reaches the output. The flags
are computed on the chosen result. Seeing the ALU this way explains why GATE's ALU question (2003) is
really an adder–subtractor question: the arithmetic part is the only one whose control lines interact.
:::

:::definition{#alu-slice term="A simple ALU" depth="standard"}
For each bit $i$, compute in parallel: $A_i \wedge B_i$, $A_i \vee B_i$, $A_i \oplus B_i$, and the adder–subtractor's
$s_i$. A 4:1 MUX per bit (selected by two function bits $F_1F_0$, [Chapter 5, Lesson 2](lesson:multiplexers))
picks one of the four. With the subtract line $K$ this gives AND, OR, XOR, ADD and SUB from one block. Flags:
$Z$ and $N$ come from the selected output; $C$ and $V$ are meaningful only for ADD and SUB. Two useful
by-products of the same hardware: **compare** (SUB, keep only the flags, discard the result) and **negate**
($0 - B$, with $A$ forced to 0).
:::

:::note{#recap-flags title="Recap" depth="quick"}
$C = c_n$ (after subtracting: no borrow), $V = c_n \oplus c_{n-1}$, $N = s_{n-1}$, $Z$ = NOR of the sums. Unsigned
$A < B$: $C = 0$; signed $A < B$: $N \oplus V$.
:::

### Worked examples: flags

::::example{#ex-flag-easy level="easy" title="Flags of 5 + 6 in 4 bits" depth="quick"}
Add $0101 + 0110$ on a 4-bit adder–subtractor ($K = 0$). Give C, V, N, Z.

:::step{why="Add column by column; record c3 and c4."}
$0101 + 0110 = 1011$; $c_3 = 1$ (bit 2: 1 + 1), $c_4 = 0$.
:::

:::step{why="V compares the last two carries."}
$V = c_4 \oplus c_3 = 0 \oplus 1 = 1$.
:::

:::answer
$C = 0$, $V = 1$, $N = 1$, $Z = 0$. Unsigned $5 + 6 = 11$ is right ($1011$); signed it overflows ($11 > 7$; the
pattern reads $-5$).
:::
::::

::::example{#ex-flag-medium level="medium" title="Flags of 3 − 5" depth="standard"}
$K = 1$, $A = 0011$, $B = 0101$. Give the result and the flags, and read the comparison.

:::step{why="K inverts B and adds 1."}
$0011 + 1010 + 1 = 1110$ with $c_4 = 0$ and $c_3 = 0$.
:::

:::step{why="Read the flags."}
$C = 0$, $V = 0$, $N = 1$, $Z = 0$.
:::

:::answer
Result $1110 = -2$ ✓. $C = 0$: a borrow, so $3 < 5$ unsigned; $N \oplus V = 1$: $3 < 5$ signed too.
:::
::::

::::example{#ex-flag-gate level="gate" title="Signed and unsigned comparison of 1001 and 0011" depth="standard"}
Compute $1001 - 0011$ on the 4-bit adder–subtractor and decide $A < B$ both as unsigned and as signed
numbers.

:::step{why="Subtract: B′ = 1100."}
$1001 + 1100 + 1 = 1\,0110$: result $0110$, $c_4 = 1$, $c_3 = 0$.
:::

:::step{why="Flags."}
$C = 1$, $V = 1 \oplus 0 = 1$, $N = 0$, $Z = 0$.
:::

:::step{why="Apply the comparison theorem."}
Unsigned: $C = 1$, so $A \ge B$ ($9 \ge 3$ ✓). Signed: $N \oplus V = 1$, so $A < B$ ($-7 < 3$ ✓).
:::

:::answer
The same subtraction says "$A \ge B$" unsigned and "$A < B$" signed, both correct. $N$ alone (0) would have
given the wrong signed answer: the difference $-10$ overflowed.
:::
::::

::::example{#ex-flag-edge level="gate" title="Edge case: −8 − (−8) and −8 − 1" depth="standard"}
4 bits. Find the flags of $1000 - 1000$ and of $1000 - 0001$.

:::step{why="−8 − (−8): B′ = 0111."}
$1000 + 0111 + 1 = 1\,0000$: result 0000, $c_4 = 1$, $c_3 = 1$: $C = 1$, $V = 0$, $N = 0$, $Z = 1$.
:::

:::step{why="−8 − 1: B′ = 1110."}
$1000 + 1110 + 1 = 1\,0111$: result 0111, $c_4 = 1$, $c_3 = 0$: $C = 1$, $V = 1$, $N = 0$, $Z = 0$.
:::

:::answer
$-8 - (-8) = 0$ is exact ($Z = 1$, no overflow, even though both operands are the most negative number).
$-8 - 1 = -9$ overflows ($V = 1$) and the pattern 0111 reads $+7$.
:::
::::

## The BCD adder circuit

:::intuition{#bcd-intuition title="Add in binary, then repair" depth="standard"}
A BCD digit is a 4-bit binary number that is never allowed to exceed 9. Adding two digits (and a carry) with an
ordinary binary adder gives 0 … 19 in binary. Whenever that binary sum is 10 or more, it must be turned into
"carry 1, digit (sum − 10)". In 4-bit binary, subtracting 10 is the same as adding 6 and dropping the 16
([Chapter 1, Lesson 9](lesson:code-arithmetic#bcd-why-six) proves why exactly 6). So the circuit is: one binary
adder, a small detector that says "the sum is 10 or more", and a second adder that adds 0110 when the
detector fires. The detector's output is also the decimal carry to the next digit.
:::

:::definition{#bcd-adder term="One-digit BCD adder" depth="standard"}
Inputs: BCD digits $A$, $B$ and a carry in. 

1. **Adder 1** (4-bit binary): $K\,Z_3Z_2Z_1Z_0 = A + B + c_{in}$, a value 0 … 19.
2. **Detector:** $C_{out} = K + Z_3Z_2 + Z_3Z_1$ (two 2-input ANDs and a 3-input OR).
3. **Adder 2** (4-bit binary): adds $0\,C_{out}\,C_{out}\,0$ (that is, 0110 or 0000) to $Z_3Z_2Z_1Z_0$; its carry out
   is ignored.

Output: the BCD digit from adder 2 and the decimal carry $C_{out}$. Hardware: 2 four-bit adders (8 full adders),
2 AND, 1 OR. (Adder 2's bit 0 always adds 0, so it is often trimmed to a 3-bit adder.)
:::

:::derivation{#bcd-detector of="the correction detector K + Z3Z2 + Z3Z1" depth="standard"}
The correction is needed iff $16K + Z \ge 10$.

- If $K = 1$ the sum is 16 … 19: always correct. That gives the term $K$.
- If $K = 0$ the sum is $Z = 0 \dots 15$, and we need $Z \ge 10$, i.e. $Z \in \{1010, 1011, 1100, 1101, 1110, 1111\}$. On a
  4-variable K-map over $Z_3Z_2Z_1Z_0$ these six cells are the quad $Z_3Z_2$ (12–15) and the quad $Z_3Z_1$
  (10, 11, 14, 15). No smaller cover exists (each quad has a cell the other lacks).
- When $K = 1$, $Z$ is only 0000 … 0011 (the maximum sum is 9 + 9 + 1 = 19), so the $Z$ terms are 0 there and do
  not interfere.

Hence $C_{out} = K + Z_3Z_2 + Z_3Z_1$. **Sanity check:** $Z = 1001$ (9): $Z_3Z_2 = Z_3Z_1 = 0$, no correction ✓;
$Z = 1010$ (10): $Z_3Z_1 = 1$ ✓; $K\,Z = 1\,0010$ (18): $K = 1$ ✓.
:::

:::viz{#bcd-viz spec="bcd-adder-hw" mode="animate" depth="standard"}
:::

:::definition{#bcd-cascade term="Multi-digit BCD adders" depth="standard"}
For $d$ decimal digits, chain $d$ one-digit BCD adders: digit $i$'s $C_{out}$ is digit $i+1$'s carry in, exactly like a
ripple adder of digits. The carry out of the top digit is the decimal overflow. The decimal carry of each digit
is ready only after its adder 1 and its detector, so a long BCD adder is a ripple of "adder + detector" stages
(look-ahead versions exist with decimal generate/propagate).
:::

:::trap{#trap-detector-carry title="A detector without K" depth="standard"}
"Correct when the 4-bit result is not a valid digit" ($Z_3Z_2 + Z_3Z_1$) misses the sums 16 … 19: $8 + 8 = 16$ gives
$K\,Z = 1\,0000$, and $Z = 0000$ looks like a perfectly valid digit. Without the $K$ term the circuit outputs 0 with no
carry. [Chapter 1, Lesson 9](lesson:code-arithmetic#trap-bcd) is the same trap at the number level; in hardware it is
a missing OR input.
:::

:::note{#recap-bcd title="Recap" depth="quick"}
BCD adder = binary adder → detector $K + Z_3Z_2 + Z_3Z_1$ (= decimal carry) → second adder adding $0CC0$. Chain digits by
their decimal carries.
:::

### Worked examples: the BCD adder

::::example{#ex-bcd-easy level="easy" title="4 + 5" depth="quick"}
Trace the BCD adder for $A = 0100$, $B = 0101$, $c_{in} = 0$.

:::step{why="Adder 1 adds in binary."}
$K\,Z = 0\,1001$ (9).
:::

:::step{why="Detector: K = 0, Z3 = 1 but Z2 = Z1 = 0."}
$C_{out} = 0 + 0 + 0 = 0$: adder 2 adds 0000.
:::

:::answer
Digit 1001 (9), carry 0. Nothing is corrected because 9 is a valid digit.
:::
::::

::::example{#ex-bcd-medium level="medium" title="8 + 7" depth="standard"}
Trace $A = 1000$, $B = 0111$, $c_{in} = 0$.

:::step{why="Adder 1."}
$K\,Z = 0\,1111$ (15).
:::

:::step{why="Detector: Z3Z2 = 1."}
$C_{out} = 1$: adder 2 adds 0110.
:::

:::step{why="Adder 2: 1111 + 0110 = 1 0101; its own carry is dropped."}
Digit $0101$.
:::

:::answer
Carry 1, digit 5: $8 + 7 = 15$ ✓. The animation above plays this case first.
:::
::::

::::example{#ex-bcd-gate level="gate" title="9 + 9 + 1, the largest input" depth="standard"}
Trace $A = B = 1001$, $c_{in} = 1$.

:::step{why="Adder 1: 9 + 9 + 1 = 19 = 1 0011."}
$K = 1$, $Z = 0011$.
:::

:::step{why="Detector: K = 1 alone fires it; Z3 = 0, so the Z terms are 0."}
$C_{out} = 1$; adder 2 computes $0011 + 0110 = 1001$.
:::

:::answer
Carry 1, digit 9: 19 ✓. This is the largest sum a digit adder ever sees, which is why $Z$ never exceeds 0011 when
$K = 1$.
:::
::::

::::example{#ex-bcd-edge level="gate" title="Edge case: 8 + 9, a sum that looks valid" depth="standard"}
Trace $A = 1000$, $B = 1001$, $c_{in} = 0$, and say what a detector without $K$ would output.

:::step{why="Adder 1: 17 = 1 0001."}
$K = 1$, $Z = 0001$.
:::

:::step{why="The full detector: K = 1."}
$C_{out} = 1$; adder 2: $0001 + 0110 = 0111$: carry 1, digit 7 ✓ (17).
:::

:::step{why="Without K: Z3Z2 + Z3Z1 = 0, so nothing is added and the carry is lost."}
Output digit 0001, carry 0: "1" instead of 17.
:::

:::answer
Correct circuit: 17 (carry 1, digit 7). Detector without $K$: 1. Sums 16 … 19 are caught only by $K$.
:::
::::

:::intuition{#bcd-sub-intuition title="Subtract decimals with the same adder" depth="standard"}
To subtract BCD numbers the hardware does what the binary adder–subtractor does, one level up: it adds the
**nine's complement** of the subtrahend and a carry in of 1, which together make the ten's complement. The only
new part is a nine's complementer, a small combinational block that maps each digit $d$ to $9 - d$. The BCD adder
itself is unchanged.
:::

:::definition{#bcd-subtractor term="BCD subtraction hardware" depth="standard"}
A one-digit **nine's complementer** maps $d \mapsto 9 - d$ (0 ↔ 9, 1 ↔ 8, …), with the codes 10–15 as don't-cares;
its outputs are $N_0 = \bar d_0$, $N_1 = d_1$, $N_2 = d_2 \oplus d_1$, $N_3 = \overline{d_3 + d_2 + d_1}$. A decimal
adder–subtractor puts a complementer (enabled by $K$) on every digit of $B$ and feeds $K$ into the lowest digit's
carry in: $A + (10^k - 1 - B) + 1 = A - B + 10^k$. A final decimal carry of 1 means the result is non-negative and
is read directly; a carry of 0 means it is negative and in ten's-complement form (the number-level rule is
[Chapter 1, Lesson 9](lesson:code-arithmetic#bcd-sub)).

Example, 2 digits: $52 - 17$: $52 + 82 + 1 = 135$: carry 1, result 35 ✓.
:::

## Adders as code converters

:::intuition{#conv-intuition title="Add a constant that depends on the input" depth="standard"}
Many code conversions are "add something": excess-3 is BCD + 3; a two-digit decimal or base-12 reading of a binary
number is "add 6 (or 4) when the number is too big for one digit". So a converter can be one adder whose second
operand is a constant chosen by a tiny detector on the input. Recognising the constant and the detector tells
you the conversion.
:::

:::definition{#adder-converter term="Adder-based converters" depth="standard"}
- **BCD → excess-3:** one 4-bit adder adding the constant 0011: $E = B + 3$.
- **Binary → two-digit base $r$** (for a 4-bit input $b$ and $r > 8$): add $16 - r$ when $b \ge r$, with a detector for
  $b \ge r$. The carry out is the "tens" digit (always 0 or 1) and the 4 sum bits are the units digit.
  - $r = 12$: add $0100$ when $b_3b_2 = 1$ (i.e. $b \ge 12$). This is GATE 1996's circuit.
  - $r = 10$ (binary → BCD): add $0110$ when $b \ge 10$, detector $b_3(b_2 + b_1)$.

**Why it works:** for $b \ge r$, $b + (16 - r) = 16 + (b - r)$, so the carry out is 1 and the sum bits are $b - r$, the
units digit; for $b < r$ nothing is added and the number is its own units digit.
:::

:::note{#recap-conv title="Recap" depth="quick"}
Converter = adder + constant chosen by a detector. Add 3: excess-3. Add $16 - r$ when $b \ge r$: two-digit base $r$ (12 →
add 4 on $b_3b_2$; 10 → add 6 on $b_3(b_2 + b_1)$).
:::

### Worked examples: adder converters

::::example{#ex-conv-easy level="easy" title="The 1996 circuit for b = 1101" depth="quick"}
A 4-bit adder adds $b_3b_2b_1b_0$ and the operand $0\,(b_3b_2)\,0\,0$ with carry in 0; $d_4$ is the carry out. Find
$d_4d_3d_2d_1d_0$ for $b = 1101$ (13).

:::step{why="The detector is the AND of the two top bits; 1101 has b3 = b2 = 1."}
$b_3b_2 = 1$, so the second operand is $0100$ (4).
:::

:::step{why="Add in binary; the carry out becomes d4."}
$1101 + 0100 = 1\,0001$.
:::

:::answer
$d_4 = 1$, $d_3 \dots d_0 = 0001$: "11" in base 12 (one twelve and one unit) = 13 ✓.
:::
::::

::::example{#ex-conv-medium level="medium" title="The whole 1996 output table" depth="standard"}
List the outputs of the same circuit for $b = 0 \dots 15$.

:::step{why="For b < 12, b3b2 = 0 (unless b3 = b2 = 1), so nothing is added."}
$b = 0 \dots 11$: $d_4 = 0$ and $d_3 \dots d_0 = b$.
:::

:::step{why="For b = 12 … 15 the circuit adds 4: 12 + 4 = 16 = 1 0000, …, 15 + 4 = 19 = 1 0011."}
$b = 12, 13, 14, 15 \to 1\,0000, 1\,0001, 1\,0010, 1\,0011$.
:::

:::answer
$d_4$ is the twelves digit and $d_3 \dots d_0$ the units digit (0 … 11): binary to radix-12. Not hex (that would be the
identity), not BCD (that would correct from 10, not 12), not Gray.
:::
::::

::::example{#ex-conv-gate level="gate" title="BCD to excess-3 with one adder" depth="standard"}
Design a BCD → excess-3 converter with a 4-bit adder, and check digit 7.

:::step{why="Excess-3 is the digit plus 3."}
Feed the BCD digit to one input, the constant 0011 to the other, carry in 0.
:::

:::step{why="Digit 7 = 0111."}
$0111 + 0011 = 1010$, the excess-3 code of 7 ✓.
:::

:::answer
One 4-bit adder with $B = 0011$. (Chapter 5, Lesson 1 derives the same converter as four minimised gate functions,
6 gates instead of an adder's 20.)
:::
::::

::::example{#ex-conv-edge level="gate" title="Edge case: making the 1996 circuit convert binary to BCD" depth="standard"}
What must change in the 1996 circuit to output two BCD digits (tens bit and units digit) for $b = 0 \dots 15$?

:::step{why="BCD needs units 0 … 9, so the correction starts at 10 and adds 16 − 10 = 6."}
The second operand must be $0\,D\,D\,0$ with $D = 1$ iff $b \ge 10$.
:::

:::step{why="b ≥ 10 means 1010 … 1111: the quads b3b2 and b3b1."}
$D = b_3b_2 + b_3b_1 = b_3(b_2 + b_1)$.
:::

:::step{why="Check b = 10 and b = 15."}
$1010 + 0110 = 1\,0000$ ("10") ✓; $1111 + 0110 = 1\,0101$ ("15") ✓.
:::

:::answer
Replace the AND $b_3b_2$ by $b_3(b_2 + b_1)$ and feed it to bits 2 **and** 1 of the second operand (0110 instead of
0100). That is option B's circuit, which the 1996 figure is not.
:::
::::

## Try it

In the Adder Race, switch to **A − B** and press Race with $A = 5$, $B = 6$ (4 or 8 bits): the XOR row inverts $B$, the
carry in is 1, and the flag panel shows $C = 0$ (a borrow). Then try the preset "min − 1": the overflow flag lights
because $c_n \ne c_{n-1}$.

:::lab{#lab-addsub lab="adder-race" tab="race" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1996-a-46" tests="adder-converter" depth="standard"}
:::

:::pyq{id="cse-2003-cs-46" tests="control-lines,adder-subtractor,trap-a-plus-1" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-04-03-q01" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q02" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q03" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q04" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q05" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q06" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q07" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q08" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q09" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Adder–subtractor, flags and BCD adder on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Controlled inverter | $b \oplus K$: $b$ if $K = 0$, $\bar b$ if $K = 1$ |
| Adder–subtractor | $y_i = b_i \oplus K$, $c_0 = K$: $A + B$ or $A + \bar B + 1 = A - B$ |
| Separate $K$, $C_0$ | 00 $A + B$, 01 $A + B + 1$, 10 $A - B - 1$, 11 $A - B$; never $A + 1$ for arbitrary $B$ (GATE 2003) |
| Overflow | $V = c_n \oplus c_{n-1}$ (or same-sign inputs, different-sign output) |
| Flags | $C = c_n$ (after $A - B$: no borrow, $A \ge B$ unsigned), $N = s_{n-1}$, $Z$ = NOR of sums |
| Compare | unsigned $A < B$: $C = 0$; signed $A < B$: $N \oplus V = 1$; equal: $Z = 1$ |
| BCD adder | adder → detector $K + Z_3Z_2 + Z_3Z_1$ (= decimal carry) → add $0CC0$; 8 FA + 2 AND + 1 OR |
| Converters | add 0011: BCD → XS-3; add 0100 when $b_3b_2$: binary → radix 12 (GATE 1996); add 0110 when $b_3(b_2 + b_1)$: binary → BCD |
:::
