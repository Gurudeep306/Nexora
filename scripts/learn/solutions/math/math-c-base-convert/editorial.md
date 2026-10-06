## Intuition
For a small number, base conversion is: parse to an integer, then repeatedly take `x % b` (the next digit, least significant first) and set `x /= b`. Here t has up to 1000 base-36 digits, which is about 5200 bits. So we keep the number as its digit array in base a and implement just one big operation: **divide the array by a small integer b, and return the remainder**.

## Approach
1. Map characters to values: `0`–`9` become 0–9 and `A`–`Z` become 10–35.
2. While the array is not all zeros, do a long division by b from the most significant digit: `cur = rem * a + d`, the new digit is `cur / b`, and `rem = cur % b`. The final `rem` is the next output digit. Skip the leading zeros that each division creates.
3. Reverse the collected digits. If the input was `0`, print `0`.

Example: `255` in base 10 to base 2. Dividing by 2 gives remainders $1,1,1,1,1,1,1,1$, so the answer is `11111111`. For `FF` (base 16) to base 10: $255 \div 10 = 25$ r 5, $25 \div 10 = 2$ r 5, then r 2, so the answer is `255`.

## Why it works
Long division in base a is exact. If the array represents $x$, one pass produces the digits of $\lfloor x/b \rfloor$ and the remainder $x \bmod b$, because at each step $rem < b$ and $cur = rem \cdot a + d < b \cdot a$. Writing $x = q b + r$ repeatedly yields the base-b digits from least to most significant: $x = \sum r_i b^i$.

## Complexity
Each pass costs O(L), and there are $O(L \log a / \log b)$ output digits: at most about 5200 passes for $L = 1000$, $a = 36$, $b = 2$. That is $5 \cdot 10^6$ steps. Memory is O(L).

## Pitfalls
- Output must be uppercase. JavaScript's `toString(36)` and Java's `BigInteger.toString(36)` produce lowercase.
- The input `0` must print `0`, not an empty line.
- Don't parse into a 64-bit integer, because it overflows after about 13 base-36 digits.
- Bases with a = b work as a plain copy.
