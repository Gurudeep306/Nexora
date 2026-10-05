## Intuition
The outer loop runs once for each $i = 1, 2, 4, \dots, 2^{m}$ where $2^m \le n < 2^{m+1}$, i.e. $m = \lfloor \log_2 n\rfloor$. The inner loop does $i$ steps. A careless bound says "$\log n$ outer iterations × up to $n$ inner = $O(n\log n)$", but the inner counts form a geometric series dominated by its last term:
$$1 + 2 + 4 + \dots + 2^m = 2^{m+1} - 1.$$

## Approach
Let $L$ be the bit length of $n$ (so $2^{L-1} \le n < 2^L$, $m = L-1$). Print $2^L - 1$.

Example $n = 5$ (binary `101`, $L = 3$): $i = 1, 2, 4$ → $1+2+4 = $ **7** $= 2^3 - 1$. For $n = 8$: $L = 4$, answer $15$.

## Why it works
$i$ takes exactly the powers of two not exceeding $n$, which are $2^0, \dots, 2^{L-1}$ because $n$'s highest set bit is bit $L-1$. The finite geometric sum telescopes: $S = \sum_{t=0}^{m} 2^t$, $2S - S = 2^{m+1} - 1$.

Since $2^{L-1} \le n$, the total is $2^L - 1 < 2n$: the loop is $\Theta(n)$, not $\Theta(n\log n)$. A geometric series with ratio $>1$ is within a constant factor of its largest term.

## Complexity
$O(1)$ per query with a count-leading-zeros instruction, or $O(\log n)$ with a shift loop — either way independent of the $\Theta(n)$ simulated work.

## Pitfalls
- Off by one at powers of two: $n = 8$ includes $i = 8$, so $L$ is the bit length, not $\lfloor\log_2(n-1)\rfloor+1$.
- Avoid floating `log2` — at $n = 2^{59}-1$ a double rounds up to $2^{59}$.
- $n \le 10^{18} < 2^{60}$, so $2^{60}-1$ fits; shifting `1 << L` must be done on a 64-bit value (`1LL`).
- JavaScript: the answer exceeds $2^{53}$, use `BigInt`.
