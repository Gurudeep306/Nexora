# ll-c-bin-to-int — Binary number in a list

## Intuition
The head holds the MOST significant bit, and you can only walk forward — so you cannot "start at the lowest place value" the way you would from a string's end. But you don't need to: binary positional notation folds left-to-right. After reading bits $b_1 b_2 \dots b_j$, the value so far is $b_1 2^{j-1} + \dots + b_j$. Appending one more bit multiplies everything by 2 and adds the new bit:
$$\text{acc} \leftarrow \text{acc} \cdot 2 + b_{j+1}.$$
One traversal, no reversal, no power computations, no second pass.

## Approach
```cpp
unsigned long long acc = 0;
for (Node* t = head; t; t = t->next)
    acc = acc * 2 + (unsigned long long)t->v;
```
That is the entire algorithm. The only real decision is the accumulator's width: with up to 60 bits the answer reaches $2^{60} - 1 \approx 1.15 \cdot 10^{18}$, which overflows `int` (and 32-bit anything) but fits comfortably in a signed or unsigned 64-bit integer.

Per language: C/C++ `unsigned long long` (or `long long`), Java `long`, JavaScript **`BigInt`** (`acc = acc * 2n + BigInt(t.v)` — a plain `Number` loses precision past $2^{53}$), Python `int` (arbitrary precision, nothing to do).

## Why it works
Induction on the walk: after visiting the first j nodes, `acc` equals $\sum_{i=1}^{j} b_i 2^{j-i}$, the value of the j-bit prefix. Base: j = 0, `acc = 0`, the empty prefix. Step: the prefix $b_1 \dots b_j$ read as binary is exactly twice the prefix $b_1 \dots b_{j-1}$ plus $b_j$ — shifting left one place and setting the low bit. At j = n the prefix is the whole number. This is Horner's method applied to the polynomial $\sum b_i x^{n-i}$ evaluated at $x = 2$.

## Complexity
$O(n)$ time — one multiply-add per node. $O(1)$ extra space beyond the list itself. No pow calls, so no floating-point rounding anywhere.

## Pitfalls
- 32-bit accumulator: 60 ones is `1152921504606846975` — an `int` silently wraps. This is THE trap of the problem.
- JavaScript without BigInt: `Number` is a double, exact only to $2^{53}$; the 60-bit cases lose low bits. Use `0n` and `2n` literals throughout — mixing BigInt and Number in arithmetic is a TypeError.
- Leading zeros are harmless (acc stays 0 through them) — do not "skip to the first 1" with extra logic; the fold handles it.
- Trying to compute $b_i \cdot 2^{n-i}$ per node instead: same result, but it either needs a reverse pass or `pow` (floating point — precision bugs) or precomputed powers (extra code for nothing).
- Confusing bit order: the head is the MSB, so 1→0→1 is 5. Folding with `acc = acc + bit * 2^i` for an increasing i would treat the head as the LSB and return the bit-reversed value (also 5 for a palindrome — test with 1→0, which must give 2, not 1).
