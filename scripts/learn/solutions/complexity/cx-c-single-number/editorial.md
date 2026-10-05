## Intuition
Counting with a hash map is $O(n)$ time but also $O(n)$ **extra space**. This problem is about getting the space down to $O(1)$. XOR has exactly the algebra needed:
- $x \oplus x = 0$
- $x \oplus 0 = x$
- $\oplus$ is associative and commutative.

## Approach
XOR all n values together. Every value that appears twice cancels itself out, and what remains is the unpaired value.

Example: $4 \oplus 1 \oplus 2 \oplus 1 \oplus 2$. Reorder it to $4 \oplus (1 \oplus 1) \oplus (2 \oplus 2) = 4 \oplus 0 \oplus 0 = \mathbf{4}$.

## Why it works
Because XOR is commutative and associative, the result does not depend on the order of the operands. So we may group each paired value with its twin. Each pair contributes $x \oplus x = 0$, and 0 is the identity. The total is therefore the single unpaired value $u$:
$$\bigoplus_i a_i = u \oplus \bigoplus_{\text{pairs}} (x \oplus x) = u.$$
Bit by bit, this is a parity count: bit k of the result is 1 exactly when an odd number of values have bit k set, and only u can make that count odd.

## Complexity
$O(n)$ time and $O(1)$ extra space: one accumulator, with values read as a stream. Compare the alternatives:
- sorting: $O(n \log n)$ time, needs the array;
- a hash map: $O(n)$ time and $O(n)$ space.

## Pitfalls
- Initialise the accumulator to 0, the identity, not to the first value read twice.
- Values reach $10^9 < 2^{31}$, so XOR on 32-bit ints is safe. JavaScript's `^` works on int32, which covers this range.
- The trick depends on "exactly twice". If values appear three times, you need per-bit counts mod 3.
