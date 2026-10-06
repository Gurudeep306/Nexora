## Intuition
Every solution has the form $x = x_1 + k m$, $y = y_1 - k n$, with $m = b/g$, $n = a/g$ and $k \in \mathbb{Z}$. The cost $f(k) = |x_1 + km| + |y_1 - kn|$ is a sum of two convex "V" shapes, so it is convex and piecewise linear. Its only corners are where $x = 0$ (at $k = -x_1/m$) and where $y = 0$ (at $k = y_1/n$). The minimum of such a function is at a corner, so the best integer k is the floor or ceiling of a corner.

## Approach
1. Find the solution with the smallest $x_1 \ge 0$ (reduce mod m before multiplying) and set $y_1 = (c - a x_1)/b$. Print `-1` if $g \nmid c$.
2. Since $0 \le x_1 < m$, the x-corner lies in $(-1, 0]$, so its candidates are $k = -1, 0$. The y-corner gives $k = \lfloor y_1 / n \rfloor$ and that plus 1.
3. Evaluate the four candidates. Keep the smallest $|x| + |y|$, breaking ties by the smaller x.

Example: $3x + 5y = 1$. $x_1 = 2$, $y_1 = -1$, $m = 5$, $n = 3$. The candidates are $k = -1, 0$, giving $(-3, 2)$ with cost 5 and $(2, -1)$ with cost 3. $\lfloor -1/3 \rfloor = -1$ adds nothing new. Output `2 -1`.

## Why it works
On each integer interval between corners, f is linear. A convex f has a set of real minimisers $[p, q]$ with p a corner. If an integer lies in $[p, q]$, the smallest one is $\lceil p \rceil$, which is a candidate. Otherwise the integer minimisers are $\lfloor p \rfloor$ and/or $\lceil p \rceil$. Either way, the integer minimiser with the smallest k, and x increases with k, is among our candidates. For any integer below that, f is strictly larger.

## Complexity
$O(\log \min(a, b))$ per query, and $O(1)$ memory.

## Pitfalls
- The raw $x' \cdot c/g$ is about $10^{27}$. After normalising, $|x|, |y| \le 2 \cdot 10^{18} + 10^9$, so everything fits in signed 64-bit.
- $\lfloor y_1/n \rfloor$ needs **floor** division, because $y_1$ can be negative.
- The tie-break matters. For $2x + 2y = 6$, the pairs $(0, 3)$, $(1, 2)$, $(2, 1)$ and $(3, 0)$ all cost 3, and the answer is $(0, 3)$, the one with the smallest x. Here the corners are $k = 0$ and $k = 3$, and the whole stretch between them is flat.
