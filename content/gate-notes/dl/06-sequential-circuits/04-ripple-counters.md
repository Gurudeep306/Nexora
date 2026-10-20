---
id: ripple-counters
subject: dl
chapter: sequential-circuits
title: "Counter basics and asynchronous (ripple) counters"
order: 4
prerequisites: [flip-flops]
pyq_topics: [dl/sequential]
est_minutes: 45
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every count, state sequence, transient state, settling time, frequency, clear gate and practice answer is produced by simulation in content/gate-notes/_checks/dl/l6_04_ripple.py (seqlib ripple_events, settled_states, ff_count, pulses_between)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 87–92 and 101, set B pp. 157–158, set C pp. 342–353, set D p. 400."
  - "Facts checked against: M. Morris Mano and M. D. Ciletti, Digital Design (ripple counters, counters with asynchronous clear, BCD ripple counter); J. F. Wakerly, Digital Design: Principles and Practices (ripple delay, decoding glitches, asynchronous clear timing)."
  - "PYQs: src/gate/questions.json (cse-1994-a-2-1, it-2005-cs-11, cse-2007-cs-36, cse-2010-cs-32, cse-2011-cs-15, cse-2025-2-cs-24); every key is re-derived by event simulation of the counter."
updated: "2026-10-20"
---

*Counters and registers, lesson 1 of 3.* A **counter** is the simplest useful sequential circuit: a
handful of flip-flops that step through a fixed list of states, one step per clock pulse. Counters
measure time, divide clock frequencies, generate addresses and sequence the steps of every controller.
This lesson starts with the vocabulary every counter question uses (modulus, up and down, synchronous
and asynchronous), the one formula GATE asks most often (how many flip-flops a mod-N counter needs),
and the arithmetic of counting pulses with wrap-around. Then it builds the cheapest counter of all, the
**ripple counter**, in which each flip-flop clocks the next, and studies its three faces: as a
**counter** (up or down, depending on one wiring choice), as a **frequency divider** (each stage halves
the frequency), and as a **slow, glitchy** circuit (the carry ripples through the stages one delay at a
time). It ends with the standard trick for a counter of any modulus, the **asynchronous clear**.

## Where this fits

[Lesson 2](lesson:flip-flops) gave us the T flip-flop, whose next state is $T \oplus Q$: with $T = 1$
it toggles at every active edge. That single fact is the whole engine of this lesson. [Lesson
3](lesson:sequential-analysis) analysed synchronous circuits, in which every flip-flop shares one clock;
a ripple counter breaks that rule on purpose, and we will see what it buys and what it costs. [Lesson
5](lesson:synchronous-counter-design) then designs synchronous counters for any sequence, and
[Lesson 6](lesson:shift-registers) builds counters from shift registers (ring and Johnson counters).
The sentence to keep: **in a ripple counter, stage $i$ toggles when stage $i - 1$ makes the transition
that carries (or borrows), and every stage adds one propagation delay.**

:::table{#radar title="GATE radar: counter basics and ripple counters" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 6 (1994, IT 2005, 2007, 2010, 2011, 2025) |
| Marks | 1-mark MCQs (IT 2005, 2011), a 1-mark NAT (2025), 2-mark MCQs (2007, 2010) and a fill-in-the-blank (1994) |
| Pattern 1 | Size a counter: flip-flops for mod-N (1994, 2011: mod-258 needs 9) |
| Pattern 2 | Count pulses between two states of an n-bit counter, with wrap-around (IT 2005) |
| Pattern 3 | Read the count direction from the wiring: positive-edge T flip-flops clocked by Q count down (2010) |
| Pattern 4 | A counter with an asynchronous clear driven by a gate: which states survive (2007) |
| Pattern 5 | Frequency division: the last stage of an n-bit ripple counter runs at f/2ⁿ (2025) |
| What examiners test | ⌈log₂ N⌉, not N or ⌊log₂ N⌋; (b − a) mod 2ⁿ, not b − a; the edge × source table for up/down; that an asynchronous clear makes state N vanish at once; f/2ⁿ at stage n, not f/n |
:::

## What a counter is

:::intuition{#counter-intuition title="An odometer" depth="standard"}
Look at the mileage counter of an old car. It is a row of wheels, each printed with the digits 0 to 9.
The rightmost wheel turns once per tenth of a kilometre. Every time it rolls over from 9 to 0, it nudges
the wheel to its left forward by one digit; when that wheel rolls over, it nudges the next one, and so
on. Nobody drives the left wheels directly: each wheel is driven by the **roll-over** of its right-hand
neighbour.

A binary counter is the same machine with two-digit wheels (0 and 1). The rightmost bit flips at every
clock pulse; whenever a bit rolls over from 1 back to 0, it pushes the next bit forward. Notice that the
odometer already contains both ideas of this lesson: the **count** (the digits shown) and the **ripple**
(a roll-over at 0999 → 1000 travels from the right wheel to the left one, wheel by wheel, and for a
moment the display shows numbers that are neither 0999 nor 1000).
:::

:::definition{#counter-def term="Counter, modulus, up/down, synchronous/asynchronous" depth="standard"}
A **counter** is a sequential circuit that steps through a fixed cyclic sequence of states, one step for
each **active edge** of its input (the clock or the pulses being counted).

- The **modulus** (mod) of a counter is the number of distinct states in its cycle. A **mod-N counter**
  returns to its starting state after every $N$ pulses. An $n$-bit binary counter that uses all its
  states is mod-$2^n$; one that skips some states (for example a decade counter, 0 to 9) has a modulus
  below $2^n$.
- An **up counter** steps through $0, 1, 2, \dots, N - 1, 0, \dots$; a **down counter** through
  $N - 1, N - 2, \dots, 1, 0, N - 1, \dots$ (from 0 the next state of a down counter is the largest state).
  An **up/down counter** has a mode input that chooses the direction.
- In a **synchronous** counter every flip-flop is clocked by the same clock signal, and gates in front of
  the flip-flop inputs decide which bits change ([Lesson 5](lesson:synchronous-counter-design)). In an
  **asynchronous** (or **ripple**) counter only the first flip-flop receives the clock; each later
  flip-flop is clocked by an output of the flip-flop before it.

The state of an $n$-bit counter is written $Q_{n-1} \dots Q_1 Q_0$, with $Q_0$ the least significant bit
(the one that changes at every pulse in a binary counter).
:::

A counter is therefore "a register plus a rule". Two numbers describe it from the outside, the
modulus and the direction, and one fact describes it from the inside, how its flip-flops are clocked.
GATE asks about all three, and the first question is always the cheapest one: **how many flip-flops**?

:::theorem{#ff-count name="Flip-flops needed for a mod-N counter" depth="standard"}
A mod-$N$ counter ($N \ge 2$) built with **binary-coded** states needs at least
$$k = \lceil \log_2 N \rceil$$
flip-flops, and that many are enough. Equivalently, $k$ is the smallest integer with $2^k \ge N$. With
other state codes the count changes: a **one-hot** code (one flip-flop per state, exactly one of them 1)
uses $N$ flip-flops, and a **Johnson** (twisted-ring) code uses $N/2$ flip-flops for an even $N$.
:::

:::proof{#proof-ff-count of="the flip-flop count" depth="standard"}
**Idea first:** a counter must remember how many pulses it has seen (modulo $N$), and $k$ bits can
remember at most $2^k$ different things.

*At least $\lceil \log_2 N \rceil$.* After $0, 1, \dots, N - 1$ pulses (from the starting state) a mod-$N$
counter is in $N$ different states, because a mod-$N$ counter first returns to its start after exactly $N$
pulses: if the states after $i$ and $j$ pulses ($0 \le i < j < N$) were equal, the counter would repeat
with period $j - i < N$, and its cycle would have fewer than $N$ states. The state lives in $k$
flip-flops, which can hold only $2^k$ different bit patterns. So $2^k \ge N$, which means
$k \ge \log_2 N$, and since $k$ is an integer, $k \ge \lceil \log_2 N \rceil$.

*Enough.* With $k = \lceil \log_2 N \rceil$ we have $2^k \ge N$, so the patterns for $0, 1, \dots, N - 1$
exist; a binary counter that counts up and returns to 0 after $N - 1$ realises the cycle (we build one
with an asynchronous clear at the end of this lesson, and one with no clear in
[Lesson 5](lesson:synchronous-counter-design)).

*Other codes.* One-hot uses one flip-flop per state by definition: $N$. A Johnson counter of $m$ flip-flops
cycles through $2m$ states, so a mod-$N$ Johnson counter needs $m = N/2$. ∎

**Sanity check.** $N = 2^k$ exactly: $\lceil \log_2 2^k \rceil = k$, and $k$ bits have exactly $2^k$
patterns, all used. One more state, $N = 2^k + 1$, already needs $k + 1$ flip-flops. `seqlib.ff_count`
returns 4 for mod-10, 8 for mod-256 and 9 for mod-257 and mod-258.
:::

The ring and Johnson counters behind the one-hot and Johnson codes are shift-register counters with a
**common** clock, so they are synchronous circuits; they get their own lesson
([Lesson 6](lesson:shift-registers)). For "the number of flip-flops for a mod-N counter" without further
words, GATE means binary coding: $\lceil \log_2 N \rceil$ (GATE 1994 asked exactly this, as a fill-in).

:::trap{#trap-ff-count title="258 states need 9 flip-flops, not 8 and not 258" depth="standard"}
GATE 2011 asked for the minimum number of D flip-flops in a mod-258 counter, with the options 9, 8, 512
and 258. Each wrong option is a known slip:

- **8** comes from rounding $\log_2 258 \approx 8.01$ **down**, or from remembering "256 is about 258".
  Eight flip-flops have only $2^8 = 256$ states, two short.
- **258** confuses binary coding with one-hot coding (one flip-flop per state). It is a valid design, but
  not the minimum.
- **512** is the number of **states** that 9 flip-flops provide, not the number of flip-flops.

The answer is $\lceil \log_2 258 \rceil = 9$, because $2^8 = 256 < 258 \le 512 = 2^9$. The flip-flop type
(D, T or JK) does not change the count; it changes only the gates in front of the flip-flops.
:::

:::note{#recap-counter-def title="Recap" depth="quick"}
A mod-N counter cycles through N states. Binary coding needs $\lceil \log_2 N \rceil$ flip-flops (the
smallest $k$ with $2^k \ge N$); one-hot needs N, Johnson N/2. Synchronous: one shared clock; ripple:
each flip-flop clocked by the previous one.
:::

## Counting pulses between two states

:::intuition{#pulse-intuition title="A clock face, not a ruler" depth="standard"}
If it is 10 o'clock now, how many hours until 3 o'clock? Not $3 - 10 = -7$: you go forward past 12 and
arrive after 5 hours. The hours live on a circle of 12, and "forward from 10 to 3" means "add 12 when
you go past the top".

An $n$-bit up counter lives on a circle of $2^n$ states: after the largest value, $2^n - 1$, it wraps
round to 0. So the number of pulses from state $a$ to state $b$ is a clock-face distance, not a ruler
distance.
:::

:::derivation{#pulse-count of="the number of pulses from state a to state b" depth="standard"}
An $n$-bit up counter adds 1 modulo $2^n$ at every pulse: after $p$ pulses from state $a$ it holds
$(a + p) \bmod 2^n$. We want the smallest $p \ge 0$ with $(a + p) \bmod 2^n = b$, that is,
$p \equiv b - a \pmod{2^n}$. The smallest such $p$ in $0 \dots 2^n - 1$ is
$$p_{\text{up}} = (b - a) \bmod 2^n = \begin{cases} b - a & \text{if } b \ge a, \\ 2^n - a + b & \text{if } b < a. \end{cases}$$
A down counter subtracts 1 at each pulse, so the same argument gives $p_{\text{down}} = (a - b) \bmod 2^n$.
For $a \ne b$ the two distances add up to one full turn: $p_{\text{up}} + p_{\text{down}} = 2^n$.

**Sanity check.** From the largest state to 0 an up counter needs one pulse: $(0 - (2^n - 1)) \bmod 2^n = 1$.
From 0 to 0 it needs 0 pulses (or a full $2^n$ if the question insists on at least one pulse; read the
wording). `seqlib.pulses_between` computes $(b - a) \bmod 2^n$, and stepping a simulated counter pulse by
pulse reaches $b$ after exactly that many pulses.
:::

:::trap{#trap-wrap title="Forgetting the wrap-around (or counting one pulse too many)" depth="standard"}
IT 2005 asked how many pulses take an 8-bit up counter from 10101100 to 00100111. In decimal that is
from 172 to 39, so the target is **smaller** than the start and the counter must wrap through 255 → 0.
The expected wrong answers are:

- **133** $= 172 - 39$: subtracting the wrong way round. That is the number of pulses a **down** counter
  would need.
- **134** $= 133 + 1$ and **124** $= 123 + 1$: the two distances with one extra pulse, from counting the
  start state as well (or counting the 255 → 0 wrap twice).

The correct count is $(39 - 172) \bmod 256 = 256 - 172 + 39 = 123$. Always check it forward:
$172 + 123 = 295 = 256 + 39$.
:::

:::note{#recap-pulse title="Recap" depth="quick"}
Up counter: $(b - a) \bmod 2^n$ pulses; down counter: $(a - b) \bmod 2^n$; together they make $2^n$.
Convert to decimal, subtract, add $2^n$ if negative, and check by adding back.
:::

### Worked examples: counting and sizing

::::example{#ex-count-easy level="easy" title="Flip-flops for mod-10 and mod-258" depth="quick"}
How many flip-flops does a binary mod-10 counter need? And a mod-258 counter (GATE 2011)?

:::step{why="The flip-flop count is the smallest k whose 2^k reaches N."}
Mod-10: $2^3 = 8 < 10 \le 16 = 2^4$, so $k = 4$.
:::

:::step{why="The same test for 258: find the powers of two on either side."}
Mod-258: $2^8 = 256 < 258 \le 512 = 2^9$, so $k = 9$.
:::

:::answer
4 flip-flops for mod-10 (6 of the 16 patterns are unused) and 9 for mod-258 (GATE 2011, option A; 254 of
the 512 patterns are unused). In both cases most students' first guess, $\log_2 N$ rounded to the nearest
integer, is wrong for **both**: $\log_2 10 \approx 3.32$ rounds to 3 and $\log_2 258 \approx 8.01$ rounds to 8.
Round **up**, always.
:::
::::

::::example{#ex-count-it2005 level="medium" title="Pulses from 10101100 to 00100111 (GATE IT 2005)" depth="standard"}
An 8-bit up counter holds 10101100 (rightmost bit = LSB). How many clock pulses make it read 00100111?

:::step{why="Wrap-around arithmetic is easiest in decimal."}
$a = 10101100_2 = 128 + 32 + 8 + 4 = 172$ and $b = 00100111_2 = 32 + 4 + 2 + 1 = 39$.
:::

:::step{why="The target is below the start, so the counter must pass through 255 and wrap to 0."}
Pulses $= (b - a) \bmod 2^8 = (39 - 172) \bmod 256 = -133 + 256 = 123$.
:::

:::step{why="Adding the pulses back to the start must land on the target, modulo 256."}
Check: $172 + 123 = 295$, and $295 - 256 = 39$. ✓
:::

:::answer
**123** pulses (IT 2005, option D). Read the other way, the 133 of option B is what a **down** counter
would need: $(172 - 39) \bmod 256 = 133$. The two answers add up to 256, one full turn of the counter.
:::
::::

::::example{#ex-count-codes level="gate" title="One sequence, three codes" depth="standard"}
A controller must step through a cycle of 12 states. How many flip-flops does it need with (a) binary
state codes, (b) a one-hot code, (c) a Johnson (twisted-ring) code? Which code needs no decoding gates to
recognise each state?

:::step{why="Binary coding: the smallest k with 2^k at least 12."}
(a) $2^3 = 8 < 12 \le 16 = 2^4$: **4** flip-flops.
:::

:::step{why="One-hot gives every state its own flip-flop."}
(b) **12** flip-flops; state $i$ is "flip-flop $i$ is 1".
:::

:::step{why="A Johnson counter of m flip-flops has 2m states."}
(c) $2m = 12$ gives $m = 6$ flip-flops.
:::

:::answer
Binary 4, one-hot 12, Johnson 6. One-hot needs no decoder at all (each state **is** a wire), and a
Johnson state is recognised by a 2-input gate on two adjacent bits (for the all-0 and all-1 states, the two end bits;
[Lesson 6](lesson:shift-registers)); binary needs up to a 4-input decode for each state. GATE's "minimum number of flip-flops" means the binary
count, 4. The trade-off (fewer flip-flops versus simpler decoding) is the reason all three codes exist.
:::
::::

::::example{#ex-count-edge level="gate" title="Edge case: mod-1, mod-256 and mod-257" depth="standard"}
How many flip-flops do a mod-1, a mod-256 and a mod-257 counter need?

:::step{why="A mod-1 counter has a single state, so it never needs to remember anything."}
Mod-1: one state, $\lceil \log_2 1 \rceil = 0$ flip-flops (its "count" is a constant).
:::

:::step{why="When N is an exact power of two, the ceiling does not round up."}
Mod-256: $\log_2 256 = 8$ exactly, so **8** flip-flops, and all 256 patterns are used.
:::

:::step{why="One state past a power of two forces a whole new flip-flop."}
Mod-257: $2^8 = 256 < 257$, so **9** flip-flops, of whose 512 patterns only 257 are used.
:::

:::answer
0, 8 and 9. Notice the jump: going from 256 to 257 states costs a whole flip-flop and wastes 255
patterns. Students who use $\lfloor \log_2 N \rfloor + 1$ get 9 for mod-256 (wrong) and 1 for mod-1 (wrong);
$\lceil \log_2 N \rceil$ is right in both places.
:::
::::

## The ripple up counter

:::intuition{#ripple-intuition title="A row of dominoes that each fall only on a push" depth="standard"}
Take three T flip-flops with $T = 1$: each one simply toggles whenever its clock pin sees an active edge.
Feed the real clock into the first one only. The first flip-flop now toggles at every clock edge, so its
output is a square wave at half the clock rate. Now use **that output** as the clock of the second
flip-flop: the second toggles once for every two toggles of the first. And the third is clocked by the
second.

Which edge of the first output should push the second? Look at binary counting: $Q_1$ must change exactly
when $Q_0$ **rolls over from 1 to 0** (01 → 10, 11 → 00), the odometer's carry. So with flip-flops that
react to a **falling** edge, $Q_0$ connected straight to the next clock pin is exactly right.
:::

:::definition{#ripple-up term="Ripple (asynchronous) up counter" depth="standard"}
An $n$-bit **ripple up counter** is a chain of $n$ T flip-flops with $T = 1$ (or JK flip-flops with
$J = K = 1$, or D flip-flops with $D = \overline{Q}$, all of which toggle at every active edge), with
**negative-edge** clock inputs:

- stage 0 is clocked by the counter's input clock $CLK$;
- stage $i$ ($i \ge 1$) is clocked by $Q_{i-1}$, the output of stage $i - 1$.

Stage 0 toggles at every falling edge of $CLK$; stage $i$ toggles at every falling edge of $Q_{i-1}$, that
is, whenever $Q_{i-1}$ goes from 1 to 0. Starting from 000, a 3-bit ripple up counter steps through
000, 001, 010, 011, 100, 101, 110, 111 and back to 000: it is mod-8. No gates are needed.
:::

Why does this give binary counting? Adding 1 to a binary number flips the lowest bit, and keeps flipping
bits to the left for as long as the bit just flipped went from 1 to 0 (that is the carry). The ripple
counter does the same thing physically: each falling output is the carry into the next stage. The
animation runs a 3-bit counter with one delay per stage, so you can watch the carry travel. Each clock pin
is drawn with a small circle in front of the wedge: the **bubble** that marks a falling-edge input, the one
inversion that the up-counter wiring needs (the trick below counts it).

:::viz{#ripple-counter-wave-viz spec="ripple-counter-wave" mode="animate" depth="standard"}
:::

Notice edge 4 in the animation. The counter holds 011. The clock's falling edge toggles $Q_0$ to 0, which
is a falling edge for stage 1, which toggles $Q_1$ to 0, which is a falling edge for stage 2, which
toggles $Q_2$ to 1. Each step takes one propagation delay, so the outputs pass through
**011 → 010 → 000 → 100**: two states (2 and 0) that the count never meant to show. We come back to these
"false states" in the section on ripple delay.

The rule "falling-edge stages clocked by $Q$ count up" is one of four combinations. A flip-flop's clock pin
can react to a rising or a falling edge, and the previous stage offers two outputs, $Q$ and $\overline{Q}$.
A rising edge of $\overline{Q}$ happens exactly when $Q$ falls, so the four combinations reduce to two
behaviours.

:::theorem{#ripple-rule name="Which wiring counts up and which counts down" depth="standard"}
In a ripple counter of toggling stages (T = 1), let stage $i$ be clocked by a signal $c_i$ taken from
stage $i - 1$.

| Active edge of the stages | $c_i = Q_{i-1}$ | $c_i = \overline{Q_{i-1}}$ |
|:--|:--:|:--:|
| negative (falling) edge | **up** | **down** |
| positive (rising) edge | **down** | **up** |

Equivalently: stage $i$ toggles when $Q_{i-1}$ falls (1 → 0) in an up counter and when $Q_{i-1}$ rises
(0 → 1) in a down counter.
:::

:::proof{#proof-ripple-rule of="the up/down wiring rule" depth="standard"}
**Idea first:** binary increment flips bit $i$ exactly when bit $i - 1$ falls; decrement flips bit $i$
exactly when bit $i - 1$ rises. Then check which wiring delivers an active edge at those moments.

*Increment.* Adding 1 to a binary number flips the trailing 1s to 0 and the lowest 0 to 1, and changes
nothing else. So bit $i$ flips if and only if bits $0, \dots, i - 1$ were all 1. Bit $i - 1$ flips if and only
if bits $0, \dots, i - 2$ were all 1, and it flips **from 1 to 0** if and only if, in addition, bit $i - 1$ was
1. Together: bit $i$ flips if and only if bit $i - 1$ goes from 1 to 0.

*Decrement.* Subtracting 1 flips the trailing 0s to 1 and the lowest 1 to 0. The same argument with 0 and 1
exchanged: bit $i$ flips if and only if bit $i - 1$ goes from 0 to 1.

*The wiring.* A falling edge of $Q_{i-1}$ is a falling edge of $c_i = Q_{i-1}$ and a rising edge of
$c_i = \overline{Q_{i-1}}$. So a falling-edge stage clocked by $Q_{i-1}$, and a rising-edge stage clocked by
$\overline{Q_{i-1}}$, toggle exactly when $Q_{i-1}$ falls: up. A rising edge of $Q_{i-1}$ is a rising edge of
$Q_{i-1}$ and a falling edge of $\overline{Q_{i-1}}$; so a rising-edge stage clocked by $Q_{i-1}$, and a
falling-edge stage clocked by $\overline{Q_{i-1}}$, toggle exactly when $Q_{i-1}$ rises: down. Stage 0 toggles
at every active clock edge in all four cases, which is both "+1" and "−1" for bit 0. ∎

**Check by simulation.** `seqlib.ripple_events` with negative-edge stages clocked by $Q$ settles at 1, 2, 3,
4, 5 after the first five clocks; with positive-edge stages clocked by $Q$ (the 2010 circuit, 2 bits) it
settles at 3, 2, 1, 0.
:::

:::trick{#trick-trigger-table title="Count the inversions: exactly one means up" depth="standard"}
Each connection has two places where an "inversion" can hide: the clock pin (a **bubble**, i.e. a
negative-edge flip-flop) and the source (**$\overline{Q}$** instead of $Q$). Count them:

- **exactly one** inversion (negative edge with $Q$, or positive edge with $\overline{Q}$): **up**;
- **zero or two** inversions (positive edge with $Q$, or negative edge with $\overline{Q}$): **down**.

The base case to remember is the textbook up counter: falling-edge stages, each clocked by the plain $Q$
of the one before (one inversion, the bubble).

**Why it works:** each inversion swaps "the moment $Q_{i-1}$ falls" with "the moment it rises", and two swaps
cancel; the rule table of the theorem is exactly this parity. **When it fails:** for stages that do not simply
toggle (a JK stage with $J$ or $K$ driven by other signals, or extra gating in the clock path); then simulate
edge by edge. It also says nothing about which outputs you **read**: the $\overline{Q}$ outputs of an up counter
show a down count (next section).
:::

:::trap{#trap-trigger-rule title="Positive-edge T flip-flops clocked by Q count down" depth="standard"}
GATE 2010 drew two **positive-edge** T flip-flops with $T = 1$, the second clocked by $Q_0$, and asked for the
next four values of $Q_1Q_0$ from 00. Students who learned "Q into the next clock = up counter" (true only for
negative-edge stages) look for 01, 10, 11, 00, which is not even offered, and then guess. Simulate instead: at the
first clock $Q_0$ rises 0 → 1, which **is** an active edge for the second flip-flop, so $Q_1$ toggles at once:
00 → 11. Then 10, 01, 00. The answer is **11, 10, 01, 00**: a down counter (option A).

A ten-second check eliminates the rest: $Q_0$ toggles at every clock whatever the wiring, so the right column must
read 1, 0, 1, 0. Options B (10, 11, 01, 00) and C (10, 00, 01, 11) have $Q_0 = 0$ after the first pulse, and D
(11, 10, 00, 01) has $Q_0 = 0$ after the third.
:::

:::note{#recap-ripple-up title="Recap" depth="quick"}
Toggling stages; stage 0 on the clock, stage $i$ on stage $i - 1$. Negative edge + Q or positive edge + Q̄:
up. Negative edge + Q̄ or positive edge + Q: down. Bit $i$ flips when bit $i - 1$ falls (up) or rises (down).
:::

## Down counters and up/down counters

:::intuition{#down-intuition title="Running the odometer backwards" depth="standard"}
Roll a car backwards and the odometer wheels turn the other way: 1000 becomes 0999. Now the "carry" is a
**borrow**: a wheel that rolls back from 0 to 9 pulls the wheel on its left back by one. In binary, a bit that
rolls back from 0 to 1 borrows from the next bit. So a down counter is an up counter in which each stage is
pushed by the **rising** output of its neighbour instead of the falling one.
:::

:::definition{#ripple-down term="Ripple down counter" depth="standard"}
A **ripple down counter** is the ripple counter of the previous section with the other connection of the
rule: negative-edge stages clocked by $\overline{Q_{i-1}}$ (or positive-edge stages clocked by $Q_{i-1}$). Stage
$i$ toggles whenever $Q_{i-1}$ rises from 0 to 1. A 2-bit ripple down counter starting at 00 steps through
**00 → 11 → 10 → 01 → 00**, and a 3-bit one through 000 → 111 → 110 → 101 → 100 → 011 → 010 → 001 → 000.

A second way to get a down count needs no rewiring: read the **complement outputs** of an up counter. If the
up counter holds $u$, its $\overline{Q}$ outputs hold $(2^n - 1) - u$; as $u$ goes 0, 1, 2, …, the complement goes
$2^n - 1$, $2^n - 2$, …: a down count starting from the top.
:::

:::note{#note-down-order title="The order of a down count" depth="standard"}
At least one set of revision notes draws a "mod-4 down counter" whose states go 0 → 1 → 2 → 3. That is an
**up** count. A down counter goes the other way round the circle: **0 → 3 → 2 → 1 → 0**. The first step,
from 0 to 3, is the one that looks strange and the one examiners test: from the all-0 state a down counter
borrows through every bit and lands on all 1s. The simulation of a 2-bit ripple down counter from 00 settles
at 11, 10, 01, 00.
:::

:::aside{#up-down-ripple title="One counter, both directions: the mode input" depth="deep"}
An **up/down ripple counter** puts a small selector between stages: with a mode input $M$ ($M = 0$ for up,
$M = 1$ for down, negative-edge stages), stage $i$ is clocked by
$$c_i = \overline{M}\,Q_{i-1} + M\,\overline{Q_{i-1}} = M \oplus Q_{i-1},$$
one 2:1 multiplexer (or two ANDs and an OR, or one XOR gate) per stage. With $M = 0$ the clock pins see $Q$ (up),
with $M = 1$ they see $\overline{Q}$ (down).

There is a catch. Changing $M$ changes $M \oplus Q_{i-1}$ for **every** stage at once, and wherever that change is
a falling edge the stage toggles although no clock pulse arrived. The count can jump when the direction is
switched. Real designs change $M$ only while it cannot create an active edge, or use a synchronous up/down
counter ([Lesson 5](lesson:synchronous-counter-design)), where the mode input only steers the gates and the flip-flops
still change only at the clock edge.
:::

:::note{#recap-ripple-down title="Recap" depth="quick"}
Down counter: stage $i$ toggles when $Q_{i-1}$ rises (negative edge with Q̄, or positive edge with Q). From 0 a
down counter goes to all 1s: 0 → 3 → 2 → 1 → 0 for 2 bits. Reading Q̄ of an up counter also gives a down count.
:::

### Worked examples: ripple up and down counters

::::example{#ex-ripple-easy level="easy" title="The states of a 3-bit ripple up counter" depth="quick"}
A 3-bit ripple counter uses negative-edge T flip-flops with $T = 1$; $CLK$ drives stage 0, $Q_0$ clocks stage 1
and $Q_1$ clocks stage 2. It starts at 000. List $Q_2Q_1Q_0$ after each of the first eight clock pulses.

:::step{why="Stage 0 toggles at every falling clock edge."}
$Q_0$: 1, 0, 1, 0, 1, 0, 1, 0.
:::

:::step{why="Stage 1 toggles whenever Q0 falls, which happens at pulses 2, 4, 6 and 8."}
$Q_1$: 0, 1, 1, 0, 0, 1, 1, 0.
:::

:::step{why="Stage 2 toggles whenever Q1 falls, at pulses 4 and 8."}
$Q_2$: 0, 0, 0, 1, 1, 1, 1, 0.
:::

:::answer
001, 010, 011, 100, 101, 110, 111, 000: a mod-8 up counter. Reading the columns instead of the rows shows the
frequency division of the next section: $Q_0$ repeats every 2 pulses, $Q_1$ every 4 and $Q_2$ every 8.
:::
::::

::::example{#ex-ripple-2010 level="medium" title="Positive-edge stages clocked by Q (GATE 2010)" depth="standard"}
Two positive-edge-triggered T flip-flops have $T = 1$. The first is clocked by $CLK$ (output $Q_0$); the second
is clocked by $Q_0$ (output $Q_1$). From $Q_1Q_0 = 00$, what are the next four values of $Q_1Q_0$?

:::step{why="Stage 0 toggles at every rising clock edge whatever the wiring."}
$Q_0$: 1, 0, 1, 0.
:::

:::step{why="Stage 1 is a positive-edge flip-flop on Q0, so it toggles exactly when Q0 rises: pulses 1 and 3."}
Pulse 1: $Q_0$ rises, $Q_1$ toggles 0 → 1. Pulse 2: $Q_0$ falls, no edge for stage 1, $Q_1 = 1$. Pulse 3: $Q_0$ rises,
$Q_1$ toggles to 0. Pulse 4: $Q_0$ falls, $Q_1 = 0$.
:::

:::step{why="Combine the two columns, Q1 first."}
$Q_1Q_0$: 11, 10, 01, 00.
:::

:::answer
**11, 10, 01, 00** (GATE 2010, option A): 3, 2, 1, 0, a down counter, exactly as the rule table says for a
positive edge with $Q$ (zero inversions). The up count 01, 10, 11, 00 would apply the negative-edge rule to a
positive-edge circuit. Notice the shortcut: only option A has $Q_0 = 1, 0, 1, 0$.
:::
::::

::::example{#ex-ripple-mixed level="gate" title="A mixed counter: Q into one stage, Q̄ into the next" depth="standard"}
A 3-bit ripple counter has negative-edge T flip-flops with $T = 1$. Stage 1 is clocked by $Q_0$, but stage 2 is
clocked by $\overline{Q_1}$. From 000, list $Q_2Q_1Q_0$ for eight pulses. Is it an up counter, a down counter, or
neither?

:::step{why="Stages 0 and 1 are wired as an up counter, so the two low bits count up."}
$Q_1Q_0$: 01, 10, 11, 00, 01, 10, 11, 00.
:::

:::step{why="Stage 2 is clocked by Q̄1 on falling edges, so it toggles when Q1 rises: pulses 2 and 6."}
$Q_2$: 0, 1, 1, 1, 1, 0, 0, 0.
:::

:::step{why="Combine the bits and read each state in decimal."}
001, 110, 111, 100, 101, 010, 011, 000, that is 1, 6, 7, 4, 5, 2, 3, 0.
:::

:::answer
It visits all eight states and returns to 000 after 8 pulses, so it is mod-8, but the order 0, 1, 6, 7, 4, 5, 2,
3 is **neither** up nor down. Notice that the direction rule is a **per-stage** rule: each stage independently
decides whether bit $i$ follows the carry or the borrow of bit $i - 1$. A counter counts up only if **every**
stage is wired for up.
:::
::::

::::example{#ex-ripple-edge level="gate" title="Edge case: a down counter at 000" depth="standard"}
A 3-bit ripple down counter (negative-edge stages clocked by $\overline{Q}$, delay 10 ns per stage) holds 000.
What does it show during the 30 ns after the next clock edge, and where does it settle?

:::step{why="Stage 0 toggles first, one delay after the edge."}
At 10 ns: $Q_0$ goes 0 → 1, state 001. That rise is a falling edge of $\overline{Q_0}$, so stage 1 is clocked.
:::

:::step{why="Each borrow passes to the next stage one delay later."}
At 20 ns: $Q_1$ goes 0 → 1, state 011, and stage 2 is clocked. At 30 ns: $Q_2$ goes 0 → 1, state 111.
:::

:::answer
000 → 001 → 011 → **111**, settled 30 ns after the edge: from 0, a down counter wraps to the **largest** state,
borrowing through every bit (the down-counting twin of 011 → 100 in the up counter). The first step of a down
count from 0 is to 7, never to 1.
:::
::::

## Dividing the frequency: every stage halves the clock

:::intuition{#freq-intuition title="Every second step" depth="standard"}
March to a drum but step only on every second beat: you take half as many steps as there are beats. Let a
friend step on every second one of **your** steps: a quarter of the beats. A T flip-flop with $T = 1$ is such a
marcher: it changes once per active edge, and it takes two changes (up and back down) to make one full cycle of
its output. So each stage of a ripple counter is a **divide-by-two**, and a chain of $n$ of them divides by $2^n$.
:::

:::derivation{#divide-by-two of="the frequency of each stage" depth="standard"}
Let the input clock have period $T$ and frequency $f = 1/T$, and let stage 0 react to one edge of it per period.

1. Stage 0 toggles at every active edge, i.e. once per $T$. Its output goes up at one edge and down at the next,
   so one full output cycle takes two input periods: period $2T$, frequency $f/2$. Each level lasts exactly one input
   period, so the duty cycle is 50%.
2. Stage $i$ is clocked by stage $i - 1$, which has exactly one active edge (one fall, or one rise) per cycle of its own
   output. So stage $i$ toggles once per period of stage $i - 1$ and, by the same argument, has twice its period.
3. By induction, stage $i$ (counting from 0) has period $2^{i+1}\,T$ and frequency
   $$f_i = \frac{f}{2^{\,i+1}}, \qquad\text{and the last stage of an } n\text{-bit counter runs at } \frac{f}{2^n}.$$

**Sanity check.** A 3-bit counter: $f/2$, $f/4$, $f/8$. In the counting table of the easy example, $Q_0$ repeats every
2 pulses, $Q_1$ every 4, $Q_2$ every 8. The same holds for a down counter (each stage still toggles once per cycle of its
neighbour) and for a synchronous binary counter (bit $i$ of a binary count has period $2^{i+1}$ whatever the circuit).
Delays shift every edge of a stage by the same amount, so they do not change any period.
:::

:::definition{#frequency-division term="Counter as a frequency divider" depth="standard"}
A mod-$N$ counter clocked at frequency $f$ completes one cycle every $N$ pulses, so any output that repeats once per
cycle runs at $f/N$. For an $n$-bit ripple counter, $Q_i$ runs at $f/2^{i+1}$: the **first** stage gives $f/2$, the
**second** $f/4$, the **third** $f/8$, and the last $f/2^n$. Counters in series multiply: a mod-$M$ counter whose output
clocks a mod-$N$ counter gives a mod-$MN$ chain and an output at $f/(MN)$.

**Duty cycle.** The duty cycle of an output is the fraction of its period during which it is 1. A binary stage is 1 for exactly
half of its period (step 1 of the derivation above), so every output of a $2^n$ counter is a square wave at 50%. A mod-$N$ output
still has frequency $f/N$, but it is a square wave only for $N = 2^k$: during one cycle the counter spends one clock period in each
of its $N$ states, so an output bit is 1 for (number of states in which that bit is 1) out of $N$ periods. In the mod-6 counter of
this lesson (a 3-bit counter cleared at 110, last section) $Q_2$ is 1 in 2 of the 6 states (4 and 5), a 33% duty cycle; in the
decade counter (cleared at 1010) $Q_3$ is 1 only in 8 and 9, a 20% duty cycle. Both outputs still fall exactly once per cycle,
which is all the next counter in a chain needs.
:::

The animation runs a 3-bit counter for twelve clock periods (delays ignored) and then marks one full period of each output.

:::viz{#frequency-divider-viz spec="frequency-divider" mode="animate" depth="standard"}
:::

:::note{#note-third-stage title="The third stage is Q2 at f/8" depth="standard"}
A frequent labelling slip (one set of notes prints it) names the outputs of a 3-stage divider $Q_0$, $Q_1$ and then
$Q_1$ again. With stages numbered from 0, the outputs are $Q_0 = f/2$, $Q_1 = f/4$ and $Q_2 = f/8$: stage $i$ runs at
$f/2^{i+1}$, so the third stage, $i = 2$, divides by 8. When a question says "the third flip-flop", count the
flip-flops from the clock input: first, second, third, and divide by $2^3$.
:::

GATE 2025 turned the divider round: given the **output** period of the last stage, find the **input** frequency.

:::note{#recap-freq title="Recap" depth="quick"}
Each toggling stage halves the frequency: $Q_i$ at $f/2^{i+1}$, the last stage of an $n$-bit counter at $f/2^n$, binary
stages at 50% duty. A mod-$N$ output runs at $f/N$ but is square only for $N = 2^k$. Cascaded counters multiply their moduli. Go backwards by multiplying the output frequency by $2^n$.
:::

## Ripple delay: why ripple counters are slow and glitchy

:::intuition{#delay-intuition title="A message passed down a line" depth="standard"}
A message passed along a line of people takes one "turn" per person. If the message is "your neighbour has rolled
over, roll over too", the last person hears it $n$ turns after the first. In the meantime, someone looking at the
whole line sees a mix: some people have already changed, others not yet. That mixed picture is a **wrong number**.
:::

:::definition{#ripple-delay term="Ripple delay and transient states" depth="standard"}
Let every flip-flop have clock-to-output delay $t_{pd}$. In a ripple counter, stage 0 changes $t_{pd}$ after the clock
edge; stage 1, if it toggles, changes $t_{pd}$ after stage 0 changed, i.e. $2\,t_{pd}$ after the edge; stage $i$ changes
$(i + 1)\,t_{pd}$ after the edge. A transition in which $m$ stages toggle therefore takes $m\,t_{pd}$, and the counter
passes through $m - 1$ **transient** (false) states on the way.

For a 3-bit up counter with $t_{pd} = 10$ ns, the edge that takes 011 to 100 gives
$$011 \xrightarrow{10\text{ ns}} 010 \xrightarrow{20\text{ ns}} 000 \xrightarrow{30\text{ ns}} 100,$$
and the edge that takes 111 to 000 passes through 110 and 100. The worst case is the edge on which every stage
toggles: $n\,t_{pd}$ for an $n$-bit counter.
:::

The animation earlier in the lesson showed these staircases; the theorem turns them into a speed limit.

:::theorem{#ripple-fmax name="The maximum clock frequency of a ripple counter" depth="standard"}
In an $n$-bit ripple counter whose flip-flops have propagation delay $t_{pd}$, every state settles within $n\,t_{pd}$ of the
clock edge, and some state needs exactly that long. If each new count must be settled (and, through a decoder or a strobe
of delay $t_d$, used) before the next clock edge, the clock period must satisfy
$$T \ge n\,t_{pd} + t_d, \qquad f_{\max} = \frac{1}{n\,t_{pd} + t_d}.$$
With nothing after the counter ($t_d = 0$), $f_{\max} = 1 / (n\,t_{pd})$.
:::

:::proof{#proof-ripple-fmax of="the settling bound" depth="standard"}
**Idea first:** a carry can travel through each stage at most once per clock edge, and the one edge that sends it through
all of them is the edge at which the count wraps.

*Upper bound.* Stage $i$ toggles only on an active edge of stage $i - 1$'s output. Each stage toggles **at most once** per
input edge: stage 0 once (one clock edge), and if stage $i - 1$ toggles at most once, its output makes at most one transition,
so stage $i$ is clocked at most once. By induction, if stage $i$ toggles, it does so exactly $(i + 1)\,t_{pd}$ after the clock
edge (one delay per stage along the chain). So the last possible change is at $n\,t_{pd}$.

*The bound is reached.* At the edge that takes $011\dots1$ to $100\dots0$ (or $11\dots1$ to $00\dots0$) in an up counter every
stage toggles, the last at $n\,t_{pd}$.

*The period.* The decoder or strobe can start only after the last change, so the count is usable $n\,t_{pd} + t_d$ after the edge,
and the next edge must not come earlier: $T \ge n\,t_{pd} + t_d$. ∎

**Check by simulation.** `seqlib.ripple_events` with $t_{pd} = 10$ ns, run from every start state, gives worst-case settling times of
30 ns for 3 bits, 40 ns for 4 bits and 80 ns for 8 bits: $n\,t_{pd}$ each time.
:::

The proof contains a subtle point. A ripple counter clocked **faster** than $1/(n\,t_{pd})$ does not necessarily miscount:
each stage only needs its own input to be slow enough for one flip-flop, so the chain still divides correctly. What fails is
**reading** the count: there is no instant in the clock period when all the bits belong to the same number. Since a counter
is useless if its value cannot be read, GATE and textbooks quote $f_{\max} = 1/(n\,t_{pd})$, plus any decoding delay.

:::definition{#glitch-states term="Decoding glitches" depth="standard"}
A **decoder** on a ripple counter's outputs (a gate that recognises one state, or a full $n$-to-$2^n$ decoder) sees every
transient state as if it were real. If the transient state is the decoded one, the decoder's output pulses for about one
$t_{pd}$: a **glitch** (a spike). Going from 0111 to 1000 with $t_{pd} = 10$ ns, a 4-bit up counter shows 0110, 0100 and
0000 for 10 ns each before settling, so the decoders for 6, 4 and 0 all fire briefly. Anything that reacts to those pulses
(an edge-sensitive input, an asynchronous clear, a counter downstream) can malfunction. The cures are a **strobe** (enable the
decoder only after $n\,t_{pd}$), or a synchronous counter, whose bits all change together one $t_{pd}$ after the edge.
:::

:::trap{#trap-ripple-fmax title="One t_pd is the synchronous answer, not the ripple one" depth="standard"}
A question gives an $n$-bit **ripple** counter with flip-flop delay $t_{pd}$ and asks for the maximum clock frequency. The
expected wrong answer is $1 / t_{pd}$, which is the answer for a **synchronous** counter (ignoring its gates and setup time),
where all flip-flops change together. In a ripple counter the delays **add** along the chain: $1/(n\,t_{pd})$. The second
wrong answer forgets the decoder or strobe when the question mentions one: with 8 stages of 10 ns and a 15 ns decoder,
$1/(80\ \text{ns}) = 12.5$ MHz is too fast; $1/(95\ \text{ns}) \approx 10.53$ MHz is the limit.
:::

:::table{#sync-vs-ripple title="Ripple versus synchronous counters" depth="standard"}
| Property | Ripple (asynchronous) | Synchronous |
|:--|:--|:--|
| Clocking | only stage 0 sees the clock; stage $i$ is clocked by stage $i - 1$ | one clock to every flip-flop |
| Extra logic for binary counting | none | AND gates (or a carry chain) in front of the inputs |
| Settling time after an edge | up to $n\,t_{pd}$ (grows with $n$) | $t_{pd}$ (all bits change together) |
| Transient states and decoding glitches | yes, $m - 1$ of them when $m$ stages toggle | none from the counter itself |
| Sequences it can produce | binary up or down, and mod-N by clear | any sequence (Lesson 5) |
| Typical use | simple frequency division and slow event counting | anything decoded or used at speed |
:::

:::note{#note-ripple-ic title="Are ripple counters 'used in ICs because they are simple'?" depth="standard"}
Some notes justify ripple counters by saying they are used in integrated circuits because of their simplicity. The fair
statement is narrower. A ripple counter is cheap: no gates, and each stage drives only one clock input. That makes it a
good **frequency divider** or a counter that is read only after it has stopped. But inside high-speed digital systems,
counters whose values are decoded, compared or used every clock period are built **synchronously**, because a ripple
counter's settling time grows with its length and its outputs pass through false states. Simplicity is the advantage;
speed and glitch-free outputs are the price.
:::

:::note{#recap-delay title="Recap" depth="quick"}
Stage $i$ changes $(i + 1)\,t_{pd}$ after the edge; the worst edge toggles all $n$ stages: $n\,t_{pd}$. Hence
$f_{\max} = 1/(n\,t_{pd} + t_d)$. Toggling $m$ stages shows $m - 1$ false states, which decoders turn into glitches.
:::

### Worked examples: frequency and delay

::::example{#ex-freq-easy level="easy" title="Divide by 16" depth="quick"}
A 1 MHz clock drives a 4-bit ripple up counter. Find the frequency of each output.

:::step{why="Each stage halves the frequency of the one before it."}
$Q_0$: 1 MHz / 2 = 500 kHz. $Q_1$: 250 kHz. $Q_2$: 125 kHz.
:::

:::step{why="The last stage of an n-bit counter divides by 2^n."}
$Q_3$: 1 MHz / $2^4$ = 1000 kHz / 16 = 62.5 kHz.
:::

:::answer
500, 250, 125 and 62.5 kHz. A 4-bit counter is a divide-by-16; the period of $Q_3$ is $16 \times 1\ \mu\text{s} = 16\ \mu\text{s}$.
:::
::::

::::example{#ex-freq-cascade level="medium" title="Cascading a mod-6 and a mod-10 counter" depth="standard"}
A 3.6 MHz clock drives a mod-6 counter whose last output clocks a mod-10 counter. What is the frequency at the output of the
mod-10 counter, and how many flip-flops does the chain use? Could a single counter of the same modulus use fewer?

:::step{why="A mod-6 counter completes one cycle, and so one output period, per 6 input pulses."}
After the mod-6 counter: 3.6 MHz / 6 = 600 kHz. Notice that this "last output" is not a square wave: in a mod-6 counter
cleared at 110, $Q_2$ is 1 only in states 4 and 5, so it is high for 2 of every 6 input periods (a 33% duty cycle). Its frequency
is still 600 kHz, because it rises once and falls once per cycle.
:::

:::step{why="The mod-10 counter divides its own input by 10, so the moduli multiply."}
After the mod-10 counter: 600 kHz / 10 = 60 kHz, i.e. the chain is mod-60.
:::

:::step{why="Each counter needs the ceiling of log2 of its own modulus."}
Flip-flops: $\lceil \log_2 6 \rceil + \lceil \log_2 10 \rceil = 3 + 4 = 7$. A single mod-60 counter needs
$\lceil \log_2 60 \rceil = 6$.
:::

:::answer
60 kHz from 7 flip-flops (if the mod-10 stage is a decade counter cleared at 1010, its output $Q_3$ is high in 2 of its 10
states: 20% duty, at 60 kHz all the same). One mod-60
counter would need only 6, because the cascade wastes patterns in both parts (2 of 8 and 6 of 16). Cascading is still common because decimal digits (mod-10 stages) are what a display needs.
:::
::::

::::example{#ex-freq-2025 level="medium" title="From the last stage back to the clock (GATE 2025)" depth="standard"}
In a 4-bit ripple counter the waveform at the last flip-flop has a period of 64 µs. What is the frequency of the counter's
input clock, in kHz?

:::step{why="The last stage of an n-bit ripple counter has period 2^n times the input period."}
$64\ \mu\text{s} = 2^4 \times T = 16\,T$.
:::

:::step{why="Solve for the input period and invert it."}
$T = 64 / 16 = 4\ \mu\text{s}$, so $f = 1 / 4\ \mu\text{s} = 0.25$ MHz $= 250$ kHz.
:::

:::answer
**250 kHz** (GATE 2025). The traps are $1 / 64\ \mu\text{s} = 15.625$ kHz (the last stage's own frequency, not the counter's
input) and dividing by $n = 4$ instead of $2^n = 16$ (62.5 kHz).
:::
::::

::::example{#ex-freq-fmax level="gate" title="f_max of an 8-bit ripple counter with a decoder" depth="standard"}
An 8-bit ripple counter uses flip-flops with $t_{pd} = 10$ ns. Its outputs feed a decoder with a delay of 15 ns, and every
count must be decoded before the next clock edge. Find the maximum clock frequency. What would it be without the decoder,
and for an 8-bit synchronous counter whose flip-flops also have 10 ns delay (ignoring its gates)?

:::step{why="The worst edge toggles all eight stages, each adding one delay."}
Settling: $8 \times 10 = 80$ ns.
:::

:::step{why="The decoder can start only once the count has settled."}
$T_{\min} = 80 + 15 = 95$ ns, so $f_{\max} = 1 / 95\ \text{ns} \approx 10.53$ MHz.
:::

:::step{why="Without the decoder only the settling time counts; a synchronous counter settles in one delay."}
No decoder: $1 / 80\ \text{ns} = 12.5$ MHz. Synchronous: all bits change $t_{pd}$ after the edge, so the decoded count is ready
after $10 + 15 = 25$ ns, $f_{\max} = 40$ MHz.
:::

:::answer
About **10.53 MHz** with the decoder (12.5 MHz without it). The synchronous counter's 40 MHz shows the price of rippling: the
ripple counter's limit falls as $1/n$, the synchronous counter's does not depend on $n$ (until its own gate delays grow).
:::
::::

::::example{#ex-freq-edge level="gate" title="Edge case: the false states between 0111 and 1000" depth="standard"}
A 4-bit ripple up counter with $t_{pd} = 10$ ns holds 0111. Which states appear between the next clock edge and the moment it
settles, and for how long is each one visible? Which decoder outputs glitch?

:::step{why="Stage 0 toggles first; its fall clocks stage 1, and so on down the chain."}
At 10 ns: $Q_0$ falls, state 0110. At 20 ns: $Q_1$ falls, 0100. At 30 ns: $Q_2$ falls, 0000. At 40 ns: $Q_3$ rises, 1000.
:::

:::step{why="Each intermediate state lasts until the next stage changes, one delay later."}
0110 (6) is visible from 10 to 20 ns, 0100 (4) from 20 to 30 ns, 0000 (0) from 30 to 40 ns: 10 ns each.
:::

:::answer
Three false states, 6, 4 and 0, each for one $t_{pd}$; the decoder outputs for 6, 4 and 0 each glitch, and the counter settles at
1000 after 40 ns. Notice the most dangerous one: a **zero detector** fires in the middle of a count from 7 to 8. That is why
an asynchronous clear driven by a full decode of a ripple counter must be designed with care (next section).
:::
::::

## Mod-N counters by asynchronous clear

:::intuition{#clear-intuition title="Snapping the tape measure back" depth="standard"}
A tape measure extends as far as you pull it, but you can let it snap back to zero at any mark you like. A binary counter
naturally runs to $2^n - 1$; to make it stop at a smaller modulus, watch for the first number you do **not** want and snap the
whole counter back to zero the moment it appears. The flip-flops' **asynchronous clear** inputs ([Lesson 2](lesson:flip-flops))
are exactly such a snap: they act at once, without waiting for a clock edge.
:::

:::definition{#mod-n-clear term="Mod-N counter by asynchronous clear" depth="standard"}
Take an $n$-bit up counter with $2^n \ge N$ whose flip-flops have an asynchronous clear (CLR). Drive the clear inputs with a gate
that detects the state $N$ (the first state that must not be part of the count). Then:

1. the counter counts $0, 1, \dots, N - 1$ normally;
2. at the next edge it starts to enter state $N$; as soon as $N$ appears, the gate fires and the clear resets every flip-flop to 0
   within one clear delay;
3. the state $N$ exists only for that moment (nanoseconds), so the **stable** states are $0, \dots, N - 1$: a mod-$N$ counter.

With active-low clear pins ($\overline{CLR}$) the detecting gate is a NAND instead of an AND. The best-known example is the
**decade** (BCD) counter: a 4-bit ripple counter cleared at 1010, which counts 0 to 9.
:::

The animation builds a mod-6 counter from a 3-bit ripple counter with one AND gate on $Q_2$ and $Q_1$.

:::viz{#mod-n-clear-viz spec="mod-n-clear" mode="animate" depth="standard"}
:::

The gate in the animation has only two inputs, although 6 is a 3-bit number. That is not an accident.

:::theorem{#clear-detect name="Detect only the 1 bits of N" depth="standard"}
For an up counter started at 0 and cleared asynchronously when it reaches $N$, the clear gate may be the AND of only those outputs
$Q_i$ that are 1 in the binary form of $N$. This gate first fires when the counter reaches $N$: it is 0 in every settled state
$0, \dots, N - 1$ and in every transient state a ripple counter passes through on the way.
:::

:::proof{#proof-clear-detect of="detecting the 1 bits of N" depth="standard"}
**Idea first:** a number that has all of $N$'s 1 bits (and maybe more) is at least $N$; the counter never shows such a number
before it reaches $N$.

Let $S$ be the set of bit positions that are 1 in $N$, and let the gate be $\prod_{i \in S} Q_i$. If the gate is 1 in a state $s$,
then every bit of $S$ is 1 in $s$, so $s \ge \sum_{i \in S} 2^i = N$.

*Settled states.* The counter counts $0, 1, \dots, N - 1$, all smaller than $N$, so the gate is 0 in all of them.

*Transient states.* Going from $s$ to $s + 1$, a ripple up counter clears the trailing 1s of $s$ one by one and then sets one bit
(the definition of ripple delay). Every intermediate state is $s$ with some low bits cleared, so it is at most $s < N$ and the gate
stays 0. The final state $s + 1$ is at most $N$, and equals $N$ only at the last step. So the first state in which the gate fires
is $N$ itself. ∎

**Sanity check.** Mod-6: $N = 110$, gate $Q_2 Q_1$; it would also fire at 111 = 7, but 7 is never reached. Decade: $N = 1010$, gate
$Q_3 Q_1$; it would fire at 1011, 1110 and 1111 too, none of which is reached. The simulations settle at 0, …, 5 and 0, …, 9.
:::

:::trick{#trick-clear-ones title="AND only the bits that are 1 in N" depth="standard"}
To read or build a clear gate, write $N$ in binary and AND (or NAND, for active-low clears) the outputs at the positions of its 1s.
Mod-6 = 110: $Q_2 Q_1$. Mod-10 = 1010: $Q_3 Q_1$. Mod-12 = 1100: $Q_3 Q_2$. Mod-5 = 101: $Q_2 Q_0$. Reading backwards: a gate on
$Q_3$ and $Q_0$ clears at 1001, so the counter is mod-9. **Why it works:** the theorem above. **When it fails:** when the counter
does not start at 0 or does not count up through every state (a down counter, a counter with a preset, or a sequence that skips
past $N$ and reaches a larger state with the same 1 bits first); then decode the full state.
:::

:::trap{#trap-clear-n-minus-1 title="Asynchronous clear: detect N, not N − 1 (and the reverse for a synchronous clear)" depth="standard"}
Students who think "the counter must stop at $N - 1$" build the gate for $N - 1$. With an **asynchronous** clear that is one state too
short: the moment $N - 1$ appears it is wiped, so only $0, \dots, N - 2$ survive (mod-$(N - 1)$). Detect $N$, which then lives only for
the clear delay.

A **synchronous** clear is the opposite. It acts only at the **next** clock edge, so the detected state is held for a full clock period
and is part of the count. To get mod-$N$ with a synchronous clear, detect $N - 1$; detecting $N$ gives mod-$(N + 1)$.

GATE 2007 is built on this: a 4-bit counter whose clear (asynchronous: its function table lists the clock as don't care for Clear = 1)
is driven by $A_3 \cdot A_1$. Reading the clear as synchronous makes 5 part of the count and gives the trap option 0, 1, 2, 3, 4, 5.
:::

:::aside{#clear-pulse-width title="How long is the clear pulse?" depth="deep"}
The clear pulse ends itself: the clear empties the counter, the detected state disappears, and the gate output falls. Its width is
roughly one gate delay plus one flip-flop clear delay. If one flip-flop clears faster than the others, its output change can end the
pulse before a slower flip-flop has been cleared, leaving the counter in a wrong state. Careful designs stretch the pulse (for example
by latching it in an SR latch that the next clock edge resets) or use a synchronous clear. GATE questions assume ideal parts
("delays negligible"), in which case the asynchronous clear simply removes state $N$.
:::

:::note{#recap-clear title="Recap" depth="quick"}
Asynchronous clear at N: count $0 \dots N - 1$, with N present only for an instant. Gate = AND of the outputs that are 1 in N (NAND for
active-low clears). Synchronous clear: detect $N - 1$. Detecting $N - 1$ asynchronously gives mod-$(N - 1)$.
:::

### Worked examples: mod-N by clear

::::example{#ex-clear-decade level="easy" title="A decade counter" depth="quick"}
Build a mod-10 (decade) counter from a 4-bit ripple up counter whose flip-flops have active-high asynchronous clear inputs.

:::step{why="The first state that must not appear is N = 10."}
$10 = 1010_2$: the 1 bits are at $Q_3$ and $Q_1$.
:::

:::step{why="By the clear-detect theorem, ANDing the 1 bits of N is enough for a counter that starts at 0 and counts up."}
$CLR = Q_3 \cdot Q_1$, connected to the clear input of all four flip-flops.
:::

:::answer
$CLR = Q_3 Q_1$; the counter shows 0 to 9 and returns to 0 at the tenth pulse (1001 → 1000 → 1010 → cleared). With active-low clears,
use $\overline{CLR} = \overline{Q_3 Q_1}$, a 2-input NAND.
:::
::::

::::example{#ex-clear-mod6 level="medium" title="A mod-6 counter and its gate" depth="standard"}
A 3-bit ripple up counter (negative-edge T flip-flops, active-high asynchronous clears) is to count 0 to 5. Which outputs feed the
clear gate? Trace the transition from 5, with one flip-flop delay per stage and one clear delay.

:::step{why="The state to remove is N = 6."}
$6 = 110_2$: AND $Q_2$ and $Q_1$. ($Q_0$ is not needed: the only other state with $Q_2 = Q_1 = 1$ is 7, which is never reached.)
:::

:::step{why="From 101 the clock edge toggles Q0, whose fall toggles Q1."}
101 → 100 (one delay) → 110 (two delays). Now $Q_2 Q_1 = 1$, the gate fires.
:::

:::step{why="The clear acts without waiting for a clock edge."}
One clear delay later every flip-flop is 0: 110 → 000. The gate output falls again.
:::

:::answer
$CLR = Q_2 Q_1$; stable states 0, 1, 2, 3, 4, 5 (mod-6), and 110 exists only for one clear delay. A gate on all three bits ($Q_2 Q_1
\overline{Q_0}$) also works but costs an extra input.
:::
::::

::::example{#ex-clear-2007 level="gate" title="A counter cleared by A3 · A1 (GATE 2007)" depth="standard"}
A 4-bit binary counter has outputs $A_4 A_3 A_2 A_1$, a Clear input that acts regardless of the clock, Load = 0 and Count = 1. A
2-input AND gate with inputs $A_3$ and $A_1$ drives Clear; the parallel inputs carry 0011 (unused, since Load = 0). Delays are
negligible. Starting at 0, which sequence does it cycle through?

:::step{why="The question never names the LSB, so fix the bit order from the figure and check the other reading."}
The figure draws $A_4A_3A_2A_1$ left to right, MSB first, so $A_1$ is the LSB (weight 1) and $A_3$ has weight 4. Reading $A_4$ as the
LSB instead would make the gate detect 1010 = 10 (sequence 0 … 9), which is not among the options.
:::

:::step{why="Load = 0 and Count = 1 select 'count next' at every clock edge, so the inputs 0011 never enter."}
Without the gate the counter would count 0, 1, 2, … up to 15.
:::

:::step{why="A3 is the bit of weight 4 and A1 the bit of weight 1, so the gate fires at the first count with both: 0101."}
$A_3 A_1 = 1$ first at $0101_2 = 5$.
:::

:::step{why="Clear = 1 acts at once, so 5 is replaced by 0 immediately (the asynchronous case)."}
The stable states are 0, 1, 2, 3, 4; at the fifth pulse the counter touches 5 and is cleared to 0.
:::

:::answer
**0, 1, 2, 3, 4** (GATE 2007, option C): a mod-5 counter, exactly the "AND the 1 bits of N" rule with $N = 5 = 0101$. Option D
(0, …, 5) treats the clear as synchronous; options A and B (0, 3, 4, …) imagine that the inputs 0011 are loaded, which needs Load = 1.
:::
::::

::::example{#ex-clear-sync level="gate" title="Edge case: the same counter with a synchronous clear" depth="standard"}
Suppose the counter of GATE 2007 had a **synchronous** clear instead (Clear = 1 makes the next clock edge load 0). With the same gate
$A_3 \cdot A_1$, which sequence would it cycle through? Which gate would give mod-5?

:::step{why="A synchronous clear does nothing until the next edge, so the detected state stays for a full period."}
The counter counts 0, 1, 2, 3, 4, then 5. In state 5 the gate is 1, so the **next** edge loads 0 instead of 6.
:::

:::step{why="The detected state is now part of the cycle."}
Cycle: 0, 1, 2, 3, 4, 5: mod-6.
:::

:::step{why="To lose one state again, detect one state earlier."}
For mod-5 with a synchronous clear, detect $N - 1 = 4 = 0100$: the gate $A_3$ alone would also fire at 5, 6, 7, … but 4 is reached first,
so the gate can be just $A_3$ (the AND of the 1 bits of 4).
:::

:::answer
0, 1, 2, 3, 4, 5 (mod-6, one state longer than the asynchronous version); a synchronous mod-5 detects 4. The difference between the two
clears is exactly the difference between options C and D of GATE 2007.
:::
::::

## Try it: the counter simulator

The counter tab of the Counter & FSM Simulator runs the same event model as this lesson's checks. Choose **Ripple up counter** or
**Ripple down counter**, a width of 2 to 5 flip-flops, a delay $t_{pd}$ of 1 to 3 ns per stage and the initial state; step the clock and
the readout lists every state the counter rippled through and when it settled. For the up counter you can also choose an
**asynchronous clear** at any state and watch the counter become mod-N. Try a 4-bit up counter from 0111, then a clear at 1010.

:::lab{#lab-ripple lab="counter-fsm" tab="counter" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1994-a-2-1" tests="ff-count,counter-def" depth="standard"}
:::

:::pyq{id="it-2005-cs-11" tests="pulse-count,trap-wrap" depth="standard"}
:::

:::pyq{id="cse-2007-cs-36" tests="mod-n-clear,clear-detect,trap-clear-n-minus-1" depth="standard"}
:::

:::pyq{id="cse-2010-cs-32" tests="ripple-rule,trick-trigger-table,trap-trigger-rule,ripple-down" depth="standard"}
:::

:::pyq{id="cse-2011-cs-15" tests="ff-count,trap-ff-count" depth="standard"}
:::

:::pyq{id="cse-2025-2-cs-24" tests="frequency-division,divide-by-two" depth="standard"}
:::

## Practice

Our own questions in GATE formats: sizing and counting first, then wiring and frequency, then clears and the timing questions that
need care.

:::practice{id="nx-dl-06-04-q01" depth="standard"}
:::

:::practice{id="nx-dl-06-04-q02" depth="standard"}
:::

:::practice{id="nx-dl-06-04-q03" depth="standard"}
:::

:::practice{id="nx-dl-06-04-q04" depth="standard"}
:::

:::practice{id="nx-dl-06-04-q05" depth="standard"}
:::

:::practice{id="nx-dl-06-04-q06" depth="standard"}
:::

:::practice{id="nx-dl-06-04-q07" depth="standard"}
:::

:::practice{id="nx-dl-06-04-q08" depth="standard"}
:::

:::practice{id="nx-dl-06-04-q09" depth="standard"}
:::

:::practice{id="nx-dl-06-04-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Counters and ripple counters on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Modulus | number of states in the cycle; mod-N returns to its start every N pulses |
| Flip-flops | $\lceil \log_2 N \rceil$ (binary); N one-hot; N/2 Johnson. Mod-258: 9 |
| Pulses from a to b | up: $(b - a) \bmod 2^n$; down: $(a - b) \bmod 2^n$ (IT 2005: 123) |
| Ripple counter | toggling stages; stage 0 on CLK, stage $i$ on stage $i - 1$ |
| Direction | negative edge + Q or positive edge + Q̄: up; negative edge + Q̄ or positive edge + Q: down (2010) |
| Down count | 0 → 3 → 2 → 1 → 0; from 0 to all 1s; Q̄ of an up counter counts down |
| Frequency | $Q_i$ at $f/2^{i+1}$; last stage $f/2^n$; cascades multiply (2025: 64 µs / 16 → 250 kHz) |
| Ripple delay | stage $i$ changes $(i + 1)\,t_{pd}$ after the edge; worst case $n\,t_{pd}$; $m$ toggles show $m - 1$ false states |
| $f_{\max}$ | $1/(n\,t_{pd} + t_d)$ for a ripple counter, not $1/t_{pd}$ |
| Mod-N by async clear | detect N (AND of its 1 bits); N lasts only an instant (2007: $A_3A_1$ → 0 … 4) |
| Sync clear | detect $N - 1$; the detected state lasts a full period |
:::
