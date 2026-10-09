# ll-c-josephus — Josephus ring

## Intuition
A circular linked list simulates this literally: n nodes in a ring, k−1 hops, unlink, resume — and the ring closes over the gap automatically because the unlinked node's successor is still wired. That is the pointer lesson, and it is worth writing once. But it costs $O(n \cdot k)$ hops, and with $k$ up to $10^9$ and $n$ up to $10^5$ that is up to $10^{14}$ hops — hopeless. The structure turns out to be unnecessary: the survivor's seat follows a recurrence you can run in $O(n)$ with a single integer.

## Approach
Number the seats $0 \dots n-1$ (add 1 at the end). Let $\text{seat}(m)$ be the survivor's seat when $m$ people remain and counting starts at the current position. Then

$$\text{seat}(1) = 0, \qquad \text{seat}(m) = (\text{seat}(m-1) + k) \bmod m.$$

```cpp
long long seat = 0;                  // seat(1)
for (int m = 2; m <= n; m++)
    seat = (seat + k) % m;
printf("%lld\n", seat + 1);          // back to 1-based numbering
```

Use a 64-bit accumulator: `seat + k` can reach $10^5 + 10^9$, which overflows nothing here but habits matter — and in JS it stays below $2^{53}$, so `Number` is safe for THIS problem's bounds (BigInt would be needed if $n \cdot k$ approached $2^{53}$).

## Why it works
Watch what happens at the first elimination. Person at 0-based seat $(k-1) \bmod m$ dies. Counting resumes at seat $k \bmod m$ — and from that moment, the ring of $m-1$ survivors is *the same problem*, just relabeled: the resume point becomes "seat 0" of a fresh ring of size $m-1$. If the survivor sits at seat $s'$ in the relabeled $(m-1)$-ring, its seat in the original $m$-ring is $s' + k$, taken mod $m$ (the relabeling is a rotation by $k$). That is exactly $\text{seat}(m) = (\text{seat}(m-1) + k) \bmod m$. Unrolling from $m = 1$ (one person, seat 0, trivially survives) up to $m = n$ gives the answer. Each elimination's rotation is undone by one addition — the whole simulation compresses into n add-and-mod steps.

## Complexity
$O(n)$ per test case, $O(1)$ space — versus $O(n \cdot k)$ time and $O(n)$ space for the circular-list simulation. With T ≤ 10 and n ≤ 10^5, the recurrence runs ~10^6 steps total; the simulation would need up to $10^{14}$.

The honest interview framing: build the circular list version first if asked "simulate it" — it demonstrates the ring mechanics (unlink closes the gap, no null checks, stop when one node remains). Then volunteer the recurrence, deriving it with the rotation argument above, because that is the part that scales. A `deque`-based simulation (rotate k−1 to the front, pop, rotate back) is the pragmatic middle ground in Python/Java: cleaner than raw pointers, same $O(nk)$ cost — still too slow for $k = 10^9$, so it does not replace the recurrence here.

## Pitfalls
- Simulating with $k$ up to $10^9$: even one test case won't finish. Take $k \bmod m$ implicitly via the `%` — the recurrence does that for free.
- 0-based vs 1-based confusion: the recurrence is cleanest 0-based; the output wants person numbers 1..n. Forget the final `+1` and every answer is off by one (person 0 doesn't exist).
- Starting the loop at m = 1 instead of 2, or initializing `seat = 1`: both shift the answer. The base case is "one person left, survivor at relative seat 0."
- 32-bit `(seat + k)` when bounds grow: with k near $10^9$ and loose n the sum can overflow `int`. `long long`/`long` throughout.
- Simulating with a plain array and "mark dead" flags: counting skips over dead entries turns each elimination into an O(n) scan — $O(n^2)$, still too slow at $n = 10^5$ × T = 10.
- Recursive form `J(m) = (J(m-1)+k) % m` written as literal recursion: depth n = 10^5 blows the stack in several languages. Iterate.
