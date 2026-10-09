# ll-c-josephus-k2 — Josephus with k = 2, n up to 10^18

## Intuition
At $n = 10^{18}$, every structural approach is dead on arrival: a circular list needs $O(n)$ nodes you cannot allocate, and even the $O(n)$ recurrence needs $10^{18}$ steps. But k = 2 has structure the general case lacks. After the first lap around the ring, every EVEN-numbered person is gone and the survivors are $1, 3, 5, \dots$ — a clean self-similar pattern. Simulate small cases, stare at the answers, and the closed form falls out: write $n = 2^m + l$ with $0 \le l < 2^m$; the survivor is $2l + 1$.

## Approach
```cpp
long long p = 1;
while (p * 2 <= n) p *= 2;     // largest power of two <= n
long long l = n - p;
printf("%lld\n", 2 * l + 1);
```

Equivalently — and this is the prettier way to say it — take n's binary representation and **rotate it left by one bit**: the leading 1 moves to the end. $n = 41 = 101001_2 \to 010011_2 = 19$. Powers of two are the elegant edge: $l = 0$, so the answer is 1 — person 1 always survives when $n = 2^m$.

Per-language integer notes: n up to $10^{18} < 2^{63}$ fits C/C++ `long long` and Java `long` (`Long.highestOneBit(n)` is the one-liner there); Python ints are unbounded; **JavaScript must use BigInt** — $10^{18} > 2^{53}$, so a `Number` silently rounds.

## Why it works
Induction on n, splitting by parity.

**Even n = 2m.** The first pass kills $2, 4, \dots, 2m$; the survivors are $1, 3, \dots, 2m-1$, and counting resumes at person 3 with 2 to spare... precisely: the ring of survivors, relabeled $1..m$ by $\text{person } 2i-1 \leftrightarrow i$, is a fresh k=2 game whose counting starts correctly at the next person. If seat $s$ wins the m-game, person $2s - 1$ wins the n-game: $J(2m) = 2J(m) - 1$.

**Odd n = 2m+1.** The first pass kills $2, 4, \dots, 2m$, then wraps and kills person 1 (counting continues past the end). Survivors $3, 5, \dots, 2m+1$ relabel to a fresh m-game, giving $J(2m+1) = 2J(m) + 1$.

Now check the closed form against both. Write $m = 2^{m'} + l'$; then $J(m) = 2l' + 1$. Even case: $n = 2m = 2^{m'+1} + 2l'$, so the formula wants $2(2l') + 1 = 4l' + 1$, and the recurrence gives $2(2l'+1) - 1 = 4l' + 1$. ✓. Odd case: $n = 2m+1 = 2^{m'+1} + (2l'+1)$, formula wants $2(2l'+1)+1 = 4l'+3$, recurrence gives $2(2l'+1)+1$. ✓. Base $J(1)=1$ ($l=0$). The bit-rotation view is the same identity: doubling shifts left (append 0 → the $2\cdot$ term), and $+1$ fills the low bit.

## Complexity
$O(\log n)$ per test case — the power-of-two search — or $O(1)$ with a highest-set-bit instruction. $O(1)$ space. T up to $10^4$ is trivial.

The teaching arc to narrate: circular list (correct, $O(nk)$, unallocatable here) → recurrence ($O(n)$, still $10^{18}$ steps) → pattern recognition on small n → closed form. Each stage is right; only the last one finishes. That progression is the point of the problem.

## Pitfalls
- JavaScript without BigInt: `1e18` as a double is already rounded, and `2*l+1` compounds it. BigInt from parsing onward — `BigInt(data[i])`, not `BigInt(Number(...))`.
- Off-by-one in the decomposition: it is $n = 2^m + l$ with the LARGEST power of two ≤ n, so $0 \le l < 2^m$. Using the smallest power ≥ n (ceiling) flips the whole formula.
- Overflow hunting the power of two in C: `p *= 2` unguarded can pass $2^{63}$ for $n$ near $10^{18}$ if your loop condition is wrong; `while (p <= n/2)` or `p*2 <= n` both stay safe since the final p ≤ $2^{60}$ here.
- $n = 1$: answer 1 — make sure the loop starts at p = 1 and handles it (l = 0 → 1). No special-casing needed if the form is right; if you wrote one anyway, check it.
- Outputting 0-based: the closed form is inherently 1-based (person numbers), unlike the general recurrence — don't "fix" it with a ±1.
- Confusing this with the k = 3 or general-k closed forms: only k = 2 has this clean binary structure; general k needs the recurrence (and n this large has no known fast general answer).
