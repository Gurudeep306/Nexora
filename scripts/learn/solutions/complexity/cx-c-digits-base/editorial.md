## Intuition
A $d$-digit number in base $b$ satisfies $b^{d-1} \le n < b^d$, so $d = \lfloor\log_b n\rfloor + 1$ for $n \ge 1$. That is the meaning of a logarithm in complexity analysis: **how many times can you divide by $b$ before reaching zero**. Computing it by repeated integer division is exact and takes at most $\log_2 10^{18} < 60$ steps.

## Approach
Start with $d = 1$. While $n \ge b$: $n \leftarrow \lfloor n/b\rfloor$, $d \leftarrow d + 1$. Print $d$. This handles $n = 0$ (one digit) automatically.

Example $n = 255, b = 16$: $255 \ge 16 \to 15$, $d = 2$; $15 < 16$, stop → **2** (`FF`). With $b = 2$: 8 digits (`11111111`).

## Why it works
Integer division by $b$ deletes the last base-$b$ digit. The loop removes digits until a single digit remains (value $< b$), counting each removal; the final $+1$ (the initial $d=1$) counts that last digit. Formally, after $t$ divisions $n_t = \lfloor n/b^t\rfloor$, and the loop stops at the first $t$ with $n/b^t < b$, i.e. $t = \lfloor \log_b n\rfloor$.

## Complexity
$O(\log_b n)$ per query — at most 60 divisions — so $O(T\log n)$ total.

## Pitfalls
- Floating logs are off by one exactly at powers of $b$: `log(1000)/log(10)` evaluates to $2.9999999999999996$, giving 3 instead of 4. Tests include $3^{37}$ and $2^{59}$.
- $n = 0$: $\log 0$ is undefined, but the answer is 1.
- The loop condition is $n \ge b$, not $n > 0$ (that version needs $d$ to start at 0 and breaks on $n = 0$).
- JavaScript: parse $n$ with `BigInt`.
